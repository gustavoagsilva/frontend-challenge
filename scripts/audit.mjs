import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import lighthouse from "lighthouse";
import { preview } from "vite";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
const require = createRequire(import.meta.url);
const quick = process.argv.includes("--quick");
const origin = process.env.AUDIT_URL || "http://127.0.0.1:4175";
const server = process.env.AUDIT_URL
  ? null
  : await preview({
      preview: { host: "127.0.0.1", port: 4175, strictPort: true },
    });
const directory = path.resolve("reports/lighthouse");
await fs.mkdir(directory, { recursive: true });
const rows = [];
const pages = quick
  ? [["home", "/"]]
  : [
      ["home", "/"],
      ["detail", "/nfts/kurio-001"],
    ];
const profiles = quick ? ["mobile"] : ["desktop", "mobile"];
for (const [name, route] of pages) {
  for (const profile of profiles) {
    for (let run = 1; run <= (quick ? 1 : 3); run++) {
      const chrome = await launch({
        chromePath: chromium.executablePath(),
        chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
      });
      try {
        const config = {
          extends: "lighthouse:default",
          settings: {
            onlyCategories: [
              "performance",
              "accessibility",
              "best-practices",
              "seo",
            ],
            ...(profile === "desktop"
              ? {
                  formFactor: "desktop",
                  screenEmulation: {
                    mobile: false,
                    width: 1440,
                    height: 900,
                    deviceScaleFactor: 1,
                    disabled: false,
                  },
                  throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0,
                  },
                }
              : {
                  formFactor: "mobile",
                  screenEmulation: {
                    mobile: true,
                    width: 390,
                    height: 844,
                    deviceScaleFactor: 1,
                    disabled: false,
                  },
                }),
          },
        };
        const result = await lighthouse(
          origin + route,
          { port: chrome.port, output: ["json", "html"], logLevel: "error" },
          config,
        );
        const stem = name + "-" + profile + "-" + run;
        await fs.writeFile(
          path.join(directory, stem + ".json"),
          result.report[0],
        );
        await fs.writeFile(
          path.join(directory, stem + ".html"),
          result.report[1],
        );
        const lhr = result.lhr;
        const row = {
          page: name,
          profile,
          run,
          categories: Object.fromEntries(
            Object.entries(lhr.categories).map(([key, value]) => [
              key,
              Math.round(value.score * 100),
            ]),
          ),
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
          failed: Object.values(lhr.audits)
            .filter(
              (a) =>
                a.score !== null &&
                a.score < 1 &&
                a.scoreDisplayMode !== "informative",
            )
            .map((a) => ({
              id: a.id,
              title: a.title,
              score: a.score,
              details: a.details,
            })),
          runtimeError: lhr.runtimeError,
          environment: lhr.environment,
        };
        rows.push(row);
        console.log(
          stem,
          JSON.stringify({
            scores: row.categories,
            LCP: Math.round(row.lcp),
            CLS: row.cls,
            TBT: Math.round(row.tbt),
          }),
        );
      } finally {
        await chrome.kill();
      }
    }
  }
}
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const groups = [
  ...new Set(rows.map((row) => row.page + "-" + row.profile)),
].map((group) => {
  const matching = rows.filter((row) => row.page + "-" + row.profile === group);
  return {
    group,
    categories: Object.fromEntries(
      Object.keys(matching[0].categories).map((key) => [
        key,
        median(matching.map((row) => row.categories[key])),
      ]),
    ),
    lcp: median(matching.map((row) => row.lcp)),
    cls: median(matching.map((row) => row.cls)),
    tbt: median(matching.map((row) => row.tbt)),
  };
});
const summary = {
  date: new Date().toISOString(),
  origin,
  node: process.version,
  lighthouse: require("lighthouse/package.json").version,
  playwright: require("@playwright/test/package.json").version,
  os: os.platform() + " " + os.release(),
  cpu: os.cpus()[0]?.model,
  memoryGB: Math.round(os.totalmem() / 1024 ** 3),
  conditions:
    "Production build, default MSW fixtures, fresh Chrome profile for each run, simulated throttling, no external assets.",
  medians: groups,
  runs: rows,
};
await fs.writeFile(
  path.join(directory, quick ? "quick-summary.json" : "summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log("Saved reports to " + directory);

await new Promise((resolve) =>
  server ? server.httpServer.close(resolve) : resolve(),
);

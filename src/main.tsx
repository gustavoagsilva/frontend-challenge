import "./index.css";
async function bootstrap() {
  const render = import("./render");
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ quiet: true, onUnhandledRequest: "bypass" });
  }
  const { mountApp } = await render;
  mountApp();
}
void bootstrap().catch(() => {
  const root = document.getElementById("root")!;
  root.textContent =
    "Não foi possível iniciar a aplicação. Atualize a página para tentar novamente.";
  root.setAttribute("role", "alert");
});

# Auditoria Lighthouse

Coleta final em 18/10/2026 na aplicação publicada: https://kurio-marketplace-ten.vercel.app. Código da aplicação: revisão **0745f7a**, com as quatro artes PNG originais, fontes locais, MSW e Socket.IO habilitados. Foram feitas três execuções por página/perfil, totalizando 12, cada uma em um perfil novo do Chromium. Não houve testes E2E simultâneos nem erro de execução do Lighthouse.

As medianas abaixo são calculadas independentemente para cada categoria e métrica, sem selecionar somente as melhores execuções.

| Página / dispositivo | Desempenho | Acessibilidade | Boas práticas | SEO | LCP (ms) |     CLS | TBT (ms) |
| -------------------- | ---------: | -------------: | ------------: | --: | -------: | ------: | -------: |
| Início / desktop     |         84 |            100 |           100 | 100 |     1049 | 0,00135 |      261 |
| Início / mobile      |         66 |            100 |           100 | 100 |     2755 | 0,00932 |     2201 |
| Detalhe / desktop    |         99 |            100 |           100 | 100 |      670 | 0,04263 |       41 |
| Detalhe / mobile     |         73 |            100 |           100 | 100 |     2724 |       0 |     1077 |

As metas de acessibilidade (95), boas práticas (95) e SEO (90) foram atingidas nos quatro grupos. **A meta de desempenho (90) foi atingida somente no detalhe desktop.** Início desktop e os dois perfis mobile permanecem abaixo da meta. A revisão funcional e as notas das outras categorias não eliminam essa limitação.

## Ambiente e reprodução

- Node 24.15.0, npm 11.12.1, Lighthouse **13.5.0**, Chrome Launcher 1.2.2 e Playwright 1.64.1.
- Chromium 156.0.8078.4, Windows 10.0.26200, Intel Core i7-10510U 1.80 GHz e 8 GB de RAM.
- Desktop: 1440×900, RTT simulado 40 ms, throughput 10240 Kbps e CPU 1×.
- Mobile: 390×844, throttling simulado padrão do Lighthouse e CPU 4×.
- Rotas `/` e `/nfts/kurio-001`, build de produção servido pela Vercel, fixtures iniciais e perfil novo por medição. Imagens e fontes pertencem ao projeto e são servidas pela mesma origem.

Instale com `npm ci` e `npx playwright install chromium`. No PowerShell:

```powershell
$env:AUDIT_URL = 'https://kurio-marketplace-ten.vercel.app'
npm run audit:lighthouse
```

Sem `AUDIT_URL`, o comando usa o preview local na porta 4175. O script versionado [scripts/audit.mjs](scripts/audit.mjs) compila o projeto e grava HTML, JSON e `summary.json` em `reports/lighthouse`. O resumo inclui versões, ambiente, execuções individuais e auditorias com falha. O perfil exato de throttling também consta nos JSON completos.

As 12 medições finais estão em [docs/artifacts/lighthouse-final-public.zip](docs/artifacts/lighthouse-final-public.zip). Extraia e abra os HTML. O arquivo `lighthouse.zip` é histórico, com imagens provisórias e Lighthouse 12.6.1; não deve ser usado como evidência da versão atual nem comparado diretamente como se as condições fossem idênticas.

## Diagnóstico e limites

O principal ponto identificado é o bloqueio da thread principal por JavaScript. Na segunda coleta do início desktop, o Lighthouse registrou cerca de 841 ms de avaliação de scripts: aproximadamente 372 ms no chunk de mocks e 258 ms no chunk de renderização. O TBT dessa coleta foi de 258 ms, com LCP de 848 ms. Isso indica que o custo não está apenas na transferência das imagens.

Na segunda coleta do início mobile, o relatório atribuiu aproximadamente 1009 ms de execução ao chunk de mocks, 766 ms ao de renderização e 372 ms ao módulo compartilhado de sessão. O chunk de MSW/handlers tem cerca de 457 kB antes da compressão. A inicialização do service worker e as consultas REST antecedem o conteúdo principal, contribuindo também para a cadeia de carregamento. Esses dados sustentam o diagnóstico, mas não atribuem todo o bloqueio exclusivamente ao MSW.

Já são usados carregamento das telas secundárias sob demanda, fontes locais nos pesos necessários, inicialização concorrente de módulos, hashes pré-calculados das contas fictícias e ausência de refetch redundante na primeira conexão do socket. O contraste dos links em botões cobre foi corrigido. Não há simplificação exclusiva para auditoria, desativação dos mocks ou remoção das artes.

O próximo trabalho de desempenho seria reduzir e distribuir o JavaScript executado na inicialização, especialmente no catálogo e na camada de simulação, preservando os mesmos contratos e cenários. A carga da máquina e o throttling influenciam os resultados: no início mobile, as três notas foram 66, 69 e 60. Todos os resultados foram mantidos no cálculo.

Uma nota 100 de acessibilidade automatizada não certifica toda a experiência de uso. Teclado, foco, formulários e responsividade têm verificações complementares descritas em TESTING.md; aproximações visuais permanecem documentadas em ARCHITECTURE.md.

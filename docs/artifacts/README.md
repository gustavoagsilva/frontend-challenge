# Evidências de validação

Execução em 18/10/2026, Windows, Chromium do Playwright 1.64.1.

- `playwright-full.zip`: relatório HTML da suíte completa, **46 testes aprovados**, desktop e mobile, duração de aproximadamente 5,1 minutos. Extraia e abra `index.html`.
- `lighthouse.zip`: 12 relatórios HTML e seus 12 JSON, mais `summary.json`, referentes ao build de produção a60630d. Resultados e limitações em [LIGHTHOUSE.md](../../LIGHTHOUSE.md).
- `playwright-tablet-mobile.zip`: relatório da reexecução do fluxo visual mobile com as novas referências tablet.
- As referências visuais ficam em `tests/e2e/*-snapshots`, incluindo início, detalhe, carrinho e pagamento em larguras de 390, 768 e 1440 px. As capturas tablet foram acrescentadas após a suíte completa e verificadas separadamente.

Lint, TypeScript e build de produção passaram. Não houve publicação na Vercel. As imagens de NFTs continuam provisórias; os relatórios não demonstram equivalência visual exata ao arquivo Figma.

Na conferência adicional das quatro rotinas visuais, três passaram e uma falhou ao aguardar a mensagem de item adicionado no mobile. A reexecução isolada passou sem alteração de código; a causa da intermitência não foi determinada. Isso não altera o resultado registrado da suíte completa anterior, mas permanece como limitação da estabilidade do teste.

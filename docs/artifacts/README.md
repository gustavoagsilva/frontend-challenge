# Evidências de validação

## Revisão final de entrega

- `lighthouse-final-public.zip`: 12 medições completas (HTML/JSON e resumo), com Lighthouse 13.5.0 na Vercel e artes originais. Medianas e limitações em [LIGHTHOUSE.md](../../LIGHTHOUSE.md).
- `playwright-final-public.zip`: **54 testes aprovados em 6,2 minutos**, executados em `https://kurio-marketplace-ten.vercel.app` após a publicação da revisão 0745f7a. Inclui fluxos completos, falhas, reconexão Socket.IO, isolamento de sessão, acesso direto/refresh e baselines em Chromium desktop/mobile. Comando: `PLAYWRIGHT_BASE_URL` definido para essa origem e `npm run test:e2e`, com um worker.
- `playwright-final-local.zip`: 54 testes aprovados em 8,8 minutos, na revisão e4fb8aa, com artes originais e correções de catálogo, favoritos, checkout e sessão entre abas.
- `playwright-public-initial.zip`: primeira execução completa na Vercel, com 53 aprovações e uma falha no retorno após expiração. A URL mudava antes da montagem do formulário; o preenchimento encontrava o campo de e-mail da tela anterior. O trace também mostrou a identificação antiga no cabeçalho após a expiração.
- `session-expiry-failure-trace.zip`: trace dessa falha, preservado para inspeção com `npx playwright show-trace docs/artifacts/session-expiry-failure-trace.zip`.
- `playwright-session-review.zip`: oito testes direcionados aprovados, desktop/mobile, após corrigir a notificação dos observadores de sessão e aguardar explicitamente o formulário de login. Revisão 0745f7a.
- `dependency-audit-final.json`: `npm audit` sem vulnerabilidades conhecidas, incluindo dependências de desenvolvimento, após remover o wrapper LHCI não utilizado e declarar Lighthouse 13.5.0 e Chrome Launcher 1.2.2 diretamente.

Instalação limpa da revisão 0745f7a, fora da pasta de trabalho, sem arquivo `.env`: `npm ci`, lint, TypeScript e build passaram. A instalação não alterou conteúdo versionado (`git diff --exit-code`). Node 24.15.0, npm 11.12.1, Playwright 1.64.1 e Chromium 156.0.8078.4, no Windows.

Os relatórios abaixo são históricos e não substituem a rodada final publicada.

## Atualização das artes originais

`playwright-original-artwork.zip` contém a verificação posterior à troca das imagens: quatro testes visuais aprovados, cobrindo início, detalhe, carrinho e pagamento em desktop/mobile e capturas adicionais a 768 px. As baselines versionadas usam os PNGs originais. Build e lint passaram; a migração de uma URL legada foi verificada preservando contas, carrinho e totais dos pedidos. Lighthouse ainda corresponde à versão anterior.

## Execuções anteriores

Execução em 18/10/2026, Windows, Chromium do Playwright 1.64.1.

- `playwright-full.zip`: relatório HTML da suíte completa, **46 testes aprovados**, desktop e mobile, duração de aproximadamente 5,1 minutos. Extraia e abra `index.html`.
- `lighthouse.zip`: 12 relatórios HTML e seus 12 JSON, mais `summary.json`, referentes ao build de produção a60630d. Resultados e limitações em [LIGHTHOUSE.md](../../LIGHTHOUSE.md).
- `playwright-tablet-mobile.zip`: relatório da reexecução do fluxo visual mobile com as novas referências tablet.
- As referências visuais ficam em `tests/e2e/*-snapshots`, incluindo início, detalhe, carrinho e pagamento em larguras de 390, 768 e 1440 px. As capturas tablet foram acrescentadas após a suíte completa e verificadas separadamente.

Lint, TypeScript e build de produção passaram. Não houve publicação na Vercel. Esses relatórios foram gerados com imagens provisórias, antes da aplicação dos quatro PNGs originais. Eles não demonstram equivalência visual exata ao arquivo Figma.

Na conferência adicional das quatro rotinas visuais, três passaram e uma falhou ao aguardar a mensagem de item adicionado no mobile. A reexecução isolada passou sem alteração de código; a causa da intermitência não foi determinada. Isso não altera o resultado registrado da suíte completa anterior, mas permanece como limitação da estabilidade do teste.

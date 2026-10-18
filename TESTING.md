# Verificação

`npm run typecheck`, `npm run lint`, `npm run build` e `npm run test:e2e` são as verificações da entrega. A auditoria de produção é `npm run audit:lighthouse`.

Playwright usa Chromium em 1440×900 e 390×844. Os testes visuais também registram baselines e verificam overflow a 768 px. Cada teste abre um contexto novo, sem compartilhar autenticação ou banco. Cenários controlam latência, eventos e resolução de pedidos; testes fora de ordem aguardam explicitamente a latência simulada.

| Arquivo              | Cobertura                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| catalog.spec.ts      | URL, filtros combinados, ordenação, histórico, vazio, detalhe inexistente, skeleton, erro/retry, respostas antigas, foco de diálogo, início visual            |
| account.spec.ts      | Login/logout, troca de conta, perfil/senha, cadastro, carteira e favoritos com rollback                                                                       |
| commerce.spec.ts     | Carrinho visitante, persistência, quantidade, cupom, compra, preço alterado, recusa e timeout recuperável                                                     |
| realtime.spec.ts     | Socket.IO, duplicatas, reconexão, pedido pendente, isolamento e expiração no checkout                                                                         |
| edge-cases.spec.ts   | Avatar, conflito de cadastro/perfil, senha inválida, carteira principal, remoção/cupom, clique repetido, snapshot e estoque esgotado                          |
| visual.spec.ts       | Detalhe, carrinho e pagamento; baselines desktop/mobile e tablet sem overflow                                                                                 |
| final-review.spec.ts | Falha de conexão nos favoritos, troca de conta entre abas com mutation pendente, erro de carrinho no checkout e acesso direto às telas em 390/720/768/1440 px |

As verificações de tempo real atualizam dados pelos handlers MSW e observam a UI. Não chamam setters ou cache do React para simular eventos. A emissão passa pelo protocolo Socket.IO.

## Evidências

A rodada final na Vercel aprovou os 54 testes em 6,2 minutos, na revisão 0745f7a. O relatório está em [docs/artifacts/playwright-final-public.zip](docs/artifacts/playwright-final-public.zip). A primeira rodada pública e seu trace de falha foram preservados, junto da verificação da correção, em docs/artifacts.

O relatório interativo é gerado em playwright-report/index.html. `npm run test:report` abre o relatório. Traces de testes que falharem ficam em test-results e podem ser abertos com `npx playwright show-trace CAMINHO`. Resultados consolidados da execução final são registrados no README das evidências em docs/artifacts.

Baselines Windows/Chromium estão versionadas. Ao mudar imagens ou layout, revise as diferenças antes de executar `npx playwright test --update-snapshots`. Em outro sistema operacional, rasterização de fonte pode exigir novas referências; não é justificativa para aceitar uma regressão sem inspeção.

A simulação não testa blockchain ou gateways externos. `PLAYWRIGHT_BASE_URL` permite executar a suíte no build publicado, sem iniciar o Vite local. Sem essa variável, o Playwright inicia o servidor de desenvolvimento na porta 4173.

A largura de 720 CSS px verifica o reflow equivalente ao viewport de uma janela de 1440 px ampliada a 200%. Isso cobre o layout reduzido; não é um teste do comando de zoom da interface do navegador. As telas são recarregadas por acesso direto, com sessão e carrinho persistidos. O teste adicional de troca entre abas também confirma que uma resposta atrasada não substitui a identidade recém-autenticada.

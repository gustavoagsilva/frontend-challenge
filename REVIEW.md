# Conferência de entrega

Revisão do [enunciado](https://github.com/junglegaming/frontend-challenge) em 18/10/2026. Esta matriz relaciona a implementação às evidências; aprovação dos testes não garante ausência de defeitos nem equivalência visual exata ao Figma.

| Área              | Implementação e evidência                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | React/TypeScript; TanStack Router e Query; cliente Axios; handlers REST MSW; cliente Socket.IO e binding MSW; Tailwind e componentes shadcn adaptados; Playwright e Lighthouse executáveis.                 |
| Telas             | Início, detalhe, carrinho, pagamento, recibo, login, cadastro, perfil e carteiras; favoritos, pedidos e painel de cenários adicionais. `final-review.spec.ts` acessa diretamente todas as telas de negócio. |
| Catálogo          | Contrato de filtros e paginação na URL, consultas canceláveis, ordenação, vazio, erro, retry e validação decimal. `catalog.spec.ts`.                                                                        |
| Detalhe           | ID direto, 404, galeria, edição, estoque, quantidade e favoritos. `catalog.spec.ts` e `edge-cases.spec.ts`.                                                                                                 |
| Conta             | Persistência, formulários, avatar, senha, carteiras, conflitos, logout e expiração. `account.spec.ts`, `edge-cases.spec.ts` e `realtime.spec.ts`.                                                           |
| Isolamento        | Chaves privadas por usuário, cancelamento/remoção de cache e encerramento do socket; teste de troca entre abas com atualização pendente em `final-review.spec.ts`.                                          |
| Carrinho          | Visitante mesclado no login, quantidades, remoção, cupons, persistência e cotação da API. `commerce.spec.ts` e `edge-cases.spec.ts`.                                                                        |
| Precisão          | ETH como strings e cálculos BigInt em 18 casas; a API calcula os totais. `src/domain/money.ts`, mocks de comércio e asserções de totais nos E2E.                                                            |
| Compra            | Conexão simulada, rede, revisão, revalidação, trava de clique e idempotência persistida. Timeout, recusa e sucesso em `commerce.spec.ts`.                                                                   |
| Recibo            | Snapshot do pedido, estado pendente/terminal e remoção apenas das quantidades compradas. `edge-cases.spec.ts` verifica imutabilidade; `realtime.spec.ts` verifica recuperação.                              |
| Tempo real        | Transporte WebSocket com protocolo Socket.IO; identidade/versão; descarte de duplicatas; reconciliação REST. `realtime.spec.ts` interrompe a conexão durante pedido pendente.                               |
| Cenários          | `/demonstracao`, dois usuários fictícios, 36 produtos, falhas de rede/HTTP, latência, conflitos, estoque, timeout e reset. Contratos em API.md.                                                             |
| Acessibilidade    | Labels, mensagens, foco de diálogo, teclado, status e shimmer com movimento reduzido. E2E de foco/erro, Lighthouse e revisão visual; limites em LIGHTHOUSE.md.                                              |
| Responsividade    | Telas verificadas em 390, 720, 768 e 1440 CSS px. Regressão visual de início, detalhe, carrinho e pagamento. Metodologia e limite da verificação de zoom em TESTING.md.                                     |
| Assets            | Quatro PNGs originais fornecidos, fontes locais e migração de URLs antigas. Proveniência em `public/images/nfts/README.md`.                                                                                 |
| Publicação        | Vercel, SPA com acesso direto, mocks disponíveis no build e suíte configurável por `PLAYWRIGHT_BASE_URL`. README contém a URL pública.                                                                      |
| Reprodutibilidade | Lockfile, configuração, scripts e credenciais fictícias documentados; resultados de instalação limpa e execução em docs/artifacts/README.md.                                                                |

## Correções da revisão

- Preço em notação exponencial recebe validação, evitando conversão inválida para BigInt.
- Favoritos respeitam falha de rede e desfazem a atualização otimista.
- Checkout apresenta erro de consulta do carrinho com retry.
- Troca de sessão entre abas atualiza as telas montadas; respostas antigas não substituem o novo usuário nem encerram sua sessão.
- Login, logout e expiração notificam os observadores já montados da sessão; cabeçalho e conexão não mantêm a identidade anterior após a troca.
- A primeira conexão do socket não repete todas as consultas iniciais; reconexões continuam reconciliando o estado.
- Links em botões cobre usam texto escuro, corrigindo contraste.
- Documentação aponta para a publicação e distingue relatórios históricos dos atuais.

## Limites que devem acompanhar a avaliação

Resultado funcional final: 54 testes aprovados na URL pública em Chromium desktop/mobile; instalação limpa, lint, TypeScript e build aprovados; auditoria npm sem vulnerabilidades conhecidas na coleta. Relatórios e trace da falha corrigida estão em docs/artifacts.

Lighthouse final: acessibilidade, boas práticas e SEO em 100 nos quatro grupos. Desempenho de 84/66 no início desktop/mobile e 99/73 no detalhe desktop/mobile; três dos quatro grupos ficam abaixo da meta de 90. A entrega não deve ser apresentada como atendimento integral de todas as metas de qualidade.

A fidelidade foi revisada com os prints fornecidos, sem acesso às medidas completas do arquivo Figma. A fonte e algumas composições mobile são aproximações descritas em ARCHITECTURE.md. As notas Lighthouse e resultados abaixo das metas são registrados em LIGHTHOUSE.md, sem selecionar somente execuções favoráveis. A simulação é local ao navegador; não realiza operações financeiras reais.

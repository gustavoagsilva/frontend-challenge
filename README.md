# Kurio — Marketplace de NFTs

Implementação do [desafio frontend da Jungle](https://github.com/junglegaming/frontend-challenge), com catálogo, conta do colecionador e compra simulada.

**Aplicação:** https://kurio-marketplace-ten.vercel.app/

**Repositório:** https://github.com/gustavoagsilva/frontend-challenge

## Executar

Node.js 24 LTS e npm. No diretório do projeto:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Abra o endereço informado pelo Vite no terminal e mantenha o processo aberto. Não é necessário backend, extensão de carteira ou credencial privada.

Os padrões são `VITE_API_URL=/api` e mocks habilitados. Para sobrescrever, copie `.env.example` para `.env.local`. `VITE_ENABLE_MOCKS=false` desativa a simulação e exige um backend compatível. O build de demonstração também inclui MSW.

## Contas fictícias

| E-mail           | Senha     |
| ---------------- | --------- |
| ana@kurio.test   | Kurio123! |
| bruno@kurio.test | Kurio123! |

Cada conta começa com carteiras Ethereum e Polygon. O cadastro cria uma conta sem carteiras. Use o cupom **KURIO10** para 10% de desconto; **EXPIRED** representa cupom expirado. Senhas são verificadas por PBKDF2 e não ficam em claro no banco local.

## Fluxo principal

1. Explore o catálogo, combine filtros e abra um NFT.
2. Escolha edição e quantidade; adicione ao carrinho.
3. Ajuste quantidades ou cupom e selecione “Conectar e finalizar”.
4. Entre, preencha os dados do colecionador, selecione carteira/rede e conecte.
5. Revise e confirme. O pedido começa pendente e só mostra sucesso depois da confirmação da API.
6. Consulte o recibo ou a lista em `/pedidos`.

Login preserva o carrinho visitante. Perfil, avatar, favoritos, carteiras e pedidos persistem após refresh.

## Cenários de demonstração

Abra **/demonstracao**. O painel aplica cenários aos handlers MSW, atualiza preço/estoque por Socket.IO e restaura os dados iniciais. Para observar eventos enquanto está no checkout, abra o painel em outra aba da mesma origem.

- **Preço muda ao confirmar:** revise uma compra, aplique o cenário e confirme. A API devolve conflito e exige nova revisão.
- **Edição esgota ao confirmar:** a compra é bloqueada e o item permanece no carrinho.
- **Timeout após criar pedido:** a resposta falha depois de salvar a compra. Atualize a página e use “Recuperar pedido”; a tentativa mantém sua chave de idempotência.
- **Pagamento recusado:** aguarde o resultado; os itens permanecem no carrinho.
- **Pedido pendente:** permanece pendente por 60 segundos. O painel também permite resolver pelo ID.
- **Lentidão, vazio, offline e HTTP 503:** permitem verificar skeletons, estados vazios e recuperação. Volte ao cenário Sucesso e tente novamente.
- **Sessão expirada:** também há um botão para expirar imediatamente a sessão. Autentique novamente para retomar a rota anterior.
- **Eventos repetidos:** não devem regredir preço/estoque. “Interromper socket” atua na aba do painel; os testes também interrompem a conexão diretamente na tela do pedido.

A restauração remove alterações e sessões fictícias desta origem. Dados de navegadores ou dispositivos diferentes são independentes.

## Comandos

| Comando                            | Uso                                  |
| ---------------------------------- | ------------------------------------ |
| `npm run dev` / `npm run dev:mock` | Desenvolvimento com mocks por padrão |
| `npm run build`                    | Tipos e build otimizado              |
| `npm run preview`                  | Servir o build local                 |
| `npm run typecheck`                | TypeScript                           |
| `npm run lint`                     | Oxlint                               |
| `npm run test:e2e`                 | Chromium desktop e mobile            |
| `npm run test:report`              | Abrir relatório HTML do Playwright   |
| `npm run audit:lighthouse`         | Build e 12 medições do Lighthouse    |
| `npm run format`                   | Formatar fontes e testes             |

Os testes usam porta 4173 e banco isolado por contexto. Baselines estão em `tests/e2e/*-snapshots`; foram geradas no Windows com Chromium. O relatório HTML fica em `playwright-report`, com traces retidos quando há falha. As auditorias ficam em `reports/lighthouse`. Consulte [TESTING.md](TESTING.md) e [LIGHTHOUSE.md](LIGHTHOUSE.md).

## Organização e limites

- [ARCHITECTURE.md](ARCHITECTURE.md): decisões de estado, sessão, compra, tempo real e ajustes visuais.
- [API.md](API.md): contratos REST, eventos e respostas de erro.
- [REVIEW.md](REVIEW.md): matriz de conferência dos requisitos e limites da entrega.
- As quatro artes originais exportadas do Figma estão em `public/images/nfts`; o mapeamento fica em `src/lib/nft-artwork.ts`. Edições diferentes reutilizam a mesma arte, como no layout. Origem e dimensões em [public/images/nfts/README.md](public/images/nfts/README.md).
- Fontes e imagens são locais; não há dependência de serviços externos em execução.
- Blockchain, pagamentos, autenticação e transações são simulados. O banco local não representa uma arquitetura de autenticação para produção.

## Publicação

Publicado na Vercel com `vercel.json` (Vite, saída `dist`, fallback de rotas e service worker sem cache). Configuração: instalação `npm ci`, build `npm run build`, `VITE_ENABLE_MOCKS=true` e `VITE_API_URL=/api`. A branch `main` está integrada ao deploy automático.

Para executar os mesmos testes contra o site publicado, defina `PLAYWRIGHT_BASE_URL=https://kurio-marketplace-ten.vercel.app` antes de `npm run test:e2e`. Os testes usam contextos isolados e alteram somente o banco simulado desses contextos. Para auditar o site com Lighthouse, defina `AUDIT_URL` com a mesma origem.

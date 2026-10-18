# Contratos da API simulada

Base: /api. JSON; Axios envia Authorization: Bearer TOKEN e X-Guest-Id. Tipos completos: src/domain/models.ts e src/features/catalog/contracts.ts.

| Método e rota             | Entrada                                           | Resultado                                 |
| ------------------------- | ------------------------------------------------- | ----------------------------------------- |
| POST /session/register    | name, email, password                             | Session; 409 se e-mail existe             |
| POST /session/login       | email, password                                   | Session; 401 se credenciais incorretas    |
| GET /session              | token opcional                                    | Session ou null                           |
| DELETE /session           | token                                             | 204; invalida sessão/conexão              |
| GET /discovery            | —                                                 | featured, collections com contagens       |
| GET /nfts                 | q, collection, network, min, max, sort, tab, page | items, total, page, pages, pageSize       |
| GET /nfts/:id             | —                                                 | Product com editions; 404                 |
| GET /favorites            | autenticação                                      | string[] de IDs                           |
| PUT /favorites/:id        | favorite: boolean                                 | string[] atualizado                       |
| GET /cart                 | usuário ou visitante                              | Cart com linhas e versão                  |
| PUT /cart/items           | nftId, editionId, quantity, add?                  | Cart; zero remove, add soma               |
| PUT /cart/coupon          | coupon                                            | Cart; vazio remove, 422 inválido/expirado |
| POST /quotes              | carrinho do proprietário                          | Quote validada, válida por 120 s          |
| POST /wallet-connection   | walletId, provider, network                       | estado conectado; 400 recusa/409 rede     |
| DELETE /wallet-connection | autenticação                                      | connected: false                          |
| POST /orders              | quoteId, walletId, collector, connected           | Order; exige Idempotency-Key              |
| GET /orders/attempts/:key | autenticação                                      | pedido da mesma tentativa                 |
| GET /orders/:id           | autenticação                                      | snapshot e estado; 403 outro usuário/404  |
| GET /orders               | autenticação                                      | lista do usuário                          |
| GET /profile              | autenticação                                      | Profile                                   |
| PATCH /profile            | name, email, phone, avatar                        | Profile; avatar data URL PNG/JPEG/WebP    |
| PUT /profile/password     | currentPassword, password                         | confirmação; 422 inválida                 |
| GET /wallets              | autenticação                                      | Wallet[]                                  |
| PUT /wallets              | id?, label, address, network, primary             | Wallet[]; máximo duas, uma principal      |

Session: user, token, expiresAt (epoch ms). Collector: name, email, phone, country, city, postalCode, note. Quote: id, lines, coupon, subtotal, discount, fee, total, expiresAt, fingerprint. Order: id, userId, status, quote, collector, wallet, transaction, createdAt, dueAt, version, reason?.

Preços e totais são strings decimais; quantity/available/version são inteiros. O servidor usa o preço armazenado, não valores arbitrários enviados pela interface. Ao criar o pedido, a carteira deve pertencer ao usuário e estar conectada na sessão.

## Erros

Formato: `{ message: string, fields?: Record<string,string>, quote?: Quote }`.

400: recusa de conexão; 401: sessão/credenciais inválidas; 403: pedido de outra conta; 404: recurso ausente; 409: conflito, estoque/preço alterado ou chave de idempotência reutilizada com conteúdo diferente; 422: validação; 503: indisponibilidade; 504: resposta perdida depois de criar pedido. Falha de rede usa HttpResponse.error.

## Eventos Socket.IO

`nft.updated`: `{id, resourceId, version}`.
`order.updated`: `{id, resourceId, version, userId}`.

São notificações de invalidação; os dados completos vêm de GET. IDs identificam o evento, resourceId o NFT/pedido, e version cresce por recurso. Eventos de pedidos são filtrados na simulação e novamente no cliente. Não há evento que confirme uma compra apenas por estado local da interface.

## Controles exclusivos dos mocks

- POST /__mock/scenario: `{scenario}`; os valores estão no painel /demonstracao.
- POST /__mock/action: `{action, nftId?, price?, available?, orderId?}`. Ações: update-nft, duplicates, disconnect, expire, settle.
- GET /__mock/status: quantidade de conexões de socket ativas.
- POST /__mock/reset: restaura o banco conhecido. O painel também limpa rascunhos e cache da aplicação.

Essas rotas não pertencem a um backend de produção.

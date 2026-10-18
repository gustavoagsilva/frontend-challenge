# Decisões de implementação

## Organização

React e TypeScript, Vite, TanStack Router/Query, Axios, Tailwind e componentes no padrão shadcn/ui. A pasta `features` reúne catálogo, conta e comércio. `domain` contém contratos e aritmética; `mocks` implementa o backend da demonstração. As telas privadas são carregadas sob demanda.

As telas não leem fixtures nem o banco dos mocks. As operações de negócio usam Axios, inclusive durante testes. O cliente carrega React e MSW em paralelo, aguardando a interceptação antes de iniciar consultas.

## Estado e cache

Busca, coleção, rede, preço, ordenação, categoria e página pertencem à URL. A chave de catálogo inclui todos esses parâmetros. Consultas recebem AbortSignal do TanStack Query para cancelar requisições obsoletas.

Dados públicos usam chaves `catalog`, `discovery`, `nft/id`. Dados privados usam `private/userId/recurso`; carrinho e cotação incluem o proprietário. O padrão é staleTime de 30 segundos, gcTime de cinco minutos e uma repetição para falhas transitórias. Erros 4xx e mutations não são repetidos automaticamente. A sessão é consultada a cada 15 segundos; o cliente também agenda a expiração exata.

Favoritos usam atualização otimista, snapshot anterior e rollback. Logout/troca de conta cancelam consultas, limpam cache e encerram o socket anterior. Alterações de token em outra aba também limpam o cache. Redirecionamentos de retorno aceitam apenas caminhos internos.

## Persistência e simulação

O MSW intercepta REST e WebSocket. O banco `kurio:database:v2` vive no localStorage, com transações serializadas por Web Locks. Inclui 36 NFTs, edições, dois usuários, carteiras, carrinhos, cotações, pedidos e tentativas.

Senhas usam PBKDF2/SHA-256 com 100.000 iterações e salt. Os hashes iniciais das contas fictícias são pré-calculados; cadastro e alteração de senha usam Web Crypto. O token simulado expira em uma hora. A autenticação local é exclusivamente parte do exercício.

Carrinhos visitantes têm UUID próprio. O login mescla itens por NFT/edição, limita pela disponibilidade e consome o carrinho visitante uma vez. Rascunho e tentativa de checkout usam sessionStorage por usuário; não guardam senha. Reiniciar o cenário limpa o banco, timers, token e rascunhos pela interface de demonstração.

## Cotação e pedido

ETH trafega como string decimal. Cálculos usam BigInt em unidades de 10⁻¹⁸; quantidades são inteiras. O desconto de 10% arredonda para baixo na menor unidade e a taxa simulada é 0.016 ETH.

A cotação registra linhas, versões, preços, estoque, cupom, taxas e expiração de dois minutos. A revisão fica inválida se a cotação falhar, estiver atualizando, expirar ou os dados mudarem. O servidor revalida o fingerprint antes de reservar estoque.

Cada tentativa persiste uma chave de idempotência antes do envio. A API guarda chave, conteúdo e pedido por usuário: mesma chave/conteúdo recupera o pedido; conteúdo diferente gera 409. Cliques repetidos são bloqueados também por uma trava síncrona. Timeout após criação não apaga a tentativa.

Pedidos começam pendentes. A simulação confirma ou recusa depois do prazo; refresh e consultas retomam a resolução, inclusive sem o timer anterior. Estados terminais não mudam. Confirmação remove apenas as quantidades compradas; recusa libera a reserva e mantém o carrinho. O recibo usa o snapshot, nunca os preços atuais do catálogo.

## Tempo real

O cliente usa socket.io-client com transporte WebSocket e reconexão. MSW + @mswjs/socket.io-binding realizam handshake e codificação Engine.IO/Socket.IO. Há heartbeat de dez segundos. MSW normaliza o prefixo /socket.io/ ao comparar o endpoint.

Os mocks publicam eventos após alterações. BroadcastChannel distribui os eventos entre abas da mesma origem; cada conexão recebe pedidos somente do usuário autenticado. O cliente valida usuário, ID e versão, descarta duplicatas/versões antigas e invalida os recursos afetados para buscar o estado REST.

Reconexão reconcilia recursos ativos. Pedidos pendentes também têm consulta de recuperação a cada 1,5 segundo. Listeners, heartbeat e conexão são liberados ao desmontar ou trocar sessão.

Não há servidor Socket.IO externo nem fallback de long polling. Os eventos simulados só existem no navegador; não sincronizam computadores diferentes. A consulta REST restaura o estado persistido se a aba foi fechada.

## Visual e acessibilidade

Implementação baseada nos prints recebidos. Fundo #140d0a, tons cobre, fonte IBM Plex Mono local e quatro artes PNG originais exportadas do Figma e fornecidas pelo responsável. A fonte permanece uma substituição; não foi possível conferir todas as medidas diretamente no arquivo Figma. A atualização das URLs antigas ocorre na camada de mocks, preservando contas, carrinhos e valores dos pedidos existentes.

Desktop mantém catálogo com sidebar, hero, cards, promoções e rodapé. Mobile reorganiza filtros em diálogo, usa navegação inferior no catálogo e telas de compra sem rodapé. Detalhe mobile mantém a seleção de galeria em miniaturas sobre a imagem. Checkout apresenta dados obrigatórios em rolagem, mesmo quando não aparecem integralmente no frame mobile.

Campos têm labels e erros associados; estados usam texto além de cor. Diálogos prendem foco e fecham com Escape. Skeletons respeitam movimento reduzido. Quantidades, conexão, mutations e alterações de preço fornecem feedback. A rota de autenticação tem painel sobre o fundo no desktop e formulário independente no mobile.

Conteúdo editorial, redes sociais, recuperação de senha e login social não integram o fluxo exigido; ações auxiliares disponíveis informam sua indisponibilidade, sem fingir conclusão. As imagens já correspondem às quatro artes dos prints; medidas, tipografia e composição ainda podem ser refinadas na revisão visual.

## Próximos cuidados

Publicar na Vercel somente após revisão do responsável; confirmar rotas e service worker na URL final. Repetir auditorias na versão com as artes originais. Os resultados anteriores de Lighthouse, inclusive valores abaixo da meta, estão registrados separadamente; não há caminho especial de renderização para auditoria.

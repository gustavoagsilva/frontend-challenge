# Arquitetura e escopo atual

## Desktop / Início

Implementado: destaque selecionável, catálogo, busca enviada por formulário, coleção + rede + faixa de preço combináveis, abas, ordenação e paginação. Todos os parâmetros são validados pelo TanStack Router e preservados na URL, inclusive no refresh e histórico. Uma mudança de filtro volta à página 1. Páginas acima do limite retornam a última página e a URL é normalizada.

React renderiza dados obtidos por TanStack Query → Axios → MSW. Fixtures e filtros de negócio ficam exclusivamente nos handlers de rede. Consultas de catálogo incluem todos os parâmetros na chave de cache e recebem AbortSignal. Dados públicos ficam frescos por 30s, são coletados após 5min sem uso e revalidados ao focar a janela. Erros de rede/5xx têm uma tentativa adicional; 4xx não são repetidos. Estados pendente, vazio, erro, sucesso e atualização em segundo plano têm feedback próprio.

ETH trafega como string decimal. Comparação e ordenação usam inteiros de 18 casas (BigInt), sem conversão monetária para ponto flutuante. A apresentação preserva a precisão recebida. O catálogo desta etapa é somente leitura: fixtures determinísticas sobrevivem ao refresh por reconstrução. A persistência de conta/carrinho/pedidos será implementada junto às respectivas mutations.

## Interface e assets

Composição baseada nas capturas fornecidas: desktop 1440px, container 1200px, fundo #140D0A, destaques em cobre, sidebar, grade de três colunas, banners, diário e rodapé. Mobile usa duas colunas e diálogo de filtros; tablet mantém a sidebar. Testes conferem larguras 390, 768 e 1440px.

As seis imagens em `public/images/nfts/sample-*.svg` são ilustrações vetoriais provisórias feitas para este protótipo, autorizadas pelo usuário. **Não são os assets originais do Figma.** Substituir o campo `image` em `src/mocks/fixtures.ts` pelos arquivos definitivos. A mesma imagem é reutilizada em destaque, cards, banners e detalhe, sem URLs externas.

IBM Plex Mono é uma aproximação provisória, distribuída localmente por @fontsource (licença OFL incluída no pacote). Tipografia, microespaçamentos, textos pequenos e algumas cores precisam ser conferidos na exportação legível/Figma. O layout não foi validado pixel a pixel contra o arquivo original.

Button segue o padrão shadcn/ui Radix (Slot + CVA), adaptado ao tema em Tailwind; Skeleton é um componente compartilhado com shimmer e suporte a movimento reduzido. Diálogos nativos têm identificação, bloqueio do fundo, contenção explícita de foco, fechamento por Escape e restauração do foco. Há skip link, foco visível, labels e anúncios de resultado. Ações indisponíveis abrem aviso sem produzir efeitos falsos.

## Limites desta etapa

O detalhe é uma visualização inicial dos dados reais da API simulada, acessível por URL, com 404 e esgotamento. Não representa a conclusão da tela de detalhes do desafio.

Pendentes: autenticação e dois usuários, favoritos e mutation otimista com rollback, carrinho persistente, checkout/cotações, idempotência de pedidos, perfil, carteiras, Socket.IO/MSW com versões/reconexão, demais cenários e testes do desafio, auditorias Lighthouse completas e deploy. Nenhuma compra, assinatura de newsletter ou login aparenta sucesso nesta etapa. Conteúdo editorial permanece auxiliar, sem novas páginas.

## Contratos implementados

| Método e rota | Entrada | Resposta |
| --- | --- | --- |
| GET /api/nfts | q, collection, network, min, max, sort, tab, page | items, total, page, pages, pageSize (9) |
| GET /api/discovery | — | featured (3 NFTs), collections (name, count) |
| GET /api/nfts/:id | ID estável | NFT ou 404 com message |
| POST /api/__mock/reset | — | { reset: true }; limpa cenário de falha |

NFT: id, name, image, collection, network, price (string ETH), edition, available (inteiro), badge, createdAt (ISO), popularity e version. Tipos em `src/features/catalog/contracts.ts`. REST ainda não inclui recursos de conta/compra. Não há eventos de tempo real implementados nesta etapa.

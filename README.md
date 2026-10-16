# Kurio — Frontend Challenge

Implementação em andamento do desafio https://github.com/junglegaming/frontend-challenge.
A etapa atual entrega Desktop / Início com catálogo integrado à API simulada, adaptação responsiva e navegação para um detalhe inicial. **O desafio completo ainda não está concluído.**

## Executar

Node.js 24 e npm:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1
```

Abra o endereço informado pelo Vite e mantenha o terminal ativo.
Se houver erro de certificado no Windows: `$env:NODE_USE_SYSTEM_CA='1'` antes do npm; não é necessário desativar TLS.

Variáveis: `VITE_API_URL=/api` e `VITE_ENABLE_MOCKS=true`. Os mocks também são incluídos no build de demonstração quando esta flag está ativa. Sem a flag, o cliente espera uma API REST nesse endereço; não existe fallback de dados na UI.

## Comandos

- `npm run dev`: desenvolvimento.
- `npm run build`: TypeScript e build de produção.
- `npm run preview -- --host 127.0.0.1`: testar build local.
- `npm run typecheck` e `npm run lint`: validações.
- `npx playwright install chromium`: instalar navegador de teste.
- `npm run test:e2e`: fluxos de início e regressão visual, em Chromium desktop/mobile.
- `npx playwright show-report`: relatório HTML; falhas têm traces.
- `npm run test:e2e -- --update-snapshots`: atualizar baselines após revisão visual.
- `npm run audit:lighthouse`: configuração inicial de Lighthouse CI (auditoria final do desafio ainda pendente).

## Imagens provisórias

Os SVGs locais estão em `public/images/nfts/`. Para trocar pelos NFTs definitivos, salve os novos arquivos nessa pasta e atualize `image` nas fixtures em `src/mocks/fixtures.ts`.
As imagens são dados da API, reutilizados automaticamente no restante da página. A fonte IBM Plex Mono também é local e provisória.

## Cenários reproduzíveis

No console do navegador, escolha um cenário e recarregue:

```js
localStorage.setItem('kurio:scenario', 'slow')
location.reload()
```

Opções: `success` (180ms), `empty`, `slow` (2500ms), `error` (503), `offline` (falha de rede) e `out-of-order` (buscas curtas: 1500ms; longas: 100ms).

Para testar recuperação, mude o cenário para `success` sem recarregar e use **Tentar novamente**. Para resetar: remova `kurio:scenario` e recarregue. O endpoint POST /api/__mock/reset também limpa esse cenário. Os dados de catálogo são determinísticos e somente leitura.

Os testes usam contextos isolados e o MSW real no navegador, sem interceptações Playwright que substituam os handlers. As imagens e fontes são locais. Baselines desta etapa ficam em tests/e2e/catalog.spec.ts-snapshots (Windows). Não existem credenciais nesta etapa porque a autenticação ainda não foi implementada.

## Pendências

Consulte ARCHITECTURE.md para contratos, cache, decisões visuais e escopo. Conta, carrinho, compra, tempo real, demais testes e deploy continuam pendentes.

A auditoria npm inicial apontou 17 alertas transitivos nas ferramentas de desenvolvimento associadas ao Lighthouse CI. A correção automática sem alterações incompatíveis não resolveu esses alertas; revisar na etapa de auditorias. Dependências de produção não apresentaram alertas na verificação inicial.

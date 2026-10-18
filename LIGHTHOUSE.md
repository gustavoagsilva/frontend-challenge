# Auditoria Lighthouse

Medições locais em 18/10/2026, build de produção do commit a60630d, com os mesmos mocks e assets usados na demonstração. Três execuções por página e dispositivo, cada uma com perfil novo do Chromium. Os números abaixo são medianas independentes de cada métrica.

| Página / dispositivo | Desempenho | Acessibilidade | Boas práticas | SEO | LCP (ms) |     CLS | TBT (ms) |
| -------------------- | ---------: | -------------: | ------------: | --: | -------: | ------: | -------: |
| Início / desktop     |         98 |             96 |           100 | 100 |      946 | 0,00135 |      106 |
| Início / mobile      |         68 |            100 |            96 | 100 |     3448 | 0,00932 |      949 |
| Detalhe / desktop    |         91 |            100 |           100 | 100 |      851 | 0,04263 |      236 |
| Detalhe / mobile     |         74 |            100 |            96 | 100 |     3494 |       0 |      694 |

As metas de acessibilidade (95), boas práticas (95) e SEO (90) foram atingidas nos quatro grupos. A meta de desempenho (90) foi atingida no desktop e **não foi atingida no mobile**.

## Ambiente e reprodução

- Node 24.15.0, Lighthouse 12.6.1, Playwright 1.64.1 e seu Chromium.
- Windows 10.0.26200; Intel Core i7-10510U 1.80 GHz; 8 GB de RAM.
- Desktop 1440×900, RTT simulado 40 ms, throughput 10240 Kbps e CPU 1×.
- Mobile 390×844, throttling simulado padrão do Lighthouse, CPU 4×.
- Rotas `/` e `/nfts/kurio-001`; servidor Vite preview local, porta 4175; assets locais; fixtures iniciais. Nenhuma execução E2E simultânea à coleta.

Execute `npm ci`, `npx playwright install chromium` e `npm run audit:lighthouse`. O comando compila, inicia o preview, executa as 12 medições e grava HTML, JSON e `summary.json` em `reports/lighthouse`. Para medir outra origem, defina `AUDIT_URL`. O script está em [scripts/audit.mjs](scripts/audit.mjs).

Os relatórios originais estão em [docs/artifacts/lighthouse.zip](docs/artifacts/lighthouse.zip). Extraia e abra os arquivos HTML. O resumo inclui versões, ambiente, resultados individuais e auditorias com falha. Não foram selecionadas apenas as melhores execuções.

## Diagnóstico e limitações

O custo de inicialização do mock no navegador contribui para o bloqueio da thread principal: o chunk MSW e handlers tem aproximadamente 457 kB antes da compressão. Na segunda execução mobile do início, o Lighthouse atribuiu cerca de 857 ms de execução de JavaScript a esse chunk e estimou 99 KiB de JavaScript não utilizado no conjunto carregado. O conteúdo depende da inicialização do service worker e das consultas REST, aumentando também o LCP sob a simulação mobile. Isso sustenta o diagnóstico, mas não atribui todo o tempo de bloqueio exclusivamente ao MSW.

Foram aplicados carregamento das rotas secundárias sob demanda, separação do botão de favoritos, inicialização concorrente dos módulos, fontes locais somente nos pesos utilizados e hashes pré-calculados das contas fictícias. Cadastro e mudança de senha continuam usando PBKDF2. Os mocks não são desativados durante a auditoria e não há tratamento especial para o Lighthouse.

O relatório também aponta textos pequenos no mobile e contraste insuficiente no botão “Explorar” do início desktop; as notas agregadas não significam ausência de problemas. Uma revisão visual pode melhorar esses pontos. Para reduzir o custo de CPU, o próximo experimento seria reduzir o código de simulação carregado inicialmente ou separar o serviço de mocks, preservando os contratos e cenários exigidos.

As execuções variam com a carga e a capacidade da máquina; no início mobile, desempenho variou de 65 a 78. Os resultados são locais, não de uma publicação. Após trocar os NFTs e publicar na Vercel, é necessário repetir as medições na URL final.

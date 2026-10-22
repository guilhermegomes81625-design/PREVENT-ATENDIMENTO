# Central de Atendimento

## Publicação automática

Google AI Studio → sincronizar com GitHub (`main`) → Cloudflare Pages → domínio.
Salvar apenas dentro do editor não publica: a alteração precisa chegar à branch `main`.

- Repositório: `guilhermegomes81625-design/PREVENT-ATENDIMENTO`
- Build: `npm run build`; saída: `dist`; Node.js 22 ou superior.
- A interface continua editável pelo Google AI Studio. As rotas da hospedagem Cloudflare ficam em `functions/api/[[path]].js`.
- Vincular um banco D1 como `DB` nas configurações do Pages. As tabelas são criadas automaticamente e os dados sobrevivem às publicações.
- Configurar `ADMIN_PASSWORD` como segredo do ambiente de produção. Sem ele, o painel não permite login. Nunca colocar senhas no GitHub ou no código do navegador.
- Rotas públicas: `/`, `/contato`. Administração: `/painel`.
- O cadastro inicial inclui somente o número real já usado pelo site: `5511966604328`. Novos atendentes podem ser cadastrados no painel.

## Verificação

`npm ci`, `npm run build`, `npm run lint`, `node --test panel-api.test.mjs`.

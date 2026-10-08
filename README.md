# Apuração Presidente 2026 (PWA)

Site: https://chefaofabio-hub.github.io

App instalável (ícone na tela inicial) com três abas:
- **Apuração 2º turno**: Presidente (25/10/2026), lido ao vivo dos JSON públicos do TSE a cada 30 s
  (`resultados.tse.jus.br/oficial/ele2026/<id>/dados/br/br-c0001-e<id>-u.json`; id 6258, descoberto via `comum/config/ele-c.json`).
- **Por região**: soma dos arquivos de cada estado do TSE (`.../dados/<uf>/<uf>-c0001-e<id>-u.json`), a cada 60 s.
- **Pesquisas eleitorais**: lidas de `pesquisas.json` (só pesquisas com campo depois do 1º turno).

Teste: `?ele=6257` (mostra o 1º turno direto do TSE, com aviso de MODO TESTE).

## Atualizar pesquisas
Edite `pesquisas.json` (instruções no campo `como_editar`) e publique com `bash /workspace/app_presidente/publicar.sh "mensagem"`.

## Alertas de nova pesquisa (Web Push, sem custo)
- No app: aba Pesquisas → "🔔 Ativar alertas de nova pesquisa" (no app instalado aparece também no topo).
- Coletor de inscrições: `bash /workspace/app_presidente/servir_push.sh` (servidor Python + túnel cloudflared; publica o endereço em `push_endpoint.json`). Rodar de novo se o túnel cair.
- Envio automático: `publicar.sh` detecta pesquisa nova em `pesquisas.json` e avisa todos os inscritos depois que o site atualiza. `publicar.sh --sem-alerta "msg"` publica sem avisar.
- Envio manual: `bash /workspace/app_presidente/notificar.sh "Título" "Texto"`.
- Chaves VAPID e inscrições ficam só no box em `/workspace/app_presidente/push/` (nunca no repositório).

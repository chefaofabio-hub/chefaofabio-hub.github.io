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

## Abas atuais (26/10/2026): "Flávio Bolsonaro" (abre por padrão), "ADPF 1362" e "Douglas Ruas"
As demais (Apuração, Pesquisas, Análise, Por região, Confiabilidade, Próximas, Mercado de apostas) foram tiradas do menu;
os dados continuam no disco e algumas seções ficam ocultas no HTML porque o app.js usa seus ids.

### Rotina Flávio (edita só flavio.json)
- Cabeçalho: "contra" (2ª linha, ex. "× Alexandre de Moraes") e "assunto" (3ª linha "Assunto: ...", curto e factual). Revisar o "assunto" a cada rodada; se mudar, atualizar.
- Tirar "novo" dos itens antigos e limpar "status_novos".
- Fato novo no topo de "itens": data, titulo, texto (1-3 frases), texto_completo (SEMPRE: relato completo com fatos, números, nomes, falas curtas entre aspas, contexto e o outro lado, com palavras próprias, parágrafos separados por linha em branco), fonte, url, "novo": true. Só veículos sérios; não inventar.
- Mudou alguma linha de "status"? Atualizar e listar o nome dela em "status_novos".
- Trocar "novidade_id" (ex. "2026-10-27 06:00") e "atualizado_em". Sem novidade, não publicar.
- Validar JSON e publicar: bash /workspace/app_presidente/publicar.sh --sem-alerta "Flavio: <resumo>"

### Rotina ADPF (edita só adpf.json)
- Mesmo esquema: andamento novo no topo de "andamentos" com texto + texto_completo + "novo": true;
  caixas mudadas em "status_novos" (liminar, relator, situacao, numero_unico, protocolo); trocar novidade_id e atualizado_em.
- Publicar: bash /workspace/app_presidente/publicar.sh --sem-alerta "ADPF: <resumo>"

### Rotina Douglas Ruas (edita só ruas.json; aba "Douglas Ruas", mesmo modelo da aba Flávio)
- Caso em SEGREDO DE JUSTIÇA no TJRJ: só entra o que for público (imprensa séria, notas oficiais). Não inventar número de processo.
- Cabeçalho: "contra" e "assunto" (manter atualizado: tipo de ação/investigação e acusações).
- Cards de situação em "status" (Número do processo, Tribunal / relator, Situação, Sigilo, Inquérito civil (2023)); os que mudarem vão em "status_novos".
- Notícia nova no topo de "itens" com data, titulo, texto, texto_completo (relato completo com palavras próprias e o outro lado), fonte, url e "novo": true; tirar "novo" das antigas; trocar novidade_id e atualizado_em.
- Sem novidade, não publicar. Publicar: bash /workspace/app_presidente/publicar.sh --sem-alerta "Ruas: <resumo>"

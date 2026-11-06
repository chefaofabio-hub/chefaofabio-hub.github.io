# Publicar só o JSON da rotina

O `publicar.sh` antigo apagava o repositório (exceto `.git`, `futebol` e `primeiro-turno`) e copiava `site/` por cima. Uma cópia do site sem `governo.*` removia a aba no `main`.

O script novo não copia a árvore e não apaga arquivo. Ele publica somente os JSON nomeados, em cima do `origin/main` atual.

```bash
bash /workspace/app_presidente/publicar.sh --somente paes.json --sem-alerta "Paes: resumo"
bash /workspace/app_presidente/publicar.sh --somente ruas.json --sem-alerta "Ruas: resumo"
bash /workspace/app_presidente/publicar.sh --somente adpf.json --sem-alerta "ADPF: resumo"
bash /workspace/app_presidente/publicar.sh --somente prefeitura.json --sem-alerta "Prefeitura: resumo"
bash /workspace/app_presidente/publicar.sh --somente governo.json --sem-alerta "Governo: resumo"
bash /workspace/app_presidente/publicar.sh --somente flavio.json --sem-alerta "Flavio: resumo"
bash /workspace/app_presidente/publicar.sh --somente apostas.json --sem-alerta "Apostas: resumo"
```

Lista fechada: `ruas.json`, `adpf.json`, `prefeitura.json`, `paes.json`, `governo.json`, `flavio.json`, `apostas.json`. O arquivo é lido de `/workspace/app_presidente/site/`. Caminho com barra, `..` ou outro nome é recusado.

Chamada antiga, sem `--somente`, termina com erro e não publica.

`--sem-alerta` e `--sem-selo` continuam aceitos. Este publicador não chama os scripts de push.

O `pages_repo` existente precisa estar na branch `main` e ser ancestral de `origin/main`. O script faz `git fetch` e monta o commit em cima do remoto. Não usa `reset`, `clean` nem force. Se o mesmo JSON mudou no remoto desde esta cópia, a publicação é recusada.

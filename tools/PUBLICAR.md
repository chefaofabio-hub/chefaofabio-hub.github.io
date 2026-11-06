# Publicar só o JSON da rotina

O publicador antigo apagava o `pages_repo` e copiava `site/` por cima. A correção não copia a árvore e não move o `HEAD` local.

Cada JSON tem a própria base, gravada antes da edição. Publicar `adpf.json` não atualiza a base de `paes.json`. Se o remoto mudou `paes.json` depois da base, a edição feita em cima da cópia antiga é recusada.

## Sintaxe para os prompts

Antes de editar o arquivo:

```bash
bash /workspace/app_presidente/publicar.sh --base paes.json
```

Isso lê `origin/main` e grava a base. Se `site/paes.json` já é igual ao remoto, ele permanece. Se ainda não existe, é criado com o conteúdo remoto. Se já tem edição local diferente do remoto, o comando para e não substitui.

Quando a cópia local está velha e a edição ainda não começou:

```bash
bash /workspace/app_presidente/publicar.sh --base --substituir paes.json
```

Aí sim `site/paes.json` passa a ser o arquivo remoto. Só então edite.

Depois de editar:

```bash
bash /workspace/app_presidente/publicar.sh --somente paes.json --sem-alerta "Paes: resumo"
```

Troque `paes.json` por `ruas.json`, `adpf.json`, `prefeitura.json`, `governo.json`, `flavio.json` ou `apostas.json`. Outro nome ou caminho é recusado.

Chamada antiga, sem `--base` e sem `--somente`, não publica.

`--sem-alerta` e `--sem-selo` continuam aceitos. Este publicador não envia push.

O `pages_repo` precisa existir, com `origin`, mas o script não depende da árvore antiga dele para montar o `main` remoto e não dá `update-ref` nessa branch. O índice e os arquivos de trabalho do `pages_repo` ficam como estavam.

#!/usr/bin/env bash
# Publica somente JSON escolhidos no Vigia (https://chefaofabio-hub.github.io).
#
# Antes de editar:
#   bash /workspace/app_presidente/publicar.sh --base paes.json
# Se site/paes.json tiver bytes diferentes do remoto e a edição ainda não começou:
#   bash /workspace/app_presidente/publicar.sh --base --substituir paes.json
# Depois de editar site/paes.json:
#   bash /workspace/app_presidente/publicar.sh --somente paes.json --sem-alerta "Paes: resumo"
#
# Aceita: ruas.json adpf.json prefeitura.json paes.json governo.json
# flavio.json apostas.json
# Sem --somente e sem --base, nada é publicado. Não copia a árvore, não apaga
# arquivo, não move o HEAD do pages_repo e não envia alerta push.
set -euo pipefail

BASE=${VIGIA_BASE:-/workspace/app_presidente}
SITE=${VIGIA_SITE:-$BASE/site}
REPO=${VIGIA_REPO:-$BASE/pages_repo}

fail() { echo "ERRO: $*" >&2; exit 1; }

ALLOW=" ruas.json adpf.json prefeitura.json paes.json governo.json flavio.json apostas.json "

ONLY=()
MSG=""
BASE_MODE=0
SUBSTITUIR=0
VIU_SOMENTE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --sem-alerta|--sem-selo) shift ;;
    --base) BASE_MODE=1; shift ;;
    --substituir) SUBSTITUIR=1; shift ;;
    --somente)
      VIU_SOMENTE=1
      [ $# -ge 2 ] || fail "faltou o arquivo depois de --somente"
      ONLY+=("$2")
      shift 2
      ;;
    --*) fail "opção desconhecida: $1" ;;
    *)
      if [ "$BASE_MODE" -eq 1 ] && [ "${#ONLY[@]}" -eq 0 ]; then
        ONLY+=("$1")
      else
        [ -z "$MSG" ] || fail "argumento inesperado: $1"
        MSG=$1
      fi
      shift
      ;;
  esac
done

[ "$SUBSTITUIR" -eq 0 ] || [ "$BASE_MODE" -eq 1 ] || fail "--substituir só vale junto com --base. Nada foi publicado."
[ "$BASE_MODE" -eq 0 ] || [ -z "$MSG" ] || fail "--base não publica e não usa mensagem de commit."
[ "$BASE_MODE" -eq 0 ] || [ "$VIU_SOMENTE" -eq 0 ] || fail "--base não combina com --somente."

if [ "$BASE_MODE" -eq 1 ]; then
  [ "${#ONLY[@]}" -eq 1 ] || fail "--base recebe um arquivo: --base <arquivo.json>"
else
  [ "${#ONLY[@]}" -gt 0 ] || fail "informe --somente <arquivo.json>. A publicação da árvore inteira foi desligada e nada foi publicado."
  [ -n "$MSG" ] || fail "informe a mensagem do commit. Nada foi publicado."
fi

declare -A SEEN=()
CLEAN=()
for f in "${ONLY[@]}"; do
  case "$f" in
    */*|.*|*..*) fail "caminho recusado: $f" ;;
  esac
  case "$ALLOW" in
    *" $f "*) ;;
    *) fail "arquivo fora da lista permitida: $f" ;;
  esac
  if [ -z "${SEEN[$f]:-}" ]; then
    SEEN[$f]=1
    CLEAN+=("$f")
  fi
done

[ -d "$SITE" ] || fail "pasta do site ausente ($SITE). Nada foi publicado."
[ -d "$REPO/.git" ] || fail "pages_repo não é um repositório git ($REPO). Nada foi publicado."
git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null
git -C "$REPO" remote get-url origin >/dev/null 2>&1 || fail "remoto origin ausente. Nada foi publicado."
git -C "$REPO" config --get user.name >/dev/null || git -C "$REPO" config user.name "chefaofabio-hub"
git -C "$REPO" config --get user.email >/dev/null || git -C "$REPO" config user.email "chefaofabio-hub@users.noreply.github.com"

BASEDIR="$REPO/.git/vigia-bases"
mkdir -p "$BASEDIR" "$SITE"

export GIT_TERMINAL_PROMPT=0

fetch_main() {
  git -C "$REPO" fetch --quiet origin main \
    || fail "não foi possível ler origin/main (credencial, rede ou remoto). Nada foi publicado."
}

blob_at() {
  if git -C "$REPO" cat-file -e "$1:$2" 2>/dev/null; then
    git -C "$REPO" rev-parse "$1:$2"
  else
    echo MISSING
  fi
}

gravar_base() {
  local f=$1 blob=$2 sha=$3
  printf '%s %s\n' "$blob" "$sha" > "$BASEDIR/$f"
}

ler_base() {
  local f=$1
  [ -f "$BASEDIR/$f" ] || fail "falta base de $f. Antes de editar: bash /workspace/app_presidente/publicar.sh --base $f"
  awk 'NR==1 { print $1 }' "$BASEDIR/$f"
}

copiar_remoto() {
  local f=$1 sha=$2 dest=$3
  local tmp
  tmp=$(mktemp)
  git -C "$REPO" cat-file blob "$sha:$f" > "$tmp" \
    || { rm -f "$tmp"; fail "não consegui ler $f no remoto."; }
  local got
  got=$(git -C "$REPO" hash-object "$tmp")
  local want
  want=$(blob_at "$sha" "$f")
  if [ "$got" != "$want" ]; then
    rm -f "$tmp"
    fail "leitura instável de $f. Nada foi alterado."
  fi
  mv -f "$tmp" "$dest"
}

if [ "$BASE_MODE" -eq 1 ]; then
  f=${CLEAN[0]}
  p="$SITE/$f"
  [ -L "$p" ] && fail "atalho recusado: $f"
  fetch_main
  REMOTE=$(git -C "$REPO" rev-parse origin/main)
  remote=$(blob_at "$REMOTE" "$f")
  [ "$remote" != "MISSING" ] || fail "$f não existe em origin/main. Nada foi alterado."
  if [ -f "$p" ]; then
    site=$(git -C "$REPO" hash-object "$p")
    snap=""
    [ -f "$BASEDIR/$f" ] && snap=$(ler_base "$f")
    if [ "$site" != "$remote" ]; then
      if [ "$SUBSTITUIR" -eq 1 ] || { [ -n "$snap" ] && [ "$site" = "$snap" ]; }; then
        copiar_remoto "$f" "$REMOTE" "$p"
      else
        fail "site/$f difere do remoto. Não substitui. Se a edição ainda não começou: bash /workspace/app_presidente/publicar.sh --base --substituir $f"
      fi
    fi
  else
    copiar_remoto "$f" "$REMOTE" "$p"
  fi
  site=$(git -C "$REPO" hash-object "$p")
  [ "$site" = "$remote" ] || fail "site/$f não ficou igual ao remoto. Base não gravada."
  python3 -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$p" \
    || fail "JSON inválido no remoto: $f. Base não gravada."
  gravar_base "$f" "$remote" "$REMOTE"
  echo "Base gravada para $f a partir de origin/main. Edite site/$f e publique com --somente $f."
  exit 0
fi

for f in "${CLEAN[@]}"; do
  p="$SITE/$f"
  [ -L "$p" ] && fail "atalho recusado: $f"
  [ -f "$p" ] || fail "arquivo ausente no site: $f"
  python3 -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$p" \
    || fail "JSON inválido: $f. Nada foi publicado."
done

fetch_main
declare -A VISTO=()
VISTO_SHA=$(git -C "$REPO" rev-parse origin/main)
for f in "${CLEAN[@]}"; do
  VISTO[$f]=$(blob_at "$VISTO_SHA" "$f")
done

exec 9>"$REPO/.git/vigia-publicar.lock"
flock -w 90 9 || fail "outra publicação está em andamento. Nada foi publicado."

fetch_main
REMOTE=$(git -C "$REPO" rev-parse origin/main)
declare -A HASH=()
for f in "${CLEAN[@]}"; do
  agora=$(blob_at "$REMOTE" "$f")
  if [ "$agora" != "${VISTO[$f]}" ]; then
    site=$(git -C "$REPO" hash-object "$SITE/$f")
    [ "$site" = "$agora" ] || fail "conflito simultâneo em $f. Nada foi publicado."
  fi
  base=$(ler_base "$f")
  [ "$agora" = "$base" ] || fail "base de $f desatualizada: origin/main mudou este arquivo desde o --base. Rode de novo --base $f antes de reaplicar a edição. Nada foi publicado."
  HASH[$f]=$(git -C "$REPO" hash-object "$SITE/$f")
done

if [ -n "${VIGIA_PUBLICAR_MUTATE_SITE:-}" ]; then
  url=$(git -C "$REPO" remote get-url origin)
  case "$url" in
    *github.com*) fail "gancho de teste recusado neste remoto" ;;
  esac
  bash -c "$VIGIA_PUBLICAR_MUTATE_SITE"
fi
for f in "${CLEAN[@]}"; do
  h_agora=$(git -C "$REPO" hash-object "$SITE/$f")
  [ "$h_agora" = "${HASH[$f]}" ] || fail "$f mudou durante a publicação. Nada foi publicado."
done

CHANGED=()
for f in "${CLEAN[@]}"; do
  agora=$(blob_at "$REMOTE" "$f")
  if [ "${HASH[$f]}" = "$agora" ]; then
    continue
  fi
  CHANGED+=("$f")
done

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "Nada mudou; nada a publicar."
  exit 0
fi

WT=$(mktemp -d)
cleanup() {
  # Só o diretório temporário deste processo. Não mexe na árvore do pages_repo.
  if [ -n "${WT:-}" ]; then
    git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true
    rm -rf "$WT"
  fi
}
trap cleanup EXIT

git -C "$REPO" worktree add --detach --quiet "$WT" "$REMOTE"
for f in "${CHANGED[@]}"; do
  h2=$(git -C "$REPO" hash-object "$SITE/$f")
  [ "$h2" = "${HASH[$f]}" ] || fail "$f mudou durante a publicação. Nada foi publicado."
  cp -- "$SITE/$f" "$WT/$f"
  h3=$(git -C "$REPO" hash-object "$WT/$f")
  h4=$(git -C "$REPO" hash-object "$SITE/$f")
  [ "$h3" = "${HASH[$f]}" ] && [ "$h4" = "${HASH[$f]}" ] \
    || fail "$f mudou durante a cópia. Nada foi publicado."
done

git -C "$WT" add -- "${CHANGED[@]}"
mapfile -t STAGED < <(git -C "$WT" diff --cached --name-only)
STAGED_SORTED=$(printf '%s\n' "${STAGED[@]:-}" | sed '/^$/d' | sort)
WANT_SORTED=$(printf '%s\n' "${CHANGED[@]}" | sort)
[ "$STAGED_SORTED" = "$WANT_SORTED" ] \
  || fail "diff inesperado no índice. Nada foi publicado."

git -C "$WT" commit -q -m "$MSG"

verify_tip() {
  local base_sha=$1
  local names
  names=$(git -C "$WT" diff --name-only "$base_sha" HEAD | sed '/^$/d' | sort)
  [ "$names" = "$WANT_SORTED" ] || fail "diff inesperado em relação a main. Nada foi publicado."
}

verify_tip "$REMOTE"

if ! git -C "$WT" push --quiet origin HEAD:main; then
  fetch_main || fail "push recusado e a nova leitura de origin/main falhou. Não houve force."
  NEW=$(git -C "$REPO" rev-parse origin/main)
  if [ "$NEW" = "$REMOTE" ]; then
    fail "push recusado (credencial ou rejeição do remoto). Não houve force. Nada novo foi publicado."
  fi
  for f in "${CHANGED[@]}"; do
    b1=$(blob_at "$REMOTE" "$f")
    b2=$(blob_at "$NEW" "$f")
    [ "$b1" = "$b2" ] || fail "conflito simultâneo em $f. Nada novo foi publicado."
    [ "$b2" = "$(ler_base "$f")" ] || fail "base de $f desatualizada durante o push. Nada novo foi publicado."
  done
  git -C "$WT" rebase --onto "$NEW" "$REMOTE" \
    || fail "não foi possível encaixar o commit na main nova. Nada novo foi publicado."
  verify_tip "$NEW"
  git -C "$WT" push --quiet origin HEAD:main \
    || fail "push recusado de novo. Não houve force."
fi

NEWHEAD=$(git -C "$WT" rev-parse HEAD)
for f in "${CHANGED[@]}"; do
  gravar_base "$f" "$(blob_at "$NEWHEAD" "$f")" "$NEWHEAD"
done

echo "Publicado: $(git -C "$WT" rev-parse --short HEAD) · https://chefaofabio-hub.github.io (atualiza em ~1 min)"
echo "Arquivos: ${CHANGED[*]}"
echo "Alertas push não são enviados."

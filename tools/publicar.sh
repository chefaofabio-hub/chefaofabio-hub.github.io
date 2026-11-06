#!/usr/bin/env bash
# Publica somente JSON escolhidos no Vigia (https://chefaofabio-hub.github.io).
#
# Uso:
#   bash /workspace/app_presidente/publicar.sh --somente paes.json --sem-alerta "Paes: resumo"
#   bash /workspace/app_presidente/publicar.sh --somente ruas.json --somente adpf.json --sem-alerta "Ruas e ADPF"
#
# Arquivos aceitos: ruas.json adpf.json prefeitura.json paes.json governo.json
# flavio.json apostas.json
# A cópia sai de /workspace/app_presidente/site/<arquivo>.
#
# Sem --somente o script para e não publica. Não copia a árvore do site,
# não apaga arquivos e não envia alerta push.
set -euo pipefail

BASE=${VIGIA_BASE:-/workspace/app_presidente}
SITE=${VIGIA_SITE:-$BASE/site}
REPO=${VIGIA_REPO:-$BASE/pages_repo}

fail() { echo "ERRO: $*" >&2; exit 1; }

ALLOW=" ruas.json adpf.json prefeitura.json paes.json governo.json flavio.json apostas.json "

ONLY=()
MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --sem-alerta|--sem-selo) shift ;;
    --somente)
      [ $# -ge 2 ] || fail "faltou o arquivo depois de --somente"
      ONLY+=("$2")
      shift 2
      ;;
    --*) fail "opção desconhecida: $1" ;;
    *)
      [ -z "$MSG" ] || fail "argumento inesperado: $1"
      MSG=$1
      shift
      ;;
  esac
done

[ "${#ONLY[@]}" -gt 0 ] || fail "informe --somente <arquivo.json>. A publicação da árvore inteira foi desligada e nada foi publicado."
[ -n "$MSG" ] || fail "informe a mensagem do commit. Nada foi publicado."

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
for f in "${CLEAN[@]}"; do
  p="$SITE/$f"
  [ -L "$p" ] && fail "atalho recusado: $f"
  [ -f "$p" ] || fail "arquivo ausente no site: $f"
  python3 -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$p" \
    || fail "JSON inválido: $f. Nada foi publicado."
done

[ -d "$REPO/.git" ] || fail "pages_repo não é um repositório git ($REPO). Nada foi publicado."
git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null
git -C "$REPO" remote get-url origin >/dev/null 2>&1 || fail "remoto origin ausente. Nada foi publicado."
BR=$(git -C "$REPO" symbolic-ref --quiet --short HEAD || true)
[ "$BR" = "main" ] || fail "pages_repo precisa estar na branch main. Nada foi publicado."
git -C "$REPO" config --get user.name >/dev/null || git -C "$REPO" config user.name "chefaofabio-hub"
git -C "$REPO" config --get user.email >/dev/null || git -C "$REPO" config user.email "chefaofabio-hub@users.noreply.github.com"

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

fetch_main
declare -A VISTO=()
VISTO_SHA=$(git -C "$REPO" rev-parse origin/main)
for f in "${CLEAN[@]}"; do
  VISTO[$f]=$(blob_at "$VISTO_SHA" "$f")
done

exec 9>"$REPO/.git/vigia-publicar.lock"
flock -w 90 9 || fail "outra publicação está em andamento. Nada foi publicado."

fetch_main
for f in "${CLEAN[@]}"; do
  agora=$(blob_at origin/main "$f")
  if [ "$agora" != "${VISTO[$f]}" ]; then
    site=$(git -C "$REPO" hash-object "$SITE/$f")
    [ "$site" = "$agora" ] || fail "conflito simultâneo em $f. Nada foi publicado."
  fi
done

LOCAL=$(git -C "$REPO" rev-parse HEAD)
REMOTE=$(git -C "$REPO" rev-parse origin/main)
git -C "$REPO" merge-base --is-ancestor "$LOCAL" "$REMOTE" \
  || fail "pages_repo divergiu de origin/main. Nada foi publicado."

CHANGED=()
for f in "${CLEAN[@]}"; do
  base=$(blob_at "$LOCAL" "$f")
  remote=$(blob_at "$REMOTE" "$f")
  site=$(git -C "$REPO" hash-object "$SITE/$f")
  if [ "$site" = "$remote" ]; then
    continue
  fi
  if [ "$remote" = "$base" ]; then
    CHANGED+=("$f")
    continue
  fi
  if [ "$site" = "$base" ]; then
    fail "cópia desatualizada de $f: publicá-la reverteria o remoto. Nada foi publicado."
  fi
  fail "conflito em $f: o remoto e a cópia local mudaram o mesmo arquivo. Nada foi publicado."
done

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "Nada mudou; nada a publicar."
  exit 0
fi

WT=$(mktemp -d)
cleanup() {
  # Só o diretório temporário deste processo. Não mexe na árvore do pages_repo.
  git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true
  rm -rf "$WT"
}
trap cleanup EXIT

git -C "$REPO" worktree add --detach --quiet "$WT" "$REMOTE"
for f in "${CHANGED[@]}"; do
  mkdir -p "$WT/$(dirname "$f")"
  cp -- "$SITE/$f" "$WT/$f"
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

NEW=$(git -C "$REPO" rev-parse origin/main)
if ! git -C "$WT" push --quiet origin HEAD:main; then
  fetch_main || fail "push recusado e a nova leitura de origin/main falhou. Não houve force. Confira o remoto."
  NEW=$(git -C "$REPO" rev-parse origin/main)
  if [ "$NEW" = "$REMOTE" ]; then
    fail "push recusado (credencial ou rejeição do remoto). Não houve force. Nada novo foi publicado."
  fi
  for f in "${CHANGED[@]}"; do
    b1=$(blob_at "$REMOTE" "$f")
    b2=$(blob_at "$NEW" "$f")
    [ "$b1" = "$b2" ] || fail "conflito simultâneo em $f. Nada novo foi publicado."
  done
  git -C "$WT" rebase --onto "$NEW" "$REMOTE" \
    || fail "não foi possível encaixar o commit na main nova. Nada novo foi publicado."
  verify_tip "$NEW"
  git -C "$WT" push --quiet origin HEAD:main \
    || fail "push recusado de novo. Não houve force. Nada além do que já estava no remoto foi alterado por este script."
fi

NEWHEAD=$(git -C "$WT" rev-parse HEAD)
git -C "$REPO" update-ref refs/heads/main "$NEWHEAD"
git -C "$REPO" fetch --quiet origin main \
  || echo "aviso: publicado, mas origin/main local não foi atualizado" >&2

echo "Publicado: $(git -C "$WT" rev-parse --short HEAD) · https://chefaofabio-hub.github.io (atualiza em ~1 min)"
echo "Arquivos: ${CHANGED[*]}"
echo "Alertas push não são enviados."

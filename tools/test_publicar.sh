#!/usr/bin/env bash
# Testes do publicador. Só repositórios temporários. Não fala com o GitHub.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd)
PUB=$ROOT/publicar.sh
PASS=0
FAIL=0

ok() { PASS=$((PASS+1)); echo "ok  $1"; }
bad() { FAIL=$((FAIL+1)); echo "FALHOU  $1"; echo "$2" >&2; }

run() {
  local name=$1
  shift
  if "$@"; then
    ok "$name"
  else
    bad "$name" "comando falhou: $*"
  fi
}

assert_eq() {
  local name=$1 got=$2 want=$3
  if [ "$got" = "$want" ]; then ok "$name"; else bad "$name" "esperado [$want] obteve [$got]"; fi
}

new_repo() {
  local dir=$1
  local bare=$dir/bare.git
  local src=$dir/src
  git init --quiet --bare -b main "$bare"
  git init --quiet -b main "$src"
  git -C "$src" config user.name "teste"
  git -C "$src" config user.email "teste@example.com"
  mkdir -p "$src/futebol" "$src/primeiro-turno" "$src/.github/workflows"
  printf 'css\n' > "$src/governo.css"
  printf 'js\n' > "$src/governo.js"
  printf 'futebol\n' > "$src/futebol/a.txt"
  printf 'turno\n' > "$src/primeiro-turno/a.txt"
  printf 'workflow\n' > "$src/.github/workflows/keep.txt"
  printf '%s\n' '{"v":1}' > "$src/paes.json"
  printf '%s\n' '{"v":1}' > "$src/ruas.json"
  printf '%s\n' '{"v":1}' > "$src/adpf.json"
  printf '%s\n' '{"v":1}' > "$src/prefeitura.json"
  printf '%s\n' '{"v":1}' > "$src/governo.json"
  printf '%s\n' '{"v":1}' > "$src/apostas.json"
  git -C "$src" add -A
  git -C "$src" commit -q -m "base"
  git -C "$src" remote add origin "$bare"
  git -C "$src" push -q origin main
  git clone -q "$bare" "$dir/pages_repo"
  git -C "$dir/pages_repo" config user.name "teste"
  git -C "$dir/pages_repo" config user.email "teste@example.com"
  mkdir -p "$dir/site"
  printf '%s\n' '{"v":1}' > "$dir/site/paes.json"
  printf '%s\n' '{"v":1}' > "$dir/site/ruas.json"
  printf '%s\n' '{"v":1}' > "$dir/site/adpf.json"
  printf '%s\n' '{"v":1}' > "$dir/site/prefeitura.json"
  printf '%s\n' '{"v":1}' > "$dir/site/governo.json"
  printf '%s\n' '{"v":1}' > "$dir/site/apostas.json"
}

pub() {
  local dir=$1
  shift
  VIGIA_BASE="$dir" VIGIA_SITE="$dir/site" VIGIA_REPO="$dir/pages_repo" \
    bash "$PUB" "$@"
}

remote_file() {
  git --git-dir="$1/bare.git" show "main:$2"
}

remote_sha() {
  git --git-dir="$1/bare.git" rev-parse main
}

echo "=== 1. site velho sem governo.* não apaga a aba ==="
D=$(mktemp -d)
new_repo "$D"
pub "$D" --base paes.json >/dev/null
printf '%s\n' '{"v":2,"quem":"real"}' > "$D/site/paes.json"
rm -f "$D/site/governo.json" "$D/site/governo.css" "$D/site/governo.js"
OUT=$(pub "$D" --somente paes.json --sem-alerta "Paes: teste local")
echo "$OUT" | grep -q "Publicado:" && ok "publicou paes" || bad "publicou paes" "$OUT"
assert_eq "paes remoto" "$(remote_file "$D" paes.json)" '{"v":2,"quem":"real"}'
assert_eq "governo.css permanece" "$(remote_file "$D" governo.css)" "css"
assert_eq "governo.js permanece" "$(remote_file "$D" governo.js)" "js"
assert_eq "governo.json permanece" "$(remote_file "$D" governo.json)" '{"v":1}'
assert_eq "futebol permanece" "$(remote_file "$D" futebol/a.txt)" "futebol"
assert_eq "primeiro-turno permanece" "$(remote_file "$D" primeiro-turno/a.txt)" "turno"
assert_eq "workflow permanece" "$(remote_file "$D" .github/workflows/keep.txt)" "workflow"
NAMES=$(git --git-dir="$D/bare.git" show --name-only --pretty=format: main)
assert_eq "commit só paes.json" "$NAMES" "paes.json"
rm -rf "$D"

echo "=== 2. mudança remota em outro JSON é preservada ==="
D=$(mktemp -d)
new_repo "$D"
git clone -q "$D/bare.git" "$D/outro"
git -C "$D/outro" config user.name "teste"
git -C "$D/outro" config user.email "teste@example.com"
printf '%s\n' '{"v":9,"remoto":true}' > "$D/outro/adpf.json"
git -C "$D/outro" add adpf.json
git -C "$D/outro" commit -q -m "adpf remoto"
git -C "$D/outro" push -q origin main
pub "$D" --base ruas.json >/dev/null
printf '%s\n' '{"v":2}' > "$D/site/ruas.json"
pub "$D" --somente ruas.json --sem-alerta "Ruas: teste" >/dev/null
assert_eq "adpf remoto preservado" "$(remote_file "$D" adpf.json)" '{"v":9,"remoto":true}'
assert_eq "ruas publicado" "$(remote_file "$D" ruas.json)" '{"v":2}'
assert_eq "governo.css ainda" "$(remote_file "$D" governo.css)" "css"
rm -rf "$D"

echo "=== 3. conflito no mesmo JSON é recusado ==="
D=$(mktemp -d)
new_repo "$D"
pub "$D" --base paes.json >/dev/null
git clone -q "$D/bare.git" "$D/outro"
git -C "$D/outro" config user.name "teste"
git -C "$D/outro" config user.email "teste@example.com"
printf '%s\n' '{"v":2,"lado":"remoto"}' > "$D/outro/paes.json"
git -C "$D/outro" add paes.json
git -C "$D/outro" commit -q -m "paes remoto"
git -C "$D/outro" push -q origin main
printf '%s\n' '{"v":3,"lado":"local"}' > "$D/site/paes.json"
set +e
OUT=$(pub "$D" --somente paes.json --sem-alerta "Paes: conflito" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "conflito recusado" || bad "conflito recusado" "$OUT"
echo "$OUT" | grep -q "base de paes.json desatualizada" && ok "mensagem de conflito" || bad "mensagem de conflito" "$OUT"
assert_eq "remoto não foi sobrescrito" "$(remote_file "$D" paes.json)" '{"v":2,"lado":"remoto"}'
rm -rf "$D"

echo "=== 4. cópia velha que reverteria o remoto é recusada ==="
D=$(mktemp -d)
new_repo "$D"
pub "$D" --base prefeitura.json >/dev/null
git clone -q "$D/bare.git" "$D/outro"
git -C "$D/outro" config user.name "teste"
git -C "$D/outro" config user.email "teste@example.com"
printf '%s\n' '{"v":2,"lado":"remoto"}' > "$D/outro/prefeitura.json"
git -C "$D/outro" add prefeitura.json
git -C "$D/outro" commit -q -m "prefeitura remota"
git -C "$D/outro" push -q origin main
set +e
OUT=$(pub "$D" --somente prefeitura.json --sem-alerta "Prefeitura: velha" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "reversão recusada" || bad "reversão recusada" "$OUT"
echo "$OUT" | grep -q "base de prefeitura.json desatualizada" && ok "mensagem de cópia velha" || bad "mensagem de cópia velha" "$OUT"
assert_eq "prefeitura remota intacta" "$(remote_file "$D" prefeitura.json)" '{"v":2,"lado":"remoto"}'
rm -rf "$D"

echo "=== 5. sem mudança não cria commit ==="
D=$(mktemp -d)
new_repo "$D"
ANTES=$(remote_sha "$D")
pub "$D" --base governo.json >/dev/null
OUT=$(pub "$D" --somente governo.json --sem-alerta "Governo: igual")
echo "$OUT" | grep -q "Nada mudou" && ok "sem mudança" || bad "sem mudança" "$OUT"
assert_eq "sha estável" "$(remote_sha "$D")" "$ANTES"
rm -rf "$D"

echo "=== 6. chamada antiga não publica a árvore ==="
D=$(mktemp -d)
new_repo "$D"
ANTES=$(remote_sha "$D")
rm -f "$D/site/governo.json"
set +e
OUT=$(pub "$D" --sem-alerta "Paes: chamada antiga" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "chamada antiga falha" || bad "chamada antiga falha" "$OUT"
echo "$OUT" | grep -q "árvore inteira foi desligada" && ok "explica a recusa" || bad "explica a recusa" "$OUT"
assert_eq "remoto intocado" "$(remote_sha "$D")" "$ANTES"
assert_eq "governo.json segue" "$(remote_file "$D" governo.json)" '{"v":1}'
rm -rf "$D"

echo "=== 7. caminhos arbitrários ==="
D=$(mktemp -d)
new_repo "$D"
ANTES=$(remote_sha "$D")
for arg in "../index.html" "/etc/passwd" "pesquisas.json" "index.html" "foo.json" ".."; do
  set +e
  pub "$D" --somente "$arg" --sem-alerta "nao" >/tmp/pub-err 2>&1
  RC=$?
  set -e
  [ "$RC" -ne 0 ] && ok "recusa $arg" || bad "recusa $arg" "$(cat /tmp/pub-err)"
done
assert_eq "remoto intocado após caminhos" "$(remote_sha "$D")" "$ANTES"
rm -rf "$D"

echo "=== 8. JSON inválido e atalho ==="
D=$(mktemp -d)
new_repo "$D"
printf 'nao-json\n' > "$D/site/adpf.json"
set +e
pub "$D" --somente adpf.json --sem-alerta "ADPF: ruim" >/tmp/pub-err 2>&1
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "json inválido" || bad "json inválido" "$(cat /tmp/pub-err)"
rm -f "$D/site/governo.json"
ln -s "$D/site/ruas.json" "$D/site/governo.json"
set +e
pub "$D" --somente governo.json --sem-alerta "Governo: link" >/tmp/pub-err 2>&1
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "atalho recusado" || bad "atalho recusado" "$(cat /tmp/pub-err)"
rm -rf "$D"

echo "=== 9. concorrência em arquivos diferentes ==="
D=$(mktemp -d)
new_repo "$D"
pub "$D" --base paes.json >/dev/null
pub "$D" --base adpf.json >/dev/null
printf '%s\n' '{"v":4}' > "$D/site/paes.json"
printf '%s\n' '{"v":5}' > "$D/site/adpf.json"
pub "$D" --somente paes.json --sem-alerta "Paes: paralelo" >/tmp/pub-a 2>&1 &
P1=$!
pub "$D" --somente adpf.json --sem-alerta "ADPF: paralelo" >/tmp/pub-b 2>&1 &
P2=$!
wait "$P1"; R1=$?
wait "$P2"; R2=$?
[ "$R1" -eq 0 ] && [ "$R2" -eq 0 ] && ok "os dois publicaram" || bad "os dois publicaram" "rc $R1 $R2 $(cat /tmp/pub-a /tmp/pub-b)"
assert_eq "paes dos dois" "$(remote_file "$D" paes.json)" '{"v":4}'
assert_eq "adpf dos dois" "$(remote_file "$D" adpf.json)" '{"v":5}'
assert_eq "governo.css na concorrência" "$(remote_file "$D" governo.css)" "css"
rm -rf "$D"

echo "=== 10. credencial ou remoto ausente ==="
D=$(mktemp -d)
new_repo "$D"
git -C "$D/pages_repo" remote set-url origin "https://127.0.0.1:9/repo-inexistente.git"
ANTES=$(remote_sha "$D")
printf '%s\n' '{"v":8}' > "$D/site/governo.json"
set +e
OUT=$(pub "$D" --somente governo.json --sem-alerta "Governo: sem rede" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "falha sem remoto" || bad "falha sem remoto" "$OUT"
echo "$OUT" | grep -q "credencial" && ok "menciona credencial" || bad "menciona credencial" "$OUT"
assert_eq "bare intocado" "$(remote_sha "$D")" "$ANTES"
rm -rf "$D"

echo "=== 11. lixo no pages_repo não entra no commit ==="
D=$(mktemp -d)
new_repo "$D"
printf 'segredo-local\n' > "$D/pages_repo/nao-publicar.txt"
pub "$D" --base prefeitura.json >/dev/null
printf '%s\n' '{"v":3}' > "$D/site/prefeitura.json"
pub "$D" --somente prefeitura.json --sem-selo "Prefeitura: teste" >/dev/null
NAMES=$(git --git-dir="$D/bare.git" show --name-only --pretty=format: main)
assert_eq "só prefeitura.json" "$NAMES" "prefeitura.json"
git --git-dir="$D/bare.git" cat-file -e main:nao-publicar.txt 2>/dev/null \
  && bad "lixo não publicado" "o arquivo local foi para o remoto" \
  || ok "lixo não publicado"
[ -f "$D/pages_repo/nao-publicar.txt" ] && ok "lixo local preservado" || bad "lixo local preservado" "apagado"
rm -rf "$D"

echo "=== 12. segundo publish legítimo depois de alinhar ==="
D=$(mktemp -d)
new_repo "$D"
pub "$D" --base governo.json >/dev/null
printf '%s\n' '{"v":2}' > "$D/site/governo.json"
pub "$D" --somente governo.json --sem-alerta "Governo: parte 1" >/dev/null
printf '%s\n' '{"v":3}' > "$D/site/governo.json"
pub "$D" --somente governo.json --sem-alerta "Governo: parte 2" >/dev/null
assert_eq "segunda edição" "$(remote_file "$D" governo.json)" '{"v":3}'
rm -rf "$D"

echo "=== 13. concorrência no mesmo JSON ==="
D=$(mktemp -d)
new_repo "$D"
mkdir -p "$D/siteA" "$D/siteB"
for n in paes ruas adpf prefeitura governo apostas; do
  printf '%s\n' '{"v":1}' > "$D/siteA/$n.json"
  printf '%s\n' '{"v":1}' > "$D/siteB/$n.json"
done
VIGIA_BASE="$D" VIGIA_SITE="$D/siteA" VIGIA_REPO="$D/pages_repo" \
  bash "$PUB" --base paes.json >/dev/null
printf '%s\n' '{"v":"A"}' > "$D/siteA/paes.json"
printf '%s\n' '{"v":"B"}' > "$D/siteB/paes.json"
VIGIA_BASE="$D" VIGIA_SITE="$D/siteA" VIGIA_REPO="$D/pages_repo" \
  bash "$PUB" --somente paes.json --sem-alerta "Paes: A" >/tmp/pub-a 2>&1 &
P1=$!
VIGIA_BASE="$D" VIGIA_SITE="$D/siteB" VIGIA_REPO="$D/pages_repo" \
  bash "$PUB" --somente paes.json --sem-alerta "Paes: B" >/tmp/pub-b 2>&1 &
P2=$!
set +e
wait "$P1"; R1=$?
wait "$P2"; R2=$?
set -e
if { [ "$R1" -eq 0 ] && [ "$R2" -ne 0 ]; } || { [ "$R1" -ne 0 ] && [ "$R2" -eq 0 ]; }; then
  ok "um publica e o outro recusa"
else
  bad "um publica e o outro recusa" "rc $R1 $R2 $(cat /tmp/pub-a /tmp/pub-b)"
fi
GOT=$(remote_file "$D" paes.json)
if [ "$GOT" = '{"v":"A"}' ] || [ "$GOT" = '{"v":"B"}' ]; then
  ok "conteúdo íntegro do vencedor"
else
  bad "conteúdo íntegro do vencedor" "$GOT"
fi
assert_eq "aba permanece na disputa" "$(remote_file "$D" governo.css)" "css"
rm -rf "$D"

echo "=== 14. base por arquivo não apaga notícia remota de outro JSON ==="
D=$(mktemp -d)
new_repo "$D"
HEAD0=$(git -C "$D/pages_repo" rev-parse HEAD)
pub "$D" --base paes.json >/dev/null
git clone -q "$D/bare.git" "$D/outro"
git -C "$D/outro" config user.name "teste"
git -C "$D/outro" config user.email "teste@example.com"
printf '%s\n' '{"v":2,"noticia":"P2"}' > "$D/outro/paes.json"
git -C "$D/outro" add paes.json
git -C "$D/outro" commit -q -m "paes P2"
git -C "$D/outro" push -q origin main
pub "$D" --base adpf.json >/dev/null
printf '%s\n' '{"v":2}' > "$D/site/adpf.json"
pub "$D" --somente adpf.json --sem-alerta "ADPF: teste" >/dev/null
assert_eq "P2 sobrevive à publicação de adpf" "$(remote_file "$D" paes.json)" '{"v":2,"noticia":"P2"}'
assert_eq "site/paes continua P1" "$(cat "$D/site/paes.json")" '{"v":1}'
printf '%s\n' '{"v":3}' > "$D/site/paes.json"
set +e
OUT=$(pub "$D" --somente paes.json --sem-alerta "Paes: P3 sem base nova" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "P3 sem base nova é recusado" || bad "P3 sem base nova é recusado" "$OUT"
echo "$OUT" | grep -q "base de paes.json desatualizada" && ok "explica a base velha" || bad "explica a base velha" "$OUT"
assert_eq "P2 não foi apagado" "$(remote_file "$D" paes.json)" '{"v":2,"noticia":"P2"}'
assert_eq "HEAD local não avançou" "$(git -C "$D/pages_repo" rev-parse HEAD)" "$HEAD0"
PORC=$(git -C "$D/pages_repo" status --porcelain)
assert_eq "worktree local sem reversão" "$PORC" ""
assert_eq "paes local segue P1" "$(cat "$D/pages_repo/paes.json")" '{"v":1}'
set +e
OUT=$(pub "$D" --base paes.json 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "base não apaga edição local" || bad "base não apaga edição local" "$OUT"
pub "$D" --base --substituir paes.json >/dev/null
assert_eq "substituir traz P2 para site" "$(cat "$D/site/paes.json")" '{"v":2,"noticia":"P2"}'
printf '%s\n' '{"v":3,"noticia":"P2"}' > "$D/site/paes.json"
pub "$D" --somente paes.json --sem-alerta "Paes: P3 em cima de P2" >/dev/null
assert_eq "P3 conserva a notícia P2" "$(remote_file "$D" paes.json)" '{"v":3,"noticia":"P2"}'
assert_eq "HEAD continua no lugar" "$(git -C "$D/pages_repo" rev-parse HEAD)" "$HEAD0"
rm -rf "$D"

echo "=== 15. JSON de site muda entre o hash e a cópia ==="
D=$(mktemp -d)
new_repo "$D"
ANTES=$(remote_sha "$D")
pub "$D" --base governo.json >/dev/null
printf '%s\n' '{"v":2}' > "$D/site/governo.json"
set +e
OUT=$(VIGIA_PUBLICAR_MUTATE_SITE="printf '%s\n' '{\"v\":99}' > '$D/site/governo.json'" \
  pub "$D" --somente governo.json --sem-alerta "Governo: corrida" 2>&1)
RC=$?
set -e
[ "$RC" -ne 0 ] && ok "corrida no fonte recusada" || bad "corrida no fonte recusada" "$OUT"
echo "$OUT" | grep -q "mudou durante a publicação" && ok "explica a corrida" || bad "explica a corrida" "$OUT"
assert_eq "remoto não levou o JSON rasgado" "$(remote_sha "$D")" "$ANTES"
rm -rf "$D"

echo
echo "passou=$PASS falhou=$FAIL"
[ "$FAIL" -eq 0 ]

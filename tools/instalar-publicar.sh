#!/usr/bin/env bash
# Instala o publicador na box, com backup do script anterior.
# Rode na box, a partir desta pasta:
#   bash instalar-publicar.sh
# Não publica notícia e não mexe no Git.
set -euo pipefail
SRC=${1:-$(cd "$(dirname "$0")" && pwd)/publicar.sh}
DEST=/workspace/app_presidente/publicar.sh
[ -f "$SRC" ] || { echo "ERRO: não achei $SRC" >&2; exit 1; }
[ -d /workspace/app_presidente ] || { echo "ERRO: /workspace/app_presidente não existe nesta máquina." >&2; exit 1; }
if [ -f "$DEST" ]; then
  BAK="$DEST.bak.$(date +%Y%m%d%H%M%S)"
  cp -a "$DEST" "$BAK"
  echo "backup: $BAK"
fi
install -m 755 "$SRC" "$DEST"
echo "instalado: $DEST"
sha256sum "$DEST"
echo "Publicação não foi executada."

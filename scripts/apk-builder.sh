#!/bin/bash
set -euo pipefail

APP_NAME="${APP_NAME:-SomaAI Sales}"
APP_SLUG="${APP_SLUG:-somaaisales}"
BUILD_TYPE="${1:-release}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log() {
  echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"
}

fail() {
  echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js não encontrado."
command -v npx >/dev/null 2>&1 || fail "npx não encontrado."

if [[ ! -f .env.local && ! -f .env ]]; then
  warn "Nenhum arquivo .env local encontrado. O build vai seguir sem ele."
fi

export APP_NAME
export APP_SLUG

log "Nome do app: ${APP_NAME}"
log "Slug do app: ${APP_SLUG}"
log "Preparando build APK local..."
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/tmp/gradle-home}"
mkdir -p "$GRADLE_USER_HOME"

if [[ ! -d android ]]; then
  log "Gerando pasta android com expo prebuild..."
  CI=1 npx expo prebuild --platform android --clean
else
  log "Pasta android já existe, pulando prebuild."
fi

GRADLEW="./android/gradlew"
[[ -f "$GRADLEW" ]] || fail "Gradle wrapper não encontrado em android/gradlew."
chmod +x "$GRADLEW"

if [[ "$BUILD_TYPE" == "clean" ]]; then
  log "Executando assembleRelease com limpeza..."
  (cd android && ./gradlew clean assembleRelease)
else
  log "Executando assembleRelease..."
  (cd android && ./gradlew assembleRelease)
fi

APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK_SOURCE" ]] || fail "APK não encontrado em ${APK_SOURCE}"

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

SAFE_NAME="$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-_')"
APK_TARGET="${OUT_DIR}/${SAFE_NAME}-${BUILD_TYPE}.apk"
cp "$APK_SOURCE" "$APK_TARGET"

log "Build concluído com sucesso."
echo -e "${GREEN}APK gerado em: ${APK_TARGET}${NC}"

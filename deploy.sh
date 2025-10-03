#!/usr/bin/env bash
set -euo pipefail

# استعمال:
#   ./deploy.sh --domain www.example.com --mongo "mongodb+srv://USER:PASS@CLUSTER/db?retryWrites=true&w=majority"
#
# ما يفعله:
# - يتحقّق/يثبّت Docker + docker compose
# - يولّد docker-compose.yml و Caddyfile بحسب مدخلاتك
# - يبني واجهة React ويشغّل FastAPI داخل حاويات
# - يفعّل HTTPS تلقائيًا عبر Caddy/Let's Encrypt
#
# المتطلبات:
# - DNS (@ و www) يشيران إلى IP السيرفر
# - رابط MongoDB Atlas صالح

DOMAIN=""
MONGO_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --mongo)
      MONGO_URL="$2"
      shift 2
      ;;
    *)
      echo "معامل غير معروف: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${DOMAIN}" || -z "${MONGO_URL}" ]]; then
  echo "طريقة الاستخدام:"
  echo "  $0 --domain YOUR_DOMAIN --mongo \"MONGO_URL\""
  exit 1
fi

APEX="${DOMAIN/www./}"

echo "==> DOMAIN: ${DOMAIN}"
echo "==> APEX:   ${APEX}"

need_cmd() { command -v "$1" >/dev/null 2>&1; }

install_docker() {
  echo "==> تثبيت Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
  echo "==> تم تثبيت Docker. إن كانت أول مرة، قد تحتاج تسجيل خروج/دخول لاستخدام docker بدون sudo."
}

if ! need_cmd curl; then
  echo "الرجاء تثبيت curl أولًا (sudo apt update && sudo apt install -y curl)"
  exit 1
fi

if ! need_cmd docker; then
  install_docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "==> تثبيت docker compose plugin..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64)   COMP_ARCH="x86_64" ;;
    aarch64)  COMP_ARCH="aarch64" ;;
    arm64)    COMP_ARCH="aarch64" ;;
    *)        COMP_ARCH="x86_64" ;;
  esac
  curl -SL "https://github.com/docker/compose/releases/download/v2.28.1/docker-compose-linux-${COMP_ARCH}" -o docker-compose
  sudo mv docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# تحقق من وجود مجلدَي المشروع
if [[ ! -d "backend" || ! -d "frontend" ]]; then
  echo "يجب تشغيل السكربت من جذر المشروع حيث توجد مجلدا backend و frontend."
  exit 1
fi

mkdir -p frontend_build

# 1) docker-compose.yml
cat > docker-compose.yml <<'YAML'
version: "3.8"
services:
  backend:
    image: python:3.11-slim
    working_dir: /app
    volumes:
      - ./backend:/app
    command: bash -lc "pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 8001"
    environment:
      - MONGO_URL=${MONGO_URL}
      - DB_NAME=auraa_luxury
      - CORS_ORIGINS=https://${DOMAIN},https://${APEX}
    expose:
      - "8001"
    restart: unless-stopped

  frontend-build:
    image: node:18
    working_dir: /app
    volumes:
      - ./frontend:/app
      - ./frontend_build:/build
    environment:
      - REACT_APP_BACKEND_URL=https://${DOMAIN}
    command: bash -lc "corepack enable && yarn --version && yarn install && yarn build && cp -r build/* /build/"
    restart: "no"

  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DOMAIN=${DOMAIN}
      - APEX=${APEX}
    volumes:
      - ./frontend_build:/usr/share/caddy
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - backend
      - frontend-build
    restart: unless-stopped
YAML

# 2) Caddyfile
cat > Caddyfile <<CADDY
{$DOMAIN}, {$APEX} {
  encode gzip

  @api path /api*
  handle @api {
    reverse_proxy backend:8001
  }

  root * /usr/share/caddy
  try_files {path} /index.html
  file_server
}
CADDY

# 3) تمرير المتغيرات لـ compose
export MONGO_URL="${MONGO_URL}"
export DOMAIN="${DOMAIN}"
export APEX="${APEX}"

echo "==> تشغيل الحاويات (سيتم بناء الواجهة تلقائيًا)..."
docker compose up -d

# 4) فتح الجدار الناري إن وجد
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
fi

echo "==> حالة الخدمات:"
docker compose ps

cat <<INFO

تم النشر.

التحقق:
- تأكد أن سجلات DNS تُشير إلى IP السيرفر:
  • A  @   -> SERVER_IP
  • A  www -> SERVER_IP
- سيصدر Caddy شهادة HTTPS تلقائيًا بعد انتشار DNS (عادة 5–15 دقيقة، وقد يصل 24 ساعة عالميًا).

روابط وخطوات:
- المتجر: https://${DOMAIN}
- تهيئة بيانات أول مرة (اختياري):
    curl -X POST https://${DOMAIN}/api/init-data
- بيانات الأدمن:
    email: admin@auraa.com
    password: admin123

إدارة التشغيل:
- مشاهدة السجلات: docker compose logs -f
- إعادة تشغيل:     docker compose restart
- إيقاف:           docker compose down

INFO
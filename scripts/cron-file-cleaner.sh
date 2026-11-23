#!/usr/bin/env bash
# Ежедневная рассылка напоминаний о дедлайнах.
# Конфиг: /etc/course-platform/cron.env (см. deploy/cron.env.example)

set -euo pipefail

ENV_FILE="${COURSE_PLATFORM_CRON_ENV:-/etc/course-platform/cron.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "cron-file-cleaner: нет файла окружения: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${APP_URL:?APP_URL не задан}"
: "${CRON_SECRET:?CRON_SECRET не задан}"

URL="${APP_URL%/}/api/uploads/"

curl -fsS -X DELETE \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  --max-time 120 \
  "$URL"
echo

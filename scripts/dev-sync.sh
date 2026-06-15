#!/usr/bin/env bash
# Авто-синхронизация с GitHub для разработки.
# Запусти во ВТОРОМ терминале (Metro/expo пусть работает в первом):
#   bash scripts/dev-sync.sh
# Каждые 15 сек тянет свежий код из origin/main. Fast Refresh в Metro
# сам перезагрузит приложение для JS/UI-правок. Если поменялись
# зависимости (package.json) — поставит их и подскажет перезапустить Metro.

cd "$(dirname "$0")/.." || exit 1
echo "🔄 Авто-синхронизация Divergents — слежу за origin/main (Ctrl+C для выхода)"
while true; do
  git fetch -q origin main 2>/dev/null
  before=$(git rev-parse HEAD 2>/dev/null)
  after=$(git rev-parse origin/main 2>/dev/null)
  if [ "$before" != "$after" ]; then
    deps_changed=1
    git diff --quiet "$before" "$after" -- package.json package-lock.json 2>/dev/null && deps_changed=0
    git reset -q --hard origin/main
    echo "✅ Обновлено → $(git log --oneline -1)"
    if [ "$deps_changed" = "1" ]; then
      echo "📦 Изменились зависимости — устанавливаю..."
      npm install
      echo "⚠️  Перезапусти Metro: Ctrl+C в окне expo, затем  npx expo start -c"
    else
      echo "♻️  Приложение перезагрузится само (Fast Refresh)."
    fi
  fi
  sleep 15
done

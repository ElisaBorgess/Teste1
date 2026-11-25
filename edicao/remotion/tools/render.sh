#!/bin/bash
# renderiza os reels passados como argumento
O=/tmp/claude-0/-home-user-Teste1/a0f5e40c-f229-54a5-9a7e-d00a5edecb54/scratchpad/out
cd "$(dirname "$0")/.."
for id in "$@"; do
  npx remotion render src/index.ts $id $O/$id.mp4 --crf=20 > $O/$id.log 2>&1 && echo "RENDER_OK $id" || echo "RENDER_FAIL $id"
done

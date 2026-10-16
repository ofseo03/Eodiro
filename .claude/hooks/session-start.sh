#!/bin/bash
# 클라우드 세션 시작 시 Node 24와 의존성을 준비해 lint·typecheck·test를 바로 쓸 수 있게 한다.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# package.json engines(node 24.x)와 Vercel 런타임에 맞춘다. 실패하면 기본 Node로 계속한다.
export NVM_DIR="${NVM_DIR:-/opt/nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +u
  . "$NVM_DIR/nvm.sh"
  if nvm install 24 >/dev/null 2>&1; then
    node_bin="$(dirname "$(nvm which 24)")"
    export PATH="$node_bin:$PATH"
    if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
      echo "export PATH=\"$node_bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    fi
  else
    echo "Node 24 설치 실패, 기본 Node $(node -v)로 계속합니다." >&2
  fi
  set -u
fi

# --no-save: 세션마다 package-lock.json이 바뀌어 작업 트리가 더러워지지 않게 한다.
npm install --no-save --no-audit --no-fund

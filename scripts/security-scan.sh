#!/bin/bash

echo "🔍 Scanning for secrets and sensitive data..."

# Pattern list
patterns=(
  "sk-[a-zA-Z0-9]{32,}"                              # OpenAI keys
  "AKIA[0-9A-Z]{16}"                                  # AWS access keys
  "github_pat_[a-zA-Z0-9_]{82}"                       # GitHub tokens
  "(password|secret|token|api_key)\s*=\s*['\"][^'\"]{8,}" # Generic secrets
)

found=0

for pattern in "${patterns[@]}"; do
  # dist 폴더 제외 (빌드된 테스트 파일 제외)
  if grep -rE "$pattern" packages/ --include="*.ts" --include="*.js" --exclude-dir=dist; then
    echo "❌ Found secret pattern: $pattern"
    found=1
  fi
done

if [ $found -eq 0 ]; then
  echo "✅ No secrets found"
  exit 0
else
  echo "❌ Secrets detected! Please remove before committing."
  exit 1
fi

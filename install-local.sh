#!/bin/bash

# Obsidian 로컬 플러그인 설치 스크립트

echo "🔨 Building Confluence Sync plugin..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Obsidian Vault 경로 (환경에 맞게 수정하세요)
if [ -z "$OBSIDIAN_VAULT" ]; then
    echo "⚠️  OBSIDIAN_VAULT 환경변수가 설정되지 않았습니다."
    echo "사용 예시:"
    echo "  export OBSIDIAN_VAULT=\"\$HOME/Documents/ObsidianVault\""
    echo "  ./install-local.sh"
    echo ""
    read -p "Vault 경로를 입력하세요: " VAULT_PATH
else
    VAULT_PATH="$OBSIDIAN_VAULT"
fi

if [ ! -d "$VAULT_PATH" ]; then
    echo "❌ Vault가 존재하지 않습니다: $VAULT_PATH"
    exit 1
fi

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/confluence-sync"

echo "📁 Creating plugin directory: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"

echo "📋 Copying files..."
cp main.js "$PLUGIN_DIR/"
cp manifest.json "$PLUGIN_DIR/"

# styles.css는 optional
if [ -f "styles.css" ]; then
    cp styles.css "$PLUGIN_DIR/"
fi

echo ""
echo "✅ Plugin installed successfully!"
echo "📂 Location: $PLUGIN_DIR"
echo ""
echo "📝 Next steps in Obsidian:"
echo "  1. Settings → Community plugins"
echo "  2. Click 'Reload' or Restart Obsidian"
echo "  3. Enable 'Confluence Sync'"
echo "  4. Go to Settings → Confluence Sync"
echo ""

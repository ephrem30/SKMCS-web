#!/bin/bash
VERSION=$(date +"%Y%m%d%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Cache Busting 적용 시작..."
echo "📌 버전: $VERSION"
echo ""

MODIFIED_COUNT=0

for file in "$SCRIPT_DIR"/*.html; do
    [ -f "$file" ] || continue
    filename=$(basename "$file")
    echo "⚙️  처리 중: $filename"

    # 1. 캐시 메타태그 추가 (없으면)
    if grep -q 'http-equiv="Cache-Control"' "$file"; then
        echo "   ℹ️  메타태그 이미 존재 - 버전만 업데이트"
    else
        perl -i -0pe 's{(<meta charset="UTF-8">)}{$1\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n    <meta http-equiv="Pragma" content="no-cache">\n    <meta http-equiv="Expires" content="0">}' "$file"
        echo "   ✅ 캐시 메타태그 추가"
    fi

    # 2. CSS 버전 쿼리스트링 업데이트
    perl -i -pe "s{href=\"styles_v2\\.css(?:\\?v=[0-9]+)?\"}{href=\"styles_v2.css?v=$VERSION\"}g" "$file"
    perl -i -pe "s{href=\"styles\\.css(?:\\?v=[0-9]+)?\"}{href=\"styles.css?v=$VERSION\"}g" "$file"

    # 3. JS 버전 쿼리스트링 업데이트 (로컬 JS 파일만)
    perl -i -pe "s{src=\"(db|freeboard|share|submission|journal_data)\\.js(?:\\?v=[0-9]+)?\"}{src=\"\$1.js?v=$VERSION\"}g" "$file"

    MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
done

echo ""
echo "============================================="
echo "✅ 완료! $MODIFIED_COUNT 개 파일 처리됨"
echo "📌 적용된 버전: $VERSION"
echo "💡 git push 전에 이 스크립트를 실행하세요!"
echo "============================================="

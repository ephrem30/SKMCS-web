#!/usr/bin/env node
// GAS 배포 URL 업데이트 스크립트
// 사용법: node update_gas_url.js "https://script.google.com/macros/s/새URL/exec"

const fs = require('fs');
const path = require('path');

const newUrl = process.argv[2];
if (!newUrl || !newUrl.includes('script.google.com/macros/s/')) {
    console.error('❌ 올바른 GAS 웹앱 URL을 입력하세요.');
    console.error('   사용법: node update_gas_url.js "https://script.google.com/macros/s/.../exec"');
    process.exit(1);
}

const dbJsPath = path.join(__dirname, 'db.js');
let content = fs.readFileSync(dbJsPath, 'utf8');

const urlRegex = /const DB_URL = "https:\/\/script\.google\.com\/macros\/s\/[^"]+\/exec";/;
if (!urlRegex.test(content)) {
    console.error('❌ db.js에서 DB_URL을 찾을 수 없습니다.');
    process.exit(1);
}

const oldUrlMatch = content.match(/const DB_URL = "([^"]+)";/);
const oldUrl = oldUrlMatch ? oldUrlMatch[1] : '(알 수 없음)';

content = content.replace(urlRegex, `const DB_URL = "${newUrl}";`);
fs.writeFileSync(dbJsPath, content, 'utf8');

console.log('✅ DB_URL 업데이트 완료!');
console.log('   이전:', oldUrl.substring(0, 60) + '...');
console.log('   새로:', newUrl.substring(0, 60) + '...');
console.log('');
console.log('다음 명령으로 GitHub에 반영하세요:');
console.log('  git add db.js && git commit -m "fix: GAS 배포 URL 업데이트" && git push origin main');

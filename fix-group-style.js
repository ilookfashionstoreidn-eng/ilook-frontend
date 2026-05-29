const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let content = fs.readFileSync(filePath, 'utf-8');

const replacement = `
.spk-cutting-form-group-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.spk-cutting-group-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
  margin-top: 0;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.spk-cutting-form-group-section.mt-4 {
  margin-top: 16px;
}

.spk-cutting-identity-grid {`;

const regex = /\.spk-cutting-identity-grid\s*\{/g;
// Replace only the first occurrence
let replaced = false;
content = content.replace(regex, (m) => {
  if (!replaced) {
    replaced = true;
    return replacement;
  }
  return m;
});

fs.writeFileSync(filePath, content);
console.log("Styled group titles in SpkCutting.css!");

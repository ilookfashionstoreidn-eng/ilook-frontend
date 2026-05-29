const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let content = fs.readFileSync(filePath, 'utf-8');

const regex = /\.spk-cutting-form-row\s*{\s*display:\s*grid;\s*gap:\s*6px;\s*}/;
const replacement = `.spk-cutting-form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.spk-cutting-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}`;

content = content.replace(regex, replacement);
fs.writeFileSync(filePath, content);
console.log("Fixed SpkCutting.css form row");

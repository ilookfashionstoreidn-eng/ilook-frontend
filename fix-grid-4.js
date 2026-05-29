const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let content = fs.readFileSync(filePath, 'utf-8');

const regex1 = /\.spk-cutting-identity-grid\s*{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);\s*gap:\s*14px\s*20px;\s*}/;
const replacement1 = `.spk-cutting-identity-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 20px;
}`;

const regex2 = /\.spk-cutting-form-row\s*{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);\s*gap:\s*14px\s*20px;\s*}/;
const replacement2 = `.spk-cutting-form-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 20px;
}`;

content = content.replace(regex1, replacement1);
content = content.replace(regex2, replacement2);

fs.writeFileSync(filePath, content);
console.log("Fixed SpkCutting.css grid columns to 4");

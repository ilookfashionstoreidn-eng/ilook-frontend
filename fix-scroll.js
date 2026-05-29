const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let content = fs.readFileSync(filePath, 'utf-8');

const regex = /\.spk-cutting-sku-table\s*{\s*width:\s*100%;\s*min-width:\s*100%;\s*border-collapse:\s*separate;\s*border-spacing:\s*0;\s*table-layout:\s*fixed;\s*}/;
const replacement = `.spk-cutting-sku-table {
  width: 100%;
  min-width: 800px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}`;

content = content.replace(regex, replacement);
fs.writeFileSync(filePath, content);
console.log("Fixed SpkCutting.css table scroll");

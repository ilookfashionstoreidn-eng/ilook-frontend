const fs = require('fs');

const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let jsContent = fs.readFileSync(jsPath, 'utf-8');

const regex = /\{editSpkCutting\.bagian\.map\(\(bagian, bagianIndex\) => \([\s\S]*?\}\)\}/;

jsContent = jsContent.replace(regex, (match) => {
  if (match.includes('spk-cutting-bagian-cards-container')) return match; // Already wrapped
  return `<div className="spk-cutting-bagian-cards-container">\n                      ${match}\n                    </div>`;
});

fs.writeFileSync(jsPath, jsContent);
console.log("Wrapped Edit Bagian mapping in SpkCutting.js!");

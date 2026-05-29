const fs = require('fs');

const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let jsContent = fs.readFileSync(jsPath, 'utf-8');

const regex = /\{newSpkCutting\.bagian\.map\(\(bagian, bagianIndex\) => \([\s\S]*?\}\)\}/;

jsContent = jsContent.replace(regex, (match) => {
  return `<div className="spk-cutting-bagian-cards-container">\n                      ${match}\n                    </div>`;
});

fs.writeFileSync(jsPath, jsContent);
console.log("Wrapped Bagian mapping in SpkCutting.js!");

const cssPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let cssContent = fs.readFileSync(cssPath, 'utf-8');

if (!cssContent.includes('.spk-cutting-bagian-cards-container')) {
  cssContent += `
.spk-cutting-bagian-cards-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}
`;
  fs.writeFileSync(cssPath, cssContent);
  console.log("Added CSS for side-by-side Bagian cards!");
}

const fs = require('fs');

// Update JS
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let jsContent = fs.readFileSync(jsPath, 'utf-8');

jsContent = jsContent.replace(/<div className="spk-cutting-form-group-section">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/, '<div className="spk-cutting-groups-wrapper">\n                    <div className="spk-cutting-form-group-section">$1</div>\n                    </div>\n                    </div>\n                    </div>');

fs.writeFileSync(jsPath, jsContent);
console.log("Updated SpkCutting.js wrapping!");

// Update CSS
const cssPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let cssContent = fs.readFileSync(cssPath, 'utf-8');

cssContent = cssContent.replace(/\.spk-cutting-identity-grid\s*{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);\s*gap:\s*14px\s*20px;\s*}/, `.spk-cutting-identity-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px 20px;
}`);

cssContent += `
.spk-cutting-groups-wrapper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.spk-cutting-form-group-section {
  margin-bottom: 0 !important;
  height: 100%;
}
.spk-cutting-form-group-section.mt-4 {
  margin-top: 0 !important;
}
`;

fs.writeFileSync(cssPath, cssContent);
console.log("Updated SpkCutting.css grid!");

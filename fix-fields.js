const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Find the end of .spk-cutting-identity-grid (the closing div before {renderSkuSelector)
const gridEndRegex = /<\/div>\s*\{renderSkuSelector\(\{/g;

// Find the fields to move
const fieldsRegex = /<div className="spk-cutting-production-summary">([\s\S]*?)<div className="spk-cutting-form-group">\s*<label>Keterangan:<\/label>/;
const match = content.match(fieldsRegex);

if (match) {
  let fieldsContent = match[1];
  
  // Remove the <div className="spk-cutting-form-row"> wrappers from fieldsContent
  fieldsContent = fieldsContent.replace(/<div className="spk-cutting-form-row">/g, '');
  fieldsContent = fieldsContent.replace(/<\/div>\s*<\/div>/g, '</div>\n');

  // Insert fieldsContent before the closing div of identity-grid
  content = content.replace(/(\s*)<\/div>\s*(\{renderSkuSelector)/, (m, space, render) => {
    return space + fieldsContent.trim() + space + '</div>' + space + render;
  });

  // Remove the fields from the original location
  content = content.replace(match[1], '');

  fs.writeFileSync(filePath, content);
  console.log("Moved fields in SpkCutting.js!");
} else {
  console.log("Could not find the fields to move");
}

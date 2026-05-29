const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(filePath, 'utf-8');

const editFormStartRegex = /<div className="spk-cutting-modal-content">([\s\S]*?)<\/form>/;
const match = content.match(editFormStartRegex);

if (match) {
  let editFormContent = match[1];

  // Replace form-row wrappers above SKU selector
  editFormContent = editFormContent.replace(/<div className="spk-cutting-form-row">\s*<div className="spk-cutting-form-group">([\s\S]*?<label>Tukang Pola:)/, '<div className="spk-cutting-identity-grid">\n                <div className="spk-cutting-form-group">$1');
  
  // Replace the closing of the first row and opening of the next
  editFormContent = editFormContent.replace(/<\/div>\s*<\/div>\s*<div className="spk-cutting-form-row">/g, '</div>\n');

  // Extract the fields below SKU selector
  const bottomFieldsRegex = /<\/div>\s*<div className="spk-cutting-form-row">([\s\S]*?)<div className="spk-cutting-form-group">\s*<label>Keterangan:<\/label>/;
  const bottomMatch = editFormContent.match(bottomFieldsRegex);
  
  if (bottomMatch) {
    let fieldsContent = bottomMatch[1];
    
    // Clean up wrappers
    fieldsContent = fieldsContent.replace(/<div className="spk-cutting-form-row">/g, '');
    fieldsContent = fieldsContent.replace(/<\/div>\s*<\/div>/g, '</div>\n');
    
    // Insert fields right before the SKU selector
    editFormContent = editFormContent.replace(/(\s*)\{renderSkuSelector/, (m, space) => {
      return space + fieldsContent.trim() + space + '</div>' + space + '{renderSkuSelector';
    });

    // Remove the fields from original location
    editFormContent = editFormContent.replace(bottomMatch[1], '');
    
    content = content.replace(match[1], editFormContent);
    fs.writeFileSync(filePath, content);
    console.log("Edit form updated!");
  } else {
    console.log("Could not find bottom fields in edit form.");
  }

} else {
  console.log("Could not find edit form.");
}

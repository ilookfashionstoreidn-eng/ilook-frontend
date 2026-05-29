const fs = require('fs');

const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let jsContent = fs.readFileSync(jsPath, 'utf-8');

// The first group (Identitas) is from <div className="spk-cutting-groups-wrapper"> to </div></div></div>
const group1Regex = /<div className="spk-cutting-groups-wrapper">\s*<div className="spk-cutting-form-group-section">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
const group1Match = jsContent.match(group1Regex);

// The second group (Produk & Target)
const group2Regex = /<div className="spk-cutting-form-group-section mt-4">\s*<h4 className="spk-cutting-group-title">Produk & Target<\/h4>([\s\S]*?)<\/div>\s*<\/div>/;
const group2Match = jsContent.match(group2Regex);

// The third group (Biaya & Asumsi)
const group3Regex = /<div className="spk-cutting-form-group-section mt-4">\s*<h4 className="spk-cutting-group-title">Biaya & Asumsi<\/h4>([\s\S]*?)<\/div>\s*<\/div>/;
const group3Match = jsContent.match(group3Regex);

if (group1Match && group2Match && group3Match) {
  const g1Content = group1Match[1];
  const g2Content = group2Match[1];
  const g3Content = group3Match[1];

  const newStructure = `<div className="spk-cutting-groups-wrapper">
                      <div className="spk-cutting-form-group-section">
                        <h4 className="spk-cutting-group-title">Produk & Target</h4>
                        ${g2Content}
                      </div>
                      </div>

                      <div className="spk-cutting-form-group-section">
                        ${g1Content}
                      </div>

                      <div className="spk-cutting-form-group-section">
                        <h4 className="spk-cutting-group-title">Biaya & Asumsi</h4>
                        ${g3Content}
                      </div>
                    </div>`;

  // We need to replace the entire chunk spanning from group1 to group3
  const fullChunkRegex = /<div className="spk-cutting-groups-wrapper">([\s\S]*?)<div className="spk-cutting-form-group-section mt-4">\s*<h4 className="spk-cutting-group-title">Biaya & Asumsi<\/h4>[\s\S]*?<\/div>\s*<\/div>/;
  
  jsContent = jsContent.replace(fullChunkRegex, newStructure);
  fs.writeFileSync(jsPath, jsContent);
  console.log("Reordered and wrapped groups correctly!");
} else {
  console.log("Could not find all groups");
}

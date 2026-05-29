const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let lines = fs.readFileSync(jsPath, 'utf-8').split(/\\r?\\n/);

// Fix Create form (lines around 2650-2665)
let createStart = -1;
let createEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{isAksesorisBagian(bagian.nama_bagian)') && lines[i+1] && lines[i+1].includes('{isAksesorisBagian(bagian.nama_bagian) ? (')) {
    createStart = i;
    for (let j = i; j < i + 30; j++) {
      if (lines[j] && lines[j].includes('}') && lines[j+1] && lines[j+1].includes('<div className="spk-cutting-bahan-cell">')) {
        createEnd = j;
        break;
      }
    }
    break;
  }
}

if (createStart !== -1 && createEnd !== -1) {
  const goodCreate = [
    '                                    {isAksesorisBagian(bagian.nama_bagian)',
    '                                      ? renderAksesorisSelect({',
    '                                          value: bahan.aksesoris_id,',
    '                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),',
    '                                        })',
    '                                      : renderBahanSelect({',
    '                                          value: bahan.bahan_id,',
    '                                          materialGroup: bahan.material_group || bagian.material_group,',
    '                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),',
    '                                        })}'
  ];
  lines.splice(createStart, createEnd - createStart + 1, ...goodCreate);
  console.log("Fixed Create form damage!");
}

// Fix Edit form (lines around 3040)
let editStart = -1;
let editEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{isAksesorisBagian(bagian.nama_bagian) ? (') && lines[i+1] && lines[i+1].includes('materialGroup: bahan.material_group || bagian.material_group,')) {
    editStart = i;
    editEnd = i + 3; // 4 lines to replace
    break;
  }
}

if (editStart !== -1) {
  const goodEdit = [
    '                      {isAksesorisBagian(bagian.nama_bagian) ? (',
    '                        <>',
    '                          {renderAksesorisSelect({',
    '                            value: bahan.aksesoris_id,',
    '                            onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),',
    '                          })}',
    '                          <input type="text" value="Aksesoris" readOnly />',
    '                        </>',
    '                      ) : (',
    '                        <>',
    '                          {renderBahanSelect({',
    '                            value: bahan.bahan_id,',
    '                            materialGroup: bahan.material_group || bagian.material_group,',
    '                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),',
    '                          })}'
  ];
  lines.splice(editStart, editEnd - editStart + 1, ...goodEdit);
  console.log("Fixed Edit form damage!");
}

fs.writeFileSync(jsPath, lines.join('\\n'));
console.log("Done!");

const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let lines = fs.readFileSync(jsPath, 'utf-8').split(/\\r?\\n/);

// Fix Create form
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{isAksesorisBagian(bagian.nama_bagian)') && lines[i+1] && lines[i+1].includes('{isAksesorisBagian(bagian.nama_bagian) ? (')) {
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
    lines.splice(i, 17, ...goodCreate); // 17 lines was the size of the bad block (from 2652 to 2668)
    console.log("Fixed Create form damage!");
    break;
  }
}

// Fix Edit form
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{isAksesorisBagian(bagian.nama_bagian) ? (') && lines[i+1] && lines[i+1].includes('materialGroup: bahan.material_group || bagian.material_group,')) {
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
    lines.splice(i, 4, ...goodEdit);
    console.log("Fixed Edit form damage!");
    break;
  }
}

fs.writeFileSync(jsPath, lines.join('\\n'));
console.log("Done!");

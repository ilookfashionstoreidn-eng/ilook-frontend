const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(jsPath, 'utf-8');

const editBadRegex = /\\{\\s*isAksesorisBagian\\(bagian\\.nama_bagian\\)\\s*\\?\\s*\\([\\s\\S]*?materialGroup:\\s*bahan\\.material_group\\s*\\|\\|\\s*bagian\\.material_group,\\s*onChange:\\s*\\(value\\)\\s*=>\\s*handleEditBahanChange\\(bagianIndex,\\s*bahanIndex,\\s*"bahan_id",\\s*value\\),\\s*\\}\\)\\s*\\}/;

const editGood = "{isAksesorisBagian(bagian.nama_bagian) ? (\n                        <>\n                          {renderAksesorisSelect({\n                            value: bahan.aksesoris_id,\n                            onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),\n                          })}\n                          <input type=\"text\" value=\"Aksesoris\" readOnly />\n                        </>\n                      ) : (\n                        <>\n                          {renderBahanSelect({\n                            value: bahan.bahan_id,\n                            materialGroup: bahan.material_group || bagian.material_group,\n                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, \"bahan_id\", value),\n                          })}";

content = content.replace(editBadRegex, editGood);

fs.writeFileSync(jsPath, content);
console.log("Fixed Edit form!");

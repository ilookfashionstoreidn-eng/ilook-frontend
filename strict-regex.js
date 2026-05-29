const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(jsPath, 'utf-8');

const createRegex = /\\{\\s*isAksesorisBagian\\(bagian\\.nama_bagian\\)\\s*\\r?\\n\\s*\\{\\s*isAksesorisBagian\\(bagian\\.nama_bagian\\)\\s*\\?\\s*\\([\\s\\S]*?onChange:\\s*\\(value\\)\\s*=>\\s*handleBahanChange\\(bagianIndex,\\s*bahanIndex,\\s*"bahan_id",\\s*value\\),\\s*\\}\\)\\s*\\r?\\n\\s*<\\/>\\s*\\r?\\n\\s*\\}/;

const goodCreate = "{isAksesorisBagian(bagian.nama_bagian)\n                                      ? renderAksesorisSelect({\n                                          value: bahan.aksesoris_id,\n                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),\n                                        })\n                                      : renderBahanSelect({\n                                          value: bahan.bahan_id,\n                                          materialGroup: bahan.material_group || bagian.material_group,\n                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, \"bahan_id\", value),\n                                        })}";

content = content.replace(createRegex, goodCreate);

const editRegex = /\\{\\s*isAksesorisBagian\\(bagian\\.nama_bagian\\)\\s*\\?\\s*\\(\\s*\\r?\\n\\s*materialGroup:\\s*bahan\\.material_group\\s*\\|\\|\\s*bagian\\.material_group,\\s*\\r?\\n\\s*onChange:\\s*\\(value\\)\\s*=>\\s*handleEditBahanChange\\(bagianIndex,\\s*bahanIndex,\\s*"bahan_id",\\s*value\\),\\s*\\r?\\n\\s*\\}\\)\\s*\\}/;

const goodEdit = "{isAksesorisBagian(bagian.nama_bagian) ? (\n                        <>\n                          {renderAksesorisSelect({\n                            value: bahan.aksesoris_id,\n                            onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),\n                          })}\n                          <input type=\"text\" value=\"Aksesoris\" readOnly />\n                        </>\n                      ) : (\n                        <>\n                          {renderBahanSelect({\n                            value: bahan.bahan_id,\n                            materialGroup: bahan.material_group || bagian.material_group,\n                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, \"bahan_id\", value),\n                          })}";

content = content.replace(editRegex, goodEdit);

fs.writeFileSync(jsPath, content);
console.log("Replaced with regex successfully!");

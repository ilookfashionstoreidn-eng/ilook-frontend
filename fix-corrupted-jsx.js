const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(jsPath, 'utf-8');

const createBad = '                                    {isAksesorisBagian(bagian.nama_bagian)\n                                    {isAksesorisBagian(bagian.nama_bagian) ? (\n                                      <>\n                                        {renderAksesorisSelect({\n                                          value: bahan.aksesoris_id,\n                                          onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),\n                                        })}\n                                      </>\n                                    ) : (\n                                      <>\n                                        {renderBahanSelect({\n                                          value: bahan.bahan_id,\n                                          materialGroup: bahan.material_group || bagian.material_group,\n                                          onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),\n                                        })}\n                                      </>\n                                    )}';

const createGood = '                                    {isAksesorisBagian(bagian.nama_bagian)\n                                      ? renderAksesorisSelect({\n                                          value: bahan.aksesoris_id,\n                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),\n                                        })\n                                      : renderBahanSelect({\n                                          value: bahan.bahan_id,\n                                          materialGroup: bahan.material_group || bagian.material_group,\n                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),\n                                        })}';

content = content.replace(createBad, createGood);

const editBad = '                      {isAksesorisBagian(bagian.nama_bagian) ? (\n                            materialGroup: bahan.material_group || bagian.material_group,\n                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),\n                          })}';

const editGood = '                      {isAksesorisBagian(bagian.nama_bagian) ? (\n                        <>\n                          {renderAksesorisSelect({\n                            value: bahan.aksesoris_id,\n                            onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),\n                          })}\n                          <input type="text" value="Aksesoris" readOnly />\n                        </>\n                      ) : (\n                        <>\n                          {renderBahanSelect({\n                            value: bahan.bahan_id,\n                            materialGroup: bahan.material_group || bagian.material_group,\n                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),\n                          })}';

content = content.replace(editBad, editGood);

fs.writeFileSync(jsPath, content);
console.log("Fixed corrupted JSX successfully!");

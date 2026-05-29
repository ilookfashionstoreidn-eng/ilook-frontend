const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(jsPath, 'utf-8');

const bad1 = \`                                    {isAksesorisBagian(bagian.nama_bagian)
                                    {isAksesorisBagian(bagian.nama_bagian) ? (
                                      <>
                                        {renderAksesorisSelect({
                                          value: bahan.aksesoris_id,
                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),
                                        })}
                                      </>
                                    ) : (
                                      <>
                                        {renderBahanSelect({
                                          value: bahan.bahan_id,
                                          materialGroup: bahan.material_group || bagian.material_group,
                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                                        })}
                                      </>
                                    )}\`;
const good1 = \`                                    {isAksesorisBagian(bagian.nama_bagian)
                                      ? renderAksesorisSelect({
                                          value: bahan.aksesoris_id,
                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),
                                        })
                                      : renderBahanSelect({
                                          value: bahan.bahan_id,
                                          materialGroup: bahan.material_group || bagian.material_group,
                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                                        })}\`;

content = content.replace(bad1.replace(/\\n/g, '\\r\\n'), good1.replace(/\\n/g, '\\r\\n'));

const bad2 = \`                      {isAksesorisBagian(bagian.nama_bagian) ? (
                            materialGroup: bahan.material_group || bagian.material_group,
                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                          })}\`;
const good2 = \`                      {isAksesorisBagian(bagian.nama_bagian) ? (
                        <>
                          {renderAksesorisSelect({
                            value: bahan.aksesoris_id,
                            onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),
                          })}
                          <input type="text" value="Aksesoris" readOnly />
                        </>
                      ) : (
                        <>
                          {renderBahanSelect({
                            value: bahan.bahan_id,
                            materialGroup: bahan.material_group || bagian.material_group,
                            onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                          })}\`;

content = content.replace(bad2.replace(/\\n/g, '\\r\\n'), good2.replace(/\\n/g, '\\r\\n'));

fs.writeFileSync(jsPath, content);
console.log("Done!");

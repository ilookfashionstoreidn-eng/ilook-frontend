import re

js_path = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js'

with open(js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Edit form
# Target:
# {isAksesorisBagian(bagian.nama_bagian) ? (
#      materialGroup: bahan.material_group || bagian.material_group,
#      onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
# })}
# Note: we use regex with \s* to ignore exact spacing
edit_bad_regex = r'\{\s*isAksesorisBagian\(bagian\.nama_bagian\)\s*\?\s*\(\s*materialGroup:\s*bahan\.material_group\s*\|\|\s*bagian\.material_group,\s*onChange:\s*\(value\)\s*=>\s*handleEditBahanChange\(bagianIndex,\s*bahanIndex,\s*"bahan_id",\s*value\),\s*\}\)\s*\}'

edit_good = '''{isAksesorisBagian(bagian.nama_bagian) ? (
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
                          })}'''

content = re.sub(edit_bad_regex, edit_good, content)

# Fix Create form
# Target:
# {isAksesorisBagian(bagian.nama_bagian)
# {isAksesorisBagian(bagian.nama_bagian) ? (
# ...
create_bad_regex = r'\{\s*isAksesorisBagian\(bagian\.nama_bagian\)\s*\{\s*isAksesorisBagian\(bagian\.nama_bagian\)\s*\?\s*\([\s\S]*?onChange:\s*\(value\)\s*=>\s*handleBahanChange\(bagianIndex,\s*bahanIndex,\s*"bahan_id",\s*value\),\s*\}\)\s*<\/>\s*\}'

create_good = '''{isAksesorisBagian(bagian.nama_bagian)
                                      ? renderAksesorisSelect({
                                          value: bahan.aksesoris_id,
                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),
                                        })
                                      : renderBahanSelect({
                                          value: bahan.bahan_id,
                                          materialGroup: bahan.material_group || bagian.material_group,
                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                                        })}'''

content = re.sub(create_bad_regex, create_good, content)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done with Python script!")

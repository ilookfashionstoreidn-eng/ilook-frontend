import sys

js_path = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js'

with open(js_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

create_start = -1
create_end = -1

for i, line in enumerate(lines):
    if '{isAksesorisBagian(bagian.nama_bagian)' in line and '{isAksesorisBagian(bagian.nama_bagian) ? (' in lines[i+1]:
        create_start = i
        for j in range(i, i+30):
            if ')}' in lines[j] and '<div className="spk-cutting-bahan-cell">' in lines[j+3]:
                create_end = j
                break
        break

if create_start != -1 and create_end != -1:
    good_create = [
        '                                    {isAksesorisBagian(bagian.nama_bagian)\n',
        '                                      ? renderAksesorisSelect({\n',
        '                                          value: bahan.aksesoris_id,\n',
        '                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),\n',
        '                                        })\n',
        '                                      : renderBahanSelect({\n',
        '                                          value: bahan.bahan_id,\n',
        '                                          materialGroup: bahan.material_group || bagian.material_group,\n',
        '                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),\n',
        '                                        })}\n'
    ]
    lines = lines[:create_start] + good_create + lines[create_end+1:]
    print("Fixed Create!")

with open(js_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

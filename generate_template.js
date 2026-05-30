const xlsx = require('xlsx'); 
const ws = xlsx.utils.aoa_to_sheet([['SKU Code', 'Nama Produk', 'Grup', 'Sumber', 'Warna', 'Size', 'LD', 'Pj Dress', 'Pj Celana', 'Pj Baju', 'Est Cut', 'Est Combi', 'Berat/Pjg', 'Satuan B/P', 'B/P Combi', 'Satuan B/P Combi', 'Bahan Utama', 'Warna Bahan Utama', 'Bahan Kombinasi', 'Warna Bahan Kombinasi', 'Aksesoris', 'Warna Aksesoris', 'Ongkos CMT', 'Potong', 'Catatan SPK']]); 
const wb = xlsx.utils.book_new(); 
xlsx.utils.book_append_sheet(wb, ws, 'Template'); 
xlsx.writeFile(wb, 'd:/WINDU/NEXT/ilook-frontend/public/Template_Product_List.xlsx');

/* Meklankan file Packing.js untuk memerpasalkan seri teksed di scan */
const fs = require('fs');
const path = require('path');
const file = path.resolve('src/components/Packing/Packing.js');
let s = fs.readFileSync(file, 'utf8');

s.s=s.replace(' const handleScanBarcode = (e) => {', ' const handleScanBarcode = async (e) => {');

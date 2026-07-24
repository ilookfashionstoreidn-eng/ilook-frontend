const fs = require('fs');
const filePath = 'src/components/Layout/Layout.js';
let content = fs.readFileSync(filePath, 'utf8');

const map = {
  'FaTimes': 'X',
  'FaBars': 'Menu',
  'FaHome': 'Home',
  'FaChartLine': 'TrendingUp',
  'FaClipboardCheck': 'ClipboardCheck',
  'FaChevronUp': 'ChevronUp',
  'FaChevronDown': 'ChevronDown',
  'FaCheckSquare': 'CheckSquare',
  'FaLayerGroup': 'Layers',
  'FaUser': 'User',
  'FaFileAlt': 'FileText',
  'FaBox': 'Package',
  'FaShoppingCart': 'ShoppingCart',
  'FaShoppingBag': 'ShoppingBag',
  'FaWarehouse': 'Warehouse',
  'FaBuilding': 'Building',
  'FaListUl': 'List',
  'FaUndo': 'Undo',
  'FaBarcode': 'Barcode',
  'FaHistory': 'History',
  'FaMoneyBillWave': 'Banknote',
  'FaCut': 'Scissors',
  'FaCreditCard': 'CreditCard',
  'FaTools': 'PenTool',
  'FaTshirt': 'Shirt',
  'FaCalendarAlt': 'Calendar',
  'FaBoxOpen': 'PackageOpen',
  'FaClock': 'Clock',
  'FaQrcode': 'QrCode',
  'FiAlertTriangle': 'AlertTriangle',
  'FaPrint': 'Printer',
  'FaKey': 'Key',
  'FaSignOutAlt': 'LogOut'
};

// Remove old imports safely without regex strings that cause issues
let lines = content.split('\n');
let newLines = [];
let skipMode = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('from "react-icons/fi"') || line.includes("from 'react-icons/fi'")) {
    skipMode = false;
    continue;
  }
  if (line.includes('from "react-icons/fa"') || line.includes("from 'react-icons/fa'")) {
    skipMode = false;
    continue;
  }
  if (line.trim() === 'import {' && lines[i+30] && lines[i+30].includes('react-icons')) {
    // it's a multi-line import block
    skipMode = true;
    continue;
  }
  if (skipMode && line.includes('} from "react-icons/')) {
    skipMode = false;
    continue;
  }
  if (!skipMode) {
    newLines.push(line);
  }
}

content = newLines.join('\n');

const allLucideIcons = Array.from(new Set(Object.values(map))).join(', ');
const importStmt = 'import { ' + allLucideIcons + ' } from "lucide-react";\n';

content = content.replace(/(import .* from ['"]react-router-dom['"];)/, "$1\n" + importStmt);

for (const [oldIcon, newIcon] of Object.entries(map)) {
  const regex = new RegExp('<' + oldIcon + '([^>]*)>', 'g');
  content = content.replace(regex, '<' + newIcon + '$1>');
}

fs.writeFileSync(filePath, content);
console.log('Successfully replaced icons in Layout.js');

const fs = require('fs');

const cssPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.css';
let cssContent = fs.readFileSync(cssPath, 'utf-8');

// Replace spk-cutting-bagian-section
cssContent = cssContent.replace(/\.spk-cutting-bagian-section\s*{[\s\S]*?}/, `.spk-cutting-bagian-section {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}`);

// Replace spk-cutting-bagian-line
cssContent = cssContent.replace(/\.spk-cutting-bagian-line\s*{[\s\S]*?}/, `.spk-cutting-bagian-line {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) minmax(130px, 1fr) minmax(100px, 0.7fr) 62px;
  gap: 16px;
  align-items: center;
  background-color: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
  margin-bottom: 12px;
}`);

// Add some extra nice styles for the new layout
cssContent += `
.spk-cutting-bagian-add-wrapper .spk-cutting-btn {
  background-color: #f1f5f9;
  color: #0f172a;
  border: 1px dashed #94a3b8;
}
.spk-cutting-bagian-add-wrapper .spk-cutting-btn:hover {
  background-color: #e2e8f0;
  border-color: #64748b;
}
`;

fs.writeFileSync(cssPath, cssContent);
console.log("Updated SpkCutting.css for Bagian layout!");

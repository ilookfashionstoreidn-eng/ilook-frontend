const fs = require('fs');

const jsPath = 'd:/Ilook-Project/ilook-frontend/src/components/Sample/SPKSample.js';
const cssPath = 'd:/Ilook-Project/ilook-frontend/src/components/Sample/SPKSample.css';

let jsCode = fs.readFileSync(jsPath, 'utf8');

if (!jsCode.includes('framer-motion')) {
    jsCode = jsCode.replace('import API from "../../api";', 'import API from "../../api";\nimport { motion, AnimatePresence } from "framer-motion";');
}

// Global Wrappers
jsCode = jsCode.replace('<div className="spk-sample-container">', '<div className="ts-page">\n      <div className="ts-shell">\n        <section className="ts-content">');
jsCode = jsCode.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\);\s*\};/m, 
`</div>
      )}
      </AnimatePresence>
        </motion.div>
        </main>
        </section>
      </div>
    </div>
  );
};`);

// Topbar
jsCode = jsCode.replace(/<div className="spk-sample-header">[\s\S]*?<div className="spk-sample-toolbar">[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<\/div>/m, 
`<header className="ts-topbar">
            <div className="ts-title-group">
              <div className="ts-brand-icon">
                <FiLayers size={24} color="#fff" />
              </div>
              <div className="ts-brand-text">
                 <h1>SPK Sample</h1>
                 <p>Manajemen dan monitoring progress SPK Sample</p>
              </div>
            </div>
            
            <div className="ts-actions">
              <div className="ts-search-bar">
                <FiSearch className="ts-search-icon-inside" />
                <input 
                  type="text" 
                  placeholder="Cari SPK sample..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </header>

          <main className="ts-main">
            <motion.div 
               className="ts-table-card"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="ts-table-header">
                <div>
                  <h3>Daftar SPK Sample</h3>
                  <p>Total data tersimpan: {filteredData.length} records</p>
                </div>
                <button className="ts-btn-primary" onClick={openAddModal}>
                   <FiPlus size={18} /> Tambah SPK
                </button>
              </div>`);

// Table styles
jsCode = jsCode.replace('<div className="spk-sample-table-wrap">', '<div className="ts-table-container">');
jsCode = jsCode.replace('<table className="spk-sample-table">', '<table className="ts-modern-table" style={{minWidth: "1250px"}}>');
jsCode = jsCode.replace('<th style={{ width: "60px" }}>NO</th>', '<th style={{ width: "80px", textAlign: "center" }}>No</th>');

// Map rows to motion.tr
jsCode = jsCode.replace(/filteredData\.map\(\(item, index\) => \(\s*<tr key=\{item\.id\}>/g, 
`filteredData.map((item, index) => (
  <motion.tr 
    key={item.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ delay: index * 0.05 }}
    layout
  >`);
jsCode = jsCode.replace(/<\/tr>\s*\)\)\s*\) : \(/g, '</motion.tr>\n              ))\n            ) : (');

// Formatting the index NO centered
jsCode = jsCode.replace(/<td><span className="spk-sample-muted">\{index \+ 1\}<\/span><\/td>/g, 
`<td className="text-muted font-mono" style={{ textAlign: "center" }}>{index + 1}</td>`);
jsCode = jsCode.replace(/<td><strong>\{item\.nama_sample \|\| "-"}<\/strong><\/td>/g, 
`<td className="font-semibold text-accent" style={{ paddingLeft: "24px" }}>{item.nama_sample || "-"}</td>`);

// Wrapper for modals
jsCode = jsCode.replace(/\{showForm && \(\s*<div className="spk-sample-modal-overlay">/g, 
`<AnimatePresence>
      {showForm && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFormModal}/>`);

jsCode = jsCode.replace(/<\/div>\s*<\/div>\s*\)\}\s*\{showDeleteModal && selectedItem && \(\s*<div className="spk-sample-modal-overlay">/g, 
`</motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDeleteModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDeleteModal}/>`);

jsCode = jsCode.replace(/<\/div>\s*<\/div>\s*\)\}\s*\{showDetailModal && selectedItem && \(\s*<div className="spk-sample-modal-overlay">/g, 
`</motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDetailModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDetailModal}/>`);

jsCode = jsCode.replace(/<\/div>\s*<\/div>\s*\)\}\s*\{showAssignModal && selectedItem && \(\s*<div className="spk-sample-modal-overlay">/g, 
`</motion.div>
        </div>
      )}
      </AnimatePresence>
      
      <AnimatePresence>
      {showAssignModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeAssignModal}/>`);

// Update modal content boxes
jsCode = jsCode.replace(/<div className="spk-sample-modal-content spk-sample-modal-pro">/g, 
`<motion.div 
              className="ts-modal-box" style={{ maxWidth: "980px" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >`);

jsCode = jsCode.replace(/<div className="spk-sample-modal-delete">/g, 
`<motion.div 
              className="ts-modal-box small-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >`);

jsCode = jsCode.replace(/<div className="spk-sample-modal-assign">/g, 
`<motion.div 
              className="ts-modal-box" style={{ maxWidth: "520px" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >`);

// Convert specific classNames inside Modals to match standard forms
jsCode = jsCode.replace(/className="spk-sample-modal-topbar"/g, 'className="ts-modal-top"');
jsCode = jsCode.replace(/className="spk-sample-modal-close"/g, 'className="close-btn"');
jsCode = jsCode.replace(/className="spk-sample-btn-primary/g, 'className="ts-btn-primary');
jsCode = jsCode.replace(/className="spk-sample-btn-secondary"/g, 'className="ts-btn-secondary"');
jsCode = jsCode.replace(/className="spk-sample-btn-danger"/g, 'className="ts-btn-danger"');

jsCode = jsCode.replace(/className="spk-sample-modal-delete-header"/g, 'className="ts-modal-top borderless center-header"');
jsCode = jsCode.replace(/className="spks-delete-icon-wrapper"/g, 'className="danger-icon-wrap"');
jsCode = jsCode.replace(/className="spks-delete-icon-large"/g, 'size={28}');
jsCode = jsCode.replace(/className="spks-modal-body-center"/g, 'className="ts-modal-form center-text pt-0"');
jsCode = jsCode.replace(/className="spks-form-actions-center"/g, 'className="ts-modal-bottom evenly"');
jsCode = jsCode.replace(/className="spks-delete-desc"/g, 'className="delete-desc"');
jsCode = jsCode.replace(/className="spk-sample-btn-block"/g, 'className="ts-btn-primary flex-1" style={{width: "100%", justifyContent: "center"}}');

jsCode = jsCode.replace(/<div className="spk-sample-action-group">/g, '<div className="actions-cell">');
jsCode = jsCode.replace(/className="spk-sample-btn-icon/g, 'className="action-btn');

fs.writeFileSync(jsPath, jsCode);


// Now generate CSS 
let baseCss = fs.readFileSync('d:/Ilook-Project/ilook-frontend/src/components/Sample/TukangSample.css', 'utf8');

// The SPK Sample has several custom classes. We will append them to the base css.
let extraCss = \`
/* --- SPKSample specific custom styles --- */

.spk-sample-form-pro {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 32px;
  padding: 32px;
}
@media (max-width: 900px) {
  .spk-sample-form-pro { grid-template-columns: 1fr; }
}

.spk-sample-form-main, .spk-sample-form-row-2 {
  display: grid;
  gap: 16px;
}
.spk-sample-form-row-2 {
  grid-template-columns: 1fr 1fr;
}

.spk-sample-form-side {
  border-left: 1px solid #f1f5f9;
  padding-left: 32px;
}
@media (max-width: 900px) {
  .spk-sample-form-side { border-left: none; padding-left: 0; }
}

.spk-sample-side-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  border: 1px dashed #cbd5e1;
}

.spk-sample-side-head {
  margin-bottom: 16px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spk-sample-photo-preview-large {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.spk-sample-photo-placeholder {
  aspect-ratio: 4/3;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
  gap: 8px;
  margin-bottom: 16px;
  padding: 20px;
}

.spk-sample-upload-btn-full {
  display: flex;
  width: 100%;
  justify-content: center;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: #4f46e5;
  font-weight: 600;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: 0.2s;
}
.spk-sample-upload-btn-full:hover {
  background: #eef2ff;
  border-color: #a5b4fc;
}
.spk-sample-upload-btn-full input {
  display: none;
}

/* Status Badges */
.spk-sample-status {
  display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: #e0e7ff; color: #3730a3;
}
.spk-sample-status.urgent {
  background: #fee2e2; color: #991b1b;
}

.spk-sample-badge-tahap {
  display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: #dcfce7; color: #166534;
}
.spk-sample-tahap-locked {
  display: flex; align-items: center; gap: 6px;
}
.spk-sample-lock-hint {
  font-size: 13px; opacity: 0.6; cursor: help;
}

/* Table Inline Selects */
.spk-sample-select-inline {
  padding: 6px 28px 6px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-family: inherit; font-size: 13px; font-weight: 500;
  color: #334155; background: #fff; cursor: pointer; outline: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
  transition: all 0.2s;
}
.spk-sample-select-inline:hover { border-color: #94a3b8; }
.spk-sample-select-inline:disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.6;}
.spk-sample-select-tahap {
  background-color: #f0fdf4; border-color: #86efac; color: #15803d;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2315803d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
}

.spk-sample-detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 32px;
}
.spk-sample-detail-card {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.spk-sample-d-row {
  display: flex; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
}
.spk-sample-d-row:last-child { border-bottom: none; }
.spk-sample-d-icon-wrap {
  width: 40px; height: 40px; border-radius: 10px; background: #f8fafc;
  display: flex; align-items: center; justify-content: center; color: #64748b;
  border: 1px solid #e2e8f0;
}
.spk-sample-d-content { display: flex; flex-direction: column; gap: 4px; }
.spk-sample-d-content span { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
.spk-sample-d-content p, .spk-sample-d-content strong { margin: 0; font-size: 14px; color: #1e293b; }

.spk-sample-detail-photo-wrapper {
  background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;
  height: calc(100% - 30px); min-height: 400px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.spk-sample-detail-photo-view { width: 100%; height: 100%; object-fit: cover; }

.spk-sample-form-group { display: flex; flex-direction: column; gap: 8px; }
.spk-sample-form-group label { font-size: 13px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 8px;}
.spk-sample-form-group input, .spk-sample-form-group select, .spk-sample-form-group textarea {
  padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 14px;
}
.spk-sample-form-group input:focus, .spk-sample-form-group select:focus, .spk-sample-form-group textarea:focus {
  outline: none; border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.spk-sample-form-actions-pro {
  display: flex; justify-content: flex-end; gap: 12px; padding: 20px 32px; border-top: 1px solid #f1f5f9; background: #fff;
  border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;
}

.spk-sample-tukang-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px;
  background: #f1f5f9; color: #334155; font-size: 13px; font-weight: 500; border: 1px solid #e2e8f0;
}
.spk-sample-unassigned { font-style: italic; color: #94a3b8; }
.spk-sample-photo { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; }

.spk-sample-assign-body { padding: 24px 32px; max-height: 400px; overflow-y: auto;}
.spk-sample-assign-list { display: flex; flex-direction: column; gap: 12px; }
.spk-sample-assign-card {
  display: flex; align-items: center; gap: 16px; padding: 16px; border: 1.5px solid #e2e8f0; border-radius: 12px;
  cursor: pointer; transition: 0.2s;
}
.spk-sample-assign-card:hover { border-color: #a5b4fc; background: #f8fafc; }
.spk-sample-assign-card.selected { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
.spk-sample-assign-card input { display: none; }
.spk-sample-assign-avatar { width: 44px; height: 44px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.spk-sample-assign-avatar.unassigned { background: #f1f5f9; color: #64748b; }
.spk-sample-assign-info { display: flex; flex-direction: column; gap: 4px; }
.spk-sample-assign-info strong { font-size: 15px; color: #1e293b; }
.spk-sample-assign-info span { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 6px;}

.spk-sample-empty { padding: 40px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 12px;}

.ts-modal-top { border-top-left-radius: 20px; border-top-right-radius: 20px; }
\`

fs.writeFileSync(cssPath, baseCss + extraCss);
console.log("Successfully prepared JS and CSS.");

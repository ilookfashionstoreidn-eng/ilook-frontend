const fs = require('fs');
let content = fs.readFileSync('src/components/Jahit/SpkCmt.js', 'utf8');

// 1. Add showPrintPreview state after showForm state
content = content.replace(
  'const [showForm, setShowForm] = useState(false);',
  'const [showForm, setShowForm] = useState(false);\n  const [showPrintPreview, setShowPrintPreview] = useState(false);'
);

// 2. Hide board when showForm is true
//    Change: <section className="spkcmt-board">
//    To:     {!showForm ? (<section className="spkcmt-board">
content = content.replace(
  '<section className="spkcmt-board">',
  '{!showForm ? (\n        <section className="spkcmt-board">'
);

// 3. Close the board conditional and open the form section
//    After </section> at end of board (line ~2547), add the else branch
//    Find the closing </section> that ends the board
//    It should be followed by {showChatPopup
content = content.replace(
  `          </section>\n      {showChatPopup && (`,
  `          </section>\n        ) : (\n          /* ═══════ INLINE FORM SECTION ═══════ */\n          <section className="spkcmt-form-section">\n            <div className="spkcmt-form-section-header">\n              <button type="button" className="spkcmt-btn" onClick={() => {\n                setShowForm(false);\n                setShowPrintPreview(false);\n                setNewSpk({\n                  source_type: "cutting",\n                  source_id: "",\n                  deadline: "",\n                  tanggal_ambil: "",\n                  id_penjahit: "",\n                  keterangan: "",\n                  catatan: "",\n                  markeran: "",\n                  aksesoris: [],\n                  handtag: "",\n                  merek: "",\n                  harga_barang_dasar: "",\n                  jenis_harga_barang: "per_pcs",\n                  harga_per_jasa: "",\n                  jenis_harga_jasa: "per_barang",\n                });\n                setPreviewData(null);\n              }}>\n                ← Kembali ke Tabel\n              </button>\n              <h2>{selectedSpk ? "Edit Data SPK CMT" : "Tambah Data SPK CMT"}</h2>\n            </div>\n\n            <div className="spkcmt-form-section-body" style={{ display: "flex", gap: "20px" }}>\n              {/* LEFT: Form */}\n              <div style={{ flex: 1, minWidth: 0 }}>\n`
);

// 4. Now remove the old modal overlay wrapper for the form
//    Replace the showForm modal block
//    From: {showForm && (\n        <div\n          className="spkcmt-modal-overlay"
//    We need to find it and replace the outer modal wrapper

// Find the old showForm modal block and replace opening/closing
// The old structure:
// {showForm && (
//   <div className="spkcmt-modal-overlay" onClick={...}>
//     <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
//       <div className="spkcmt-modal-header">
//         <h2>➕ Tambah Data SPK CMT</h2>
//         <button className="spkcmt-modal-close" ...>
//       </div>
//       <div className="spkcmt-modal-body">
//         <form ...>
//           ...form content...
//         </form>
//       </div>
//     </div>
//   </div>
// )}

// Replace the old modal opening
content = content.replace(
  `      {showForm && (\n        <div\n          className="spkcmt-modal-overlay"`,
  `      {false && /* OLD MODAL REMOVED - form is now inline */ (\n        <div\n          className="spkcmt-modal-overlay-DISABLED"`
);

console.log('Step 1-4 done');
fs.writeFileSync('src/components/Jahit/SpkCmt.js', content);
console.log('File saved');

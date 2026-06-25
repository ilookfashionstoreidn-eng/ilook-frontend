const fs = require('fs');
const file = 'd:/WINDU/NEXT/ilook-frontend/src/components/Jahit/Pengiriman.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject state variables
const stateVars = `
  const importInputRef = React.useRef(null);
  const [importStatus, setImportStatus] = useState({ loading: false, msg: "" });
`;
content = content.replace(/const userRole = localStorage\.getItem\("role"\);/, "const userRole = localStorage.getItem(\"role\");" + stateVars);

// 2. Inject handle functions
const handleFuncs = `
  const handleDownloadTemplate = async () => {
    try {
      const response = await API.get("/pengiriman/import/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "template_pengiriman.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Gagal mendownload template");
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus({ loading: true, msg: "Memproses import..." });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/pengiriman/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportStatus({ loading: false, msg: "" });
      alert(res.data.message + " Baris berhasil: " + res.data.processed);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setImportStatus({ loading: false, msg: "" });
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Gagal mengimport data";
      alert("Error Import: " + errorMsg);
    }
    
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };
`;
content = content.replace(/(useEffect\(\(\) => \{\s*const fetchPengirimans = async \(\) => \{)/, handleFuncs + "\n  $1");

// 3. Inject Button UI
const buttonUI = `
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              ref={importInputRef}
              onChange={handleFileImport}
            />
            {importStatus.loading ? (
              <span style={{ fontSize: "12px", color: "#666" }}>{importStatus.msg}</span>
            ) : null}
            <button
              type="button"
              className="ks-btn"
              onClick={handleDownloadTemplate}
              title="Download Template Excel"
            >
              Template
            </button>
            <button
              type="button"
              className="ks-btn"
              onClick={() => importInputRef.current?.click()}
            >
              Import Excel
            </button>
`;
content = content.replace(/(<button[\s\S]*?onClick=\{\(\) => setShowForm\(true\)\}[\s\S]*?>[\s\S]*?<\/button>)/, buttonUI + "\n            $1");

fs.writeFileSync(file, content);
console.log('Pengiriman.js patched successfully!');

import React, { useState } from "react";
import "./Blank2.css";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiBell, FiPlus, FiEdit2, FiTrash2, 
  FiMoreVertical, FiTruck, FiX, FiCheckCircle 
} from "react-icons/fi";

const initialShipments = [
  { id: "SH-2041", name: "Premium Electronics", route: "Jakarta - Surabaya", status: "Delivered", date: "26 Mar 2026" },
  { id: "SH-2042", name: "Medical Equipment", route: "Bandung - Semarang", status: "In Transit", date: "26 Mar 2026" },
  { id: "SH-2043", name: "Automotive Parts", route: "Jakarta - Bali", status: "Pending", date: "27 Mar 2026" },
  { id: "SH-2044", name: "Retail Cosmetics", route: "Medan - Jakarta", status: "In Transit", date: "25 Mar 2026" },
];

const Blank2 = () => {
  const [data, setData] = useState(initialShipments);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({ name: "", route: "", status: "Pending", date: "" });

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({ name: "", route: "", status: "Pending", date: "" });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = {
      id: `SH-${Math.floor(Math.random() * 1000 + 2000)}`,
      ...formData,
      date: formData.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    setData([newEntry, ...data]);
    handleCloseModal();
  };

  const badgeColor = (status) => {
    switch(status) {
      case "Delivered": return "badge-success";
      case "In Transit": return "badge-info";
      case "Pending": return "badge-warning";
      default: return "badge-neutral";
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="blank2-page">
      <div className="blank2-shell">
        <section className="blank2-content">
          <header className="blank2-topbar">
            <div className="blank2-title-group">
              <div className="brand-icon">
                <FiTruck size={24} color="#fff" />
              </div>
              <div className="brand-text">
                 <h1>Shipment Directory</h1>
                 <p>Manage all route operations and logistics data</p>
              </div>
            </div>
            
            <div className="blank2-actions">
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search shipment..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="icon-btn" aria-label="Notifications">
                <FiBell size={18} />
                <span className="badge">1</span>
              </button>
              <div className="blank2-avatar" />
            </div>
          </header>

          <main className="blank2-main">
            <motion.div 
               className="table-card"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="table-header">
                <div>
                  <h3>All Shipments</h3>
                  <p>Overview of current and past active shipments ({data.length} total)</p>
                </div>
                <button className="btn-primary" onClick={handleOpenModal}>
                   <FiPlus size={18} /> Add New Data
                </button>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Shipment ID</th>
                      <th>Content/Name</th>
                      <th>Route Path</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredData.map((row, index) => (
                        <motion.tr 
                          key={row.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          layout
                        >
                          <td className="font-semibold text-accent">{row.id}</td>
                          <td className="font-semibold">{row.name}</td>
                          <td className="text-muted">{row.route}</td>
                          <td>
                            <span className={`status-badge ${badgeColor(row.status)}`}>
                              <span className="status-dot-sm"></span> {row.status}
                            </span>
                          </td>
                          <td className="text-muted">{row.date}</td>
                          <td className="text-right actions-cell">
                             <button className="action-btn edit" title="Edit"><FiEdit2 /></button>
                             <button className="action-btn delete" title="Delete" onClick={() => setData(data.filter(d => d.id !== row.id))}><FiTrash2 /></button>
                             <button className="action-btn more"><FiMoreVertical /></button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredData.length === 0 && (
                      <tr className="empty-row">
                        <td colSpan="6" className="empty-state">
                           No shipments found matching "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </main>
        </section>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            />
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="modal-header">
                <div>
                  <h2>Add New Shipment</h2>
                  <p>Enter the details for the new logistics operation</p>
                </div>
                <button type="button" className="close-btn" onClick={handleCloseModal}><FiX size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                  <label>Content / Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    placeholder="e.g. Premium Electronics" 
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Route Path</label>
                  <input 
                    type="text" 
                    name="route" 
                    required 
                    placeholder="e.g. Jakarta - Surabaya"
                    value={formData.route}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="Pending">Pending</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Schedule Date</label>
                    <input 
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn-primary">
                    <FiCheckCircle size={18} /> Save Shipment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Blank2;

import React, { useState } from "react";
import "./Blank.css";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiBell, FiChevronDown, FiBox, 
  FiClock, FiCheckCircle, FiTruck, FiMapPin, FiBarChart2 
} from "react-icons/fi";

const Blank = () => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [status, setStatus] = useState("In Transit");

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } }
  };

  return (
    <div className="blank-page">
      <div className="blank-shell">
        <section className="blank-content">
          <header className="blank-topbar">
            <div className="blank-title-group">
              <div className="brand-icon">
                <FiTruck size={24} color="#fff" />
              </div>
              <div className="brand-text">
                 <h1>Drivergo Logistics</h1>
                 <p>Shipment Track</p>
              </div>
              
              <div className="status-dropdown">
                <button 
                  className="status-btn"
                  onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                >
                  <span className={`status-dot ${status.replace(" ", "").toLowerCase()}`}></span>
                  {status}
                  <FiChevronDown 
                     className="chevron" 
                     style={{ transform: statusMenuOpen ? 'rotate(180deg)' : 'rotate(0)' }} 
                  />
                </button>
                
                <AnimatePresence>
                  {statusMenuOpen && (
                    <motion.div 
                      className="status-menu"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {['In Transit', 'Delivered', 'Pending'].map((st) => (
                        <div 
                          key={st} 
                          className="status-option"
                          onClick={() => { setStatus(st); setStatusMenuOpen(false); }}
                        >
                           <span className={`status-dot ${st.replace(" ", "").toLowerCase()}`}></span>
                           {st}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="blank-actions">
              <button className="icon-btn" aria-label="Search"><FiSearch size={18} /></button>
              <button className="icon-btn" aria-label="Notifications">
                <FiBell size={18} />
                <span className="badge">3</span>
              </button>
              <div className="blank-avatar" />
            </div>
          </header>

          <motion.main 
            className="blank-grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section variants={itemVariants} className="blank-card">
              <div className="card-header">
                <div className="icon-wrap bg-blue"><FiBox size={20}/></div>
                <h4>This Month Orders</h4>
              </div>
              <div className="dummy-chart-bars" />
            </motion.section>

            <motion.section variants={itemVariants} className="blank-card">
              <div className="card-header">
                <div className="icon-wrap bg-green"><FiCheckCircle size={20}/></div>
                <h4>Shipment Success</h4>
              </div>
              <div className="score-wrap">
                <div className="dummy-score">94.8%</div>
                <span className="trend positive">+2.4%</span>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="blank-card">
              <div className="card-header">
                <div className="icon-wrap bg-purple"><FiBarChart2 size={20}/></div>
                <h4>Fleet Capacity</h4>
              </div>
              <div className="dummy-chart-bars small" />
            </motion.section>

             <motion.section variants={itemVariants} className="blank-card caller-card">
              <h4>Caller Contact</h4>
              <div className="caller-info">
                 <div className="caller-avatar">DS</div>
                 <div>
                   <p className="caller-name">Darrell Steward</p>
                   <p className="caller-role">Dispatch Manager</p>
                 </div>
              </div>
            </motion.section>
            
            <motion.section variants={itemVariants} className="blank-card">
              <h4>Tracking Details</h4>
              <p className="tracking-number">TRK-12939-123</p>
              <div className="tracking-path">
                 <div className="point active"></div>
                 <div className="line"></div>
                 <div className="point"></div>
                 <div className="line half"></div>
                 <div className="point pending"></div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="blank-card tall feature-card">
              <h4>Freight Live View</h4>
              <div className="truck-box">
                <FiTruck size={48} className="placeholder-icon" />
                <span>3D Freight Preview</span>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="blank-card large map-card">
              <div className="card-header-overlay">
                <h4>Live Route Map</h4>
                <button className="map-btn"><FiMapPin size={16} /> Center</button>
              </div>
              <div className="map-box">
                 <div className="map-glow"></div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="blank-card metrics-card">
              <h4>Package Weight</h4>
              <div className="score-wrap bottom">
                 <div className="dummy-score">41.18<span className="unit">kg</span></div>
                 <p className="subtitle">Avg variance: -0.2kg</p>
              </div>
            </motion.section>
          </motion.main>
        </section>
      </div>
    </div>
  );
};

export default Blank;

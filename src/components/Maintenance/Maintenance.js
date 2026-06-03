import React from 'react';
import './Maintenance.css';
import { FaWrench, FaHardHat, FaCog } from 'react-icons/fa';

const Maintenance = () => {
  return (
    <div className="maintenance-container">
      <div className="maintenance-background">
        <div className="maintenance-shape maintenance-shape-1"></div>
        <div className="maintenance-shape maintenance-shape-2"></div>
        <div className="maintenance-shape maintenance-shape-3"></div>
      </div>
      
      <div className="maintenance-card">
        <div className="maintenance-icon-wrapper">
          <FaCog className="maintenance-gear maintenance-gear-main" />
          <FaCog className="maintenance-gear maintenance-gear-small" />
        </div>
        
        <h1 className="maintenance-title">We'll be back soon!</h1>
        
        <div className="maintenance-divider"></div>
        
        <p className="maintenance-description">
          Maaf, sistem kami sedang dalam <strong>pemeliharaan rutin</strong> untuk meningkatkan performa dan stabilitas.
          <br /><br />
          Kami sedang bekerja keras untuk segera kembali online. Silakan coba beberapa saat lagi.
        </p>
        
        <div className="maintenance-footer">
          <FaHardHat className="maintenance-footer-icon" />
          <span>Tim Teknis Ilook Fashion Store</span>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;

import React, { useState } from 'react';

const getThumbnailUrl = (url) => {
  if (!url) return url;
  
  // Shopee
  if (url.includes('cf.shopee') && !url.includes('_tn') && !url.includes('.')) {
    return url + '_tn';
  }
  
  // TikTok (ibyteimg) - biasanya origin bisa diganti resize, 
  // tapi kalau belum yakin pola resizenya, sementara return original
  // Atau jika ada pola yang konsisten, bisa ditambahkan di sini.
  
  return url;
};

const SkuHover = ({ img, name, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!img) {
    return <span style={{ color: "#cbd5e1" }}>{label || "No Image"}</span>;
  }

  const thumbImg = getThumbnailUrl(img);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)} 
        style={{ cursor: 'pointer', display: 'inline-block' }}
        title="Klik untuk memperbesar"
      >
        <img 
          src={thumbImg} 
          alt={name} 
          loading="lazy" 
          style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} 
        />
        {label && <span style={{ marginLeft: "8px" }}>{label}</span>}
      </div>

      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>{name}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>
            <img 
              src={img} 
              alt={name} 
              loading="lazy"
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px' }} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SkuHover;

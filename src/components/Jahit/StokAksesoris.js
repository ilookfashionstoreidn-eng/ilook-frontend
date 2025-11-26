import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 
import Barcode from "react-barcode";
import { QRCodeCanvas } from 'qrcode.react';
import { QRCodeSVG } from 'qrcode.react';

export const StokAksesoris = () => {
     const [stok, setStok] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error,setError] = useState(null);


useEffect(() => {
    const fetchStok = async () => {
        try {
            setLoading(true);
            const response = await API.get('/stok-aksesoris');
            setStok(response.data);
        }catch (error){
            setError("Gagal mengambil data");
        }finally{
            setLoading(false);
        }
    }
    fetchStok();
}, []);   


  return (
    <div>
    <div className="penjahit-container">
      <h1>Data Aksesoris</h1>
    </div>

    <div className="table-container">
        <div className="filter-header1">
       
        <div className="search-bar1">
          <input
            type="text"
            placeholder="Cari nama aksesoris..."
           
          />
        </div>
      </div>
      
        <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>Id Pembelian B</th>
              <th>Aksesoris </th>
           
              <th>Barcode</th>
              <th>Barcode Batang</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stok.map((stok) => (
              <tr key={stok.id}>
                <td data-label="Nama Aksesoris : ">{stok.pembelian_aksesoris_b_id}</td>
                <td data-label="Jenis Produk : ">{stok.aksesoris_id}</td>
                <td data-label="Jenis Produk : ">{stok.barcode}</td>

                <td data-label="Barcode : " style={{ textAlign: "center", verticalAlign: "middle" }}>
                <Barcode value={stok.barcode} width={2} height={50} displayValue={false} />
              </td>
            


                <td data-label="Satuan : ">{stok.status}</td>

              </tr>
            ))}
          </tbody>
        </table>
        </div>
 </div>




   
</div>   
)
}
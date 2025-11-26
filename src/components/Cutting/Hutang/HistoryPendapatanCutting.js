import React, { useEffect, useState } from "react";
import "../../Jahit/Penjahit.css";
import API from "../../../api"; 

const HistoryPendapatanCutting = () => {
 const [pendapatansCutting, setPendapatansCutting] = useState([]);
 const [loading, setLoading]= useState([]);
 const [error, setError]= useState([]);



 useEffect(() => {
  const fetchPendapatansCutting = async () => {
    try {
      setLoading(true);
      const response = await API.get('/pendapatan/cutting');
      console.log("Pendapatans Cutting:", response.data);
      setPendapatansCutting(response.data); // ✅ Perbaikan di sini
    } catch (error){
      setError("Gagal mengambil data pendapatan")
    } finally {
      setLoading(false);
    }
  };

  fetchPendapatansCutting();
}, []);




return (
      <div>
      <div className="penjahit-container">
        <h1>Data Pendapatan </h1>
      </div>
  
      <div className="table-container">
          
          <div className="table-container">
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>ID Pendapatan</th>
                <th>Nama Tukang Cutting</th>
                <th>Total Pendapatan</th>
                <th>Total Hutang</th>
                <th>Total Cashboan</th>
                <th>Total Transfer</th>
                <th> Tanggal Dibuat</th>
                
               
              </tr>
            </thead>
            <tbody>  
            {pendapatansCutting.map((pendapatan)=> (
                <tr key={pendapatan.id}>
                  <td data-label="Id Pendapatan: ">{pendapatan.id}</td>
                    <td>{pendapatan.tukang_cutting?.nama_tukang_cutting}</td>
                  <td data-label="Total Pendapatan: ">{pendapatan.total_pendapatan}</td>
                    <td data-label="Total Pendapatan: ">{pendapatan.total_hutang}</td>
                      <td data-label="Total Pendapatan: ">{pendapatan.total_cashbon}</td>
                  <td data-label="total transfer: ">{pendapatan.total_transfer}</td>
                    <td data-label="htanggal : ">
                      {new Date(pendapatan.created_at).toLocaleDateString("id-ID")}
                    </td>

                </tr>
              ))}
              
            </tbody>
          </table>
          </div>
  
  
  
          </div>
          </div>
         
    )
  }
export default HistoryPendapatanCutting
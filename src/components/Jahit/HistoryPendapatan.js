import React, { useEffect, useState } from "react";
import "./Penjahit";
import API from "../../api"

const HistoryPendapatan = () => {
 const [pendapatans, setPendapatans] = useState([]);
 const [penjahits, setPenjahits] =  useState([]);
// const [penjahitList, setPenjahitList] = useState([]);
 const [loading, setLoading]= useState([]);
 const [error, setError]= useState([]);

    
  useEffect(() => {
    const fetchPendapatans = async () => {
      try {
        setLoading(true);
        const response = await API.get('/pendapatan',{
        });
        setPendapatans(response.data.data);
      } catch (error){
        setError("Gagal mengambil data pendapatan")
      } finally {
        setLoading(false);
      }
    };
  
    fetchPendapatans();
  }, []);

  useEffect(()=> {
    const fetchPenjahits = async () => {
        try {
            setLoading(true);
            const response = await API.get('/penjahit', {   
            });
            setPenjahits(response.data);
        }catch (error){
            setError("gagal mengambil data penjahit")
        }finally{
            setLoading(false);
        }
    };
    fetchPenjahits();
},[]);

  
  
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
                <th>Nama Penjahit</th>
                <th>Total Pendapatan</th>
                <th>Total Transfer</th>
               
              </tr>
            </thead>
            <tbody>  
            {pendapatans.map((pendapatan)=> (
                <tr key={pendapatan.id_pendapatan}>
                  <td data-label="Id Pendapatan: ">{pendapatan.id_pendapatan}</td>
                  <td data-label="Nama Penjahit : ">
                    {penjahits.find(penjahit =>penjahit.id_penjahit === pendapatan.id_penjahit)?.nama_penjahit}</td>
                 
                  <td data-label="Total Pendapatan: ">{pendapatan.total_pendapatan}</td>
                  <td data-label="total transfer: ">{pendapatan.total_transfer}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
  
  
  
          </div>
          </div>
         
    )
  }

export default HistoryPendapatan
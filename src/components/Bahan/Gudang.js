import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle, FaPlus, FaEdit, } from 'react-icons/fa';


const Gudang = () => {
  const [gudangs, setGudangs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  return (
    <div>Gudang</div>
  )
}

export default Gudang
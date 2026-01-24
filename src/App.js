import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Pusher from "pusher-js";
import { ToastContainer, toast } from "react-toastify";
import Login from "./components/Login/Login";
import Home from "./components/Home/Home";
import Penjahit from "./components/Jahit/Penjahit";
import Spk from "./components/Jahit/Spk";
import Layout from "./components/Layout/Layout";
import SpkCmt from "./components/Jahit/SpkCmt";
import Pengiriman from "./components/Jahit/Pengiriman";
import Hutang from "./components/Jahit/Hutang";
import Cashbon from "./components/Jahit/Cashbon";
import Pendapatan from "./components/Jahit/Pendapatan";
import Deadline from "./components/Jahit/Deadline";
import Status from "./components/Jahit/Status";
import Kinerja from "./components/Jahit/Kinerja";
import Kinerja2 from "./components/Jahit/Kinerja2";
import DataDikerjakanPengirimanCmt from "./components/Jahit/DataDikerjakanPengirimanCmt";
import Produk from "./components/Jahit/Produk";
import KodeSeriBelumDikerjakan from "./components/Jahit/KodeSeriBelumDikerjakan";

import HistoryPendapatan from "./components/Jahit/HistoryPendapatan";
import Aksesoris from "./components/Jahit/Aksesoris";
import PembelianAksesoris from "./components/Jahit/PembelianAksesoris";
import PembelianBAksesoris from "./components/Jahit/PembelianBAksesoris";
import { StokAksesoris } from "./components/Jahit/StokAksesoris";
import PesananPetugasC from "./components/Jahit/PesananPetugasC";
import PesananPetugasD from "./components/Jahit/PesananPetugasD";
import TukangCutting from "./components/Cutting/TukangCutting/TukangCutting";
import TukangPola from "./components/Cutting/TukangPola/TukangPola";
import SpkCutting from "./components/Cutting/SpkCutting/SpkCutting";
import HasilCutting from "./components/Cutting/SpkCutting/HasilCutting";
import HistoryHasilCutting from "./components/Cutting/SpkCutting/HistoryHasilCutting";
import SpkDistribusiHistory from "./components/Cutting/SpkCutting/SpkDistribusiHistory";
import HutangCutting from "./components/Cutting/Hutang/HutangCutting";
import CashboanCutting from "./components/Cutting/Hutang/CashboanCutting";
import PendapatanCutting from "./components/Cutting/Hutang/PendapatanCutting";
import HistoryPendapatanCutting from "./components/Cutting/Hutang/HistoryPendapatanCutting";
import MarkeranProduk from "./components/Cutting/SpkCutting/MarkeranProduk";
import TukangJasa from "./components/Jasa/TukangJasa";
import SpkJasa from "./components/Jasa/SpkJasa";
import HasilJasa from "./components/Jasa/HasilJasa";
import CashboanJasa from "./components/Jasa/CashboanJasa";
import HutangJasa from "./components/Jasa/HutangJasa";
import PendapatanJasa from "./components/Jasa/PendapatanJasa";
import HistoryPendapatanJasa from "./components/Jasa/HistoryPendapatanJasa";
import HppProduk from "./components/Produk/HppProduk";
import Packing from "./components/Packing/Packing";
import Logs from "./components/Packing/Logs";
import Bahan from "./components/Bahan/Bahan";
import PembelianBahan from "./components/Bahan/PembelianBahan";
import Pabrik from "./components/Bahan/Pabrik";
import Gudang from "./components/Bahan/Gudang";
import Seri from "./components/Packing/Seri";
import StokPerBahan from "./components/Bahan/StokPerBahan";
import ScanBahan from "./components/Bahan/ScanBahan";
import ScanStokBahanKeluar from "./components/Bahan/ScanStokBahanKeluar";
import RiwayatStokBahanKeluar from "./components/Bahan/RiwayatStokBahanKeluar";
import SpkBahan from "./components/Bahan/SpkBahan";
import RefundBahan from "./components/Bahan/RefundBahan";
import PendapatanPabrik from "./components/Bahan/PendapatanPabrik";
import HistoryPendapatanPabrik from "./components/Bahan/HistoryPendapatanPabrik";
import LaporanHasil from "./components/Cutting/SpkCutting/LaporanHasil";
import LaporanDailyProduksi from "./components/Cutting/SpkCutting/LaporanDailyProduksi";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Rute tanpa sidebar */}
        <Route path="/" element={<Login />} />

        {/* Rute dengan Layout (sidebar) */}
        <Route path="/" element={<Layout />}>
          <Route path="home" element={<Home />} />
          <Route path="penjahit" element={<Penjahit />} />
          <Route path="kode-seri-belum-dikerjakan" element={<KodeSeriBelumDikerjakan />} />
          <Route path="spk" element={<Spk />} />
          <Route path="spkcmt" element={<SpkCmt />} />
          <Route path="pengiriman" element={<Pengiriman />} />
          <Route path="hutang" element={<Hutang />} />
          <Route path="cashbon" element={<Cashbon />} />
          <Route path="pendapatan" element={<Pendapatan />} />
          <Route path="deadline" element={<Deadline />} />
          <Route path="status" element={<Status />} />
          <Route path="kinerja" element={<Kinerja />} />
          <Route path="kinerja2" element={<Kinerja2 />} />
          <Route path="data-dikerjakan-pengiriman-cmt" element={<DataDikerjakanPengirimanCmt />} />
          <Route path="/kinerja/:kategori" element={<Kinerja />} />
          <Route path="produk" element={<Produk />} />
          <Route path="historyPendapatan" element={<HistoryPendapatan />} />
          <Route path="aksesoris" element={<Aksesoris />} />
          <Route path="pembelianA" element={<PembelianAksesoris />} />
          <Route path="pembelianB" element={<PembelianBAksesoris />} />
          <Route path="stok-aksesoris" element={<StokAksesoris />} />
          <Route path="petugas-c" element={<PesananPetugasC />} />
          <Route path="petugas-d" element={<PesananPetugasD />} />
          <Route path="tukangCutting" element={<TukangCutting />} />
          <Route path="tukangPola" element={<TukangPola />} />
          <Route path="spkcutting" element={<SpkCutting />} />
          <Route path="hasilcutting" element={<HasilCutting />} />
          <Route path="historyhasilcutting" element={<HistoryHasilCutting />} />
          <Route path="historydistribusispk" element={<SpkDistribusiHistory />} />
          <Route path="hutangc" element={<HutangCutting />} />
          <Route path="cashboanc" element={<CashboanCutting />} />
          <Route path="pendapatancutting" element={<PendapatanCutting />} />
          <Route path="pendapatanhistory" element={<HistoryPendapatanCutting />} />
          <Route path="markeran" element={<MarkeranProduk />} />
          <Route path="tukangJasa" element={<TukangJasa />} />
          <Route path="spkjasa" element={<SpkJasa />} />
          <Route path="hasiljasa" element={<HasilJasa />} />
          <Route path="cashboanjasa" element={<CashboanJasa />} />
          <Route path="hutangjasa" element={<HutangJasa />} />
          <Route path="pendapatanjasa" element={<PendapatanJasa />} />
          <Route path="pendapatanhistoryjasa" element={<HistoryPendapatanJasa />} />
          <Route path="hppProduk" element={<HppProduk />} />
          <Route path="packing" element={<Packing />} />
          <Route path="logs" element={<Logs />} />
          <Route path="bahan" element={<Bahan />} />
          <Route path="pembelianBahan" element={<PembelianBahan />} />
          <Route path="pabrik" element={<Pabrik />} />
          <Route path="gudang" element={<Gudang />} />
          <Route path="scan-bahan" element={<ScanBahan />} />
          <Route path="stok-per-bahan" element={<StokPerBahan />} />
          <Route path="scan-stok-bahan-keluar" element={<ScanStokBahanKeluar />} />
          <Route path="riwayat-stok-bahan-keluar" element={<RiwayatStokBahanKeluar />} />
          <Route path="spk-bahan" element={<SpkBahan />} />
          <Route path="refund-bahan" element={<RefundBahan />} />
          <Route path="pendapatan-pabrik" element={<PendapatanPabrik />} />
          <Route path="history-pendapatan-pabrik" element={<HistoryPendapatanPabrik />} />
          <Route path="seri" element={<Seri />} />
          <Route path="laporanhasil" element={<LaporanHasil />} />
          <Route path="laporan-daily-produksi" element={<LaporanDailyProduksi />} />

        </Route>
      </Routes>
    </Router>
  );
};

export default App;

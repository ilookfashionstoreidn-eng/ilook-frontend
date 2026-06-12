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
import DashboardCmt from "./components/Jahit/DashboardCmt";
import DataDikerjakanPengirimanCmt from "./components/Jahit/DataDikerjakanPengirimanCmt";
import Produk from "./components/Jahit/Produk";
import KodeSeriBelumDikerjakan from "./components/Jahit/KodeSeriBelumDikerjakanPage";

import HistoryPendapatan from "./components/Jahit/HistoryPendapatan";
import Aksesoris from "./components/Jahit/Aksesoris";
import ResetStokAksesoris from "./components/Jahit/ResetStokAksesoris";
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
import ProductList from "./components/Produk/ProductList";
import Packing from "./components/Packing/Packing";
import PackingAccessGate from "./components/Packing/PackingAccessGate";
import PackingBelumBarcode from "./components/Packing/PackingBelumBarcode";
import PackingRandom from "./components/Packing/PackingRandom";
import PackingPendingan from "./components/Packing/PackingPendingan";
import PackingNoDataGinee from "./components/Packing/PackingNoDataGinee";
import PackingPasswordPage from "./components/Packing/PackingPasswordPage";
import PackingInject from "./components/Packing/PackingInject";
import Logs from "./components/Packing/LogsPage";
import ReturnPage from "./components/Packing/Return";
import ReturnLogs from "./components/Packing/ReturnLogs";
import Bahan from "./components/Bahan/Bahan";
import BahanList from "./components/Bahan/BahanList";
import PembelianBahan from "./components/Bahan/PembelianBahan";
import StokOpnameBahan from "./components/Bahan/StokOpnameBahan";
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
import LaporanDataAcuan from "./components/Cutting/SpkCutting/LaporanDataAcuan";
import Sku from "./components/Jahit/Sku";
import HistoryProdukMasukGudang from "./components/Bahan/HistoryProdukMasukGudang";
import HistoryOutCheckGudang from "./components/Bahan/HistoryOutCheckGudang";
import PickingQueue from "./components/Bahan/PickingQueue";
import MasterGudangProduk from "./components/Bahan/MasterGudangProduk";
import InputSkuGudang from "./components/Bahan/InputSkuGudang";
import ScanProdukMasukGudang from "./components/Bahan/ScanProdukMasukGudang";
import StokAwalGudangProduk from "./components/Bahan/StokAwalGudangProduk";
import StokLokasiGudang from "./components/Bahan/StokLokasiGudang";
import ListStokProductGudang from "./components/Bahan/ListStokProductGudang";
import MutasiGudangProduk from "./components/Bahan/MutasiGudangProduk";
import HistoryProdukGudang from "./components/Bahan/HistoryProdukGudang";
import HistoryMutasiGudang from "./components/Bahan/HistoryMutasiGudang";
import StokOpnameGudang from "./components/Bahan/StokOpnameGudang";
import HistoryStokAwalGudang from "./components/Bahan/HistoryStokAwalGudang";
import DashboardCutting from "./components/Cutting/SpkCutting/DashboardCutting";
import DashboardJasa from "./components/Jasa/DashboardJasa";
import QCLolos from "./components/QC/QCLolos";
import QCReject from "./components/QC/QCReject";
import TukangSample from "./components/Sample/TukangSample";
import SPKSample from "./components/Sample/SPKSample";
import SummarySPKSample from "./components/Sample/SummarySPKSample";
import Blank from "./components/Blank/Blank";
import Blank2 from "./components/Blank2/Blank2";
import OrderMonitor from "./components/Order/OrderMonitor";
import Maintenance from "./components/Maintenance/Maintenance";
import MenuProtectedRoute from "./components/UserManagement/MenuProtectedRoute";
import UserManagement from "./components/UserManagement/UserManagement";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Rute tanpa sidebar */}
        <Route path="/" element={<Login />} />
        <Route path="/maintenance" element={<Maintenance />} />

        {/* Rute dengan Layout (sidebar) */}
        <Route path="/" element={<Layout />}>
          {/* User Management (Only Superadmin) */}
          <Route path="user-management" element={<MenuProtectedRoute menuKey="user-management"><UserManagement /></MenuProtectedRoute>} />

          {/* Dashboard */}
          <Route element={<MenuProtectedRoute menuKey="dashboard" />}>
            <Route path="home" element={<Home />} />
          </Route>

          {/* Laporan Daily Produksi */}
          <Route element={<MenuProtectedRoute menuKey="laporan_daily_produksi" />}>
            <Route path="laporan-daily-produksi" element={<LaporanDailyProduksi />} />
          </Route>

          {/* CMT Group */}
          <Route element={<MenuProtectedRoute menuKey="cmt" />}>
            <Route path="penjahit" element={<MenuProtectedRoute menuKey="cmt:penjahit"><Penjahit /></MenuProtectedRoute>} />
            <Route path="kode-seri-belum-dikerjakan" element={<MenuProtectedRoute menuKey="cmt:pekerjaan_tersedia"><KodeSeriBelumDikerjakan /></MenuProtectedRoute>} />
            <Route path="spk" element={<MenuProtectedRoute menuKey="cmt:spk"><Spk /></MenuProtectedRoute>} />
            <Route path="dashboard-cmt" element={<MenuProtectedRoute menuKey="cmt:dashboard"><DashboardCmt /></MenuProtectedRoute>} />
            <Route path="spkcmt" element={<MenuProtectedRoute menuKey="cmt:spk"><SpkCmt /></MenuProtectedRoute>} />
            <Route path="pengiriman" element={<MenuProtectedRoute menuKey="cmt:pengiriman"><Pengiriman /></MenuProtectedRoute>} />
            <Route path="hutang" element={<MenuProtectedRoute menuKey="cmt:hutang"><Hutang /></MenuProtectedRoute>} />
            <Route path="cashbon" element={<MenuProtectedRoute menuKey="cmt:cashbon"><Cashbon /></MenuProtectedRoute>} />
            <Route path="pendapatan" element={<MenuProtectedRoute menuKey="cmt:pendapatan"><Pendapatan /></MenuProtectedRoute>} />
            <Route path="deadline" element={<MenuProtectedRoute menuKey="cmt:deadline"><Deadline /></MenuProtectedRoute>} />
            <Route path="status" element={<MenuProtectedRoute menuKey="cmt:status"><Status /></MenuProtectedRoute>} />
            <Route path="kinerja" element={<Kinerja />} />
            <Route path="kinerja2" element={<Kinerja2 />} />
            <Route path="data-dikerjakan-pengiriman-cmt" element={<MenuProtectedRoute menuKey="cmt:data_dikerjakan"><DataDikerjakanPengirimanCmt /></MenuProtectedRoute>} />
            <Route path="/kinerja/:kategori" element={<Kinerja />} />
            <Route path="produk" element={<Produk />} />
            <Route path="historyPendapatan" element={<MenuProtectedRoute menuKey="cmt:history_pendapatan"><HistoryPendapatan /></MenuProtectedRoute>} />
            <Route path="sku" element={<MenuProtectedRoute menuKey="cmt:sku"><Sku /></MenuProtectedRoute>} />
          </Route>

          {/* Aksesoris Group */}
          <Route element={<MenuProtectedRoute menuKey="aksesoris" />}>
            <Route path="aksesoris" element={<MenuProtectedRoute menuKey="aksesoris:data"><Aksesoris /></MenuProtectedRoute>} />
            <Route path="resetstok" element={<ResetStokAksesoris />} />
            <Route path="pembelianA" element={<MenuProtectedRoute menuKey="aksesoris:pembelian_toko"><PembelianAksesoris /></MenuProtectedRoute>} />
            <Route path="pembelianB" element={<PembelianBAksesoris />} />
            <Route path="stok-aksesoris" element={<StokAksesoris />} />
            <Route path="petugas-c" element={<MenuProtectedRoute menuKey="aksesoris:pembelian_cmt"><PesananPetugasC /></MenuProtectedRoute>} />
            <Route path="petugas-d" element={<PesananPetugasD />} />
          </Route>

          {/* Cutting Group */}
          <Route element={<MenuProtectedRoute menuKey="cutting" />}>
            <Route path="dashboardCutting" element={<MenuProtectedRoute menuKey="cutting:dashboard"><DashboardCutting /></MenuProtectedRoute>} />
            <Route path="tukangCutting" element={<MenuProtectedRoute menuKey="cutting:tukang"><TukangCutting /></MenuProtectedRoute>} />
            <Route path="tukangPola" element={<MenuProtectedRoute menuKey="cutting:pola"><TukangPola /></MenuProtectedRoute>} />
            <Route path="spkcutting" element={<MenuProtectedRoute menuKey="cutting:spk"><SpkCutting /></MenuProtectedRoute>} />
            <Route path="hasilcutting" element={<MenuProtectedRoute menuKey="cutting:hasil"><HasilCutting /></MenuProtectedRoute>} />
            <Route path="historyhasilcutting" element={<MenuProtectedRoute menuKey="cutting:history_hasil"><HistoryHasilCutting /></MenuProtectedRoute>} />
            <Route path="historydistribusispk" element={<MenuProtectedRoute menuKey="cutting:history_distribusi"><SpkDistribusiHistory /></MenuProtectedRoute>} />
            <Route path="hutangc" element={<MenuProtectedRoute menuKey="cutting:hutang"><HutangCutting /></MenuProtectedRoute>} />
            <Route path="cashboanc" element={<MenuProtectedRoute menuKey="cutting:cashbon"><CashboanCutting /></MenuProtectedRoute>} />
            <Route path="pendapatancutting" element={<MenuProtectedRoute menuKey="cutting:piutang"><PendapatanCutting /></MenuProtectedRoute>} />
            <Route path="pendapatanhistory" element={<MenuProtectedRoute menuKey="cutting:history_pembayaran"><HistoryPendapatanCutting /></MenuProtectedRoute>} />
            <Route path="markeran" element={<MenuProtectedRoute menuKey="cutting:marker"><MarkeranProduk /></MenuProtectedRoute>} />
            <Route path="laporanhasil" element={<MenuProtectedRoute menuKey="cutting:laporan"><LaporanHasil /></MenuProtectedRoute>} />
            <Route path="laporan-data-acuan" element={<MenuProtectedRoute menuKey="cutting:acuan"><LaporanDataAcuan /></MenuProtectedRoute>} />
          </Route>

          {/* Jasa Group */}
          <Route element={<MenuProtectedRoute menuKey="jasa" />}>
            <Route path="dashboard-jasa" element={<MenuProtectedRoute menuKey="jasa:dashboard"><DashboardJasa /></MenuProtectedRoute>} />
            <Route path="tukangJasa" element={<MenuProtectedRoute menuKey="jasa:tukang"><TukangJasa /></MenuProtectedRoute>} />
            <Route path="spkjasa" element={<MenuProtectedRoute menuKey="jasa:spk"><SpkJasa /></MenuProtectedRoute>} />
            <Route path="hasiljasa" element={<MenuProtectedRoute menuKey="jasa:hasil"><HasilJasa /></MenuProtectedRoute>} />
            <Route path="cashboanjasa" element={<MenuProtectedRoute menuKey="jasa:cashbon"><CashboanJasa /></MenuProtectedRoute>} />
            <Route path="hutangjasa" element={<MenuProtectedRoute menuKey="jasa:hutang"><HutangJasa /></MenuProtectedRoute>} />
            <Route path="pendapatanjasa" element={<MenuProtectedRoute menuKey="jasa:pendapatan"><PendapatanJasa /></MenuProtectedRoute>} />
            <Route path="pendapatanhistoryjasa" element={<MenuProtectedRoute menuKey="jasa:history_pendapatan"><HistoryPendapatanJasa /></MenuProtectedRoute>} />
          </Route>

          {/* Produk Group */}
          <Route element={<MenuProtectedRoute menuKey="produk" />}>
            <Route path="hppProduk" element={<MenuProtectedRoute menuKey="produk:hpp"><HppProduk /></MenuProtectedRoute>} />
            <Route path="produk-list" element={<MenuProtectedRoute menuKey="produk:list"><ProductList /></MenuProtectedRoute>} />
          </Route>

          {/* Packing Group */}
          <Route element={<MenuProtectedRoute menuKey="packing" />}>
            <Route path="getPassword" element={<PackingPasswordPage />} />
            <Route path="packing" element={<MenuProtectedRoute menuKey="packing:packing"><Packing /></MenuProtectedRoute>} />
            <Route path="packing-belum-barcode" element={<PackingAccessGate menuKey="packing-belum-barcode" featureName="Produk Belum Barcode"><PackingBelumBarcode /></PackingAccessGate>} />
            <Route path="packing-random" element={<PackingAccessGate menuKey="packing-random" featureName="Packing Random"><PackingRandom /></PackingAccessGate>} />
            <Route path="packing-pendingan" element={<PackingAccessGate menuKey="packing-pendingan" featureName="Packing Pendingan"><PackingPendingan /></PackingAccessGate>} />
            <Route path="packing-no-data-ginee" element={<PackingAccessGate menuKey="packing-no-data-ginee" featureName="No Data Ginee"><PackingNoDataGinee /></PackingAccessGate>} />
            <Route path="packing-inject" element={<MenuProtectedRoute menuKey="packing:inject"><PackingInject /></MenuProtectedRoute>} />
            <Route path="logs" element={<MenuProtectedRoute menuKey="packing:logs"><Logs /></MenuProtectedRoute>} />
            <Route path="seri" element={<MenuProtectedRoute menuKey="packing:seri"><Seri /></MenuProtectedRoute>} />
          </Route>

          {/* Return Group */}
          <Route element={<MenuProtectedRoute menuKey="return" />}>
            <Route path="return" element={<MenuProtectedRoute menuKey="return:return"><ReturnPage /></MenuProtectedRoute>} />
            <Route path="return-logs" element={<MenuProtectedRoute menuKey="return:logs"><ReturnLogs /></MenuProtectedRoute>} />
          </Route>

          {/* Gudang Bahan Group */}
          <Route element={<MenuProtectedRoute menuKey="gudang_bahan" />}>
            <Route path="bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:bahan"><Bahan /></MenuProtectedRoute>} />
            <Route path="bahan-list" element={<MenuProtectedRoute menuKey="gudang_bahan:list_bahan"><BahanList /></MenuProtectedRoute>} />
            <Route path="pembelianBahan" element={<MenuProtectedRoute menuKey="gudang_bahan:pengiriman"><PembelianBahan /></MenuProtectedRoute>} />
            <Route path="stok-opname-bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:opname"><StokOpnameBahan /></MenuProtectedRoute>} />
            <Route path="pabrik" element={<MenuProtectedRoute menuKey="gudang_bahan:pabrik"><Pabrik /></MenuProtectedRoute>} />
            <Route path="gudang" element={<MenuProtectedRoute menuKey="gudang_bahan:gudang"><Gudang /></MenuProtectedRoute>} />
            <Route path="scan-bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:scan_masuk"><ScanBahan /></MenuProtectedRoute>} />
            <Route path="stok-per-bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:stok"><StokPerBahan /></MenuProtectedRoute>} />
            <Route path="scan-stok-bahan-keluar" element={<MenuProtectedRoute menuKey="gudang_bahan:scan_keluar"><ScanStokBahanKeluar /></MenuProtectedRoute>} />
            <Route path="riwayat-stok-bahan-keluar" element={<MenuProtectedRoute menuKey="gudang_bahan:history_keluar"><RiwayatStokBahanKeluar /></MenuProtectedRoute>} />
            <Route path="spk-bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:pemesanan"><SpkBahan /></MenuProtectedRoute>} />
            <Route path="refund-bahan" element={<MenuProtectedRoute menuKey="gudang_bahan:return"><RefundBahan /></MenuProtectedRoute>} />
            <Route path="pendapatan-pabrik" element={<MenuProtectedRoute menuKey="gudang_bahan:hutang_pabrik"><PendapatanPabrik /></MenuProtectedRoute>} />
            <Route path="history-pendapatan-pabrik" element={<MenuProtectedRoute menuKey="gudang_bahan:history_hutang_pabrik"><HistoryPendapatanPabrik /></MenuProtectedRoute>} />
          </Route>

          {/* Gudang Produk Group */}
          <Route element={<MenuProtectedRoute menuKey="gudang_produk" />}>
            <Route path="master-gudang-produk" element={<MenuProtectedRoute menuKey="gudang_produk:master_layout"><MasterGudangProduk /></MenuProtectedRoute>} />
            <Route path="input-sku-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:input_sku"><InputSkuGudang /></MenuProtectedRoute>} />
            <Route path="scan-produk-masuk-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:scan_masuk"><ScanProdukMasukGudang /></MenuProtectedRoute>} />
            <Route path="stok-awal-gudang-produk" element={<MenuProtectedRoute menuKey="gudang_produk:stok_awal"><StokAwalGudangProduk /></MenuProtectedRoute>} />
            <Route path="stok-lokasi-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:stok_lokasi"><StokLokasiGudang /></MenuProtectedRoute>} />
            <Route path="list-stok-product" element={<MenuProtectedRoute menuKey="gudang_produk:list_stok"><ListStokProductGudang /></MenuProtectedRoute>} />
            <Route path="mutasi-gudang-produk" element={<MenuProtectedRoute menuKey="gudang_produk:mutasi"><MutasiGudangProduk /></MenuProtectedRoute>} />
            <Route path="history-produk-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:history_produk"><HistoryProdukGudang /></MenuProtectedRoute>} />
            <Route path="history-mutasi-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:history_mutasi"><HistoryMutasiGudang /></MenuProtectedRoute>} />
            <Route path="stok-opname-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:stok_opname"><StokOpnameGudang /></MenuProtectedRoute>} />
            <Route path="history-stok-awal-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:history_stok_awal"><HistoryStokAwalGudang /></MenuProtectedRoute>} />
            <Route path="history-produk-masuk-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:history_produk_masuk"><HistoryProdukMasukGudang /></MenuProtectedRoute>} />
            <Route path="history-out-check-gudang" element={<MenuProtectedRoute menuKey="gudang_produk:history_out_check"><HistoryOutCheckGudang /></MenuProtectedRoute>} />
            <Route path="picking-queue" element={<MenuProtectedRoute menuKey="gudang_produk:picking_queue"><PickingQueue /></MenuProtectedRoute>} />
          </Route>

          {/* Quality Control Group */}
          <Route element={<MenuProtectedRoute menuKey="qc" />}>
            <Route path="qc-lolos" element={<MenuProtectedRoute menuKey="qc:lolos"><QCLolos /></MenuProtectedRoute>} />
            <Route path="qc-reject" element={<MenuProtectedRoute menuKey="qc:reject"><QCReject /></MenuProtectedRoute>} />
          </Route>

          {/* Management Sample Group */}
          <Route element={<MenuProtectedRoute menuKey="sample" />}>
            <Route path="tukang-sample" element={<MenuProtectedRoute menuKey="sample:tukang"><TukangSample /></MenuProtectedRoute>} />
            <Route path="spk-sample" element={<MenuProtectedRoute menuKey="sample:spk"><SPKSample /></MenuProtectedRoute>} />
            <Route path="summary-spk-sample" element={<MenuProtectedRoute menuKey="sample:summary"><SummarySPKSample /></MenuProtectedRoute>} />
          </Route>

          {/* Other routes */}
          <Route path="order" element={<OrderMonitor />} />
          <Route path="blank" element={<Blank />} />
          <Route path="blank2" element={<Blank2 />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

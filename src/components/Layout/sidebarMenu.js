// Sidebar menu structure as data instead of hand-repeated JSX.
//
// Each section renders its label only if at least one of its items is
// visible. A plain item is `{ access, to, icon, label }`. A dropdown item
// additionally has `key` (used for open/close state) and `groups`, where
// each group is `{ label, items: [...] }` — the group's own label is only
// shown if at least one of its items is visible.
//
// `access` is checked against hasAccess(); items without `access` are
// always shown (used for the role-gated "Pengaturan" section). `when(ctx)`
// is an extra predicate for anything hasAccess() can't express (currently
// only "hide these for the `penjahit` role" inside the CMT dropdown).
//
// Active/open state is derived from `to` at render time (see Layout.js),
// so there's no separate "activeMenu" string to keep in sync by hand here
// like the old JSX had — that duplication was the source of a few stale
// mismatches (e.g. "Pekerjaan Tersedia" and "SPK CMT" never actually
// lighting up as active) that this refactor fixes as a side effect.
import {
  Home, TrendingUp, ClipboardCheck, CheckSquare, Layers, User, FileText,
  Package, ShoppingCart, ShoppingBag, Warehouse, Building, List, Undo,
  Barcode, History, Banknote, Scissors, CreditCard, PenTool, Shirt,
  PackageOpen, Clock, QrCode, AlertTriangle, Key, Headphones, X,
} from "lucide-react";

const isPenjahit = (ctx) => ctx.role === "penjahit";

export const SIDEBAR_SECTIONS = [
  {
    label: "Main Menu",
    items: [
      { access: "dashboard", to: "/home", icon: Home, label: "Home" },
    ],
  },

  {
    label: "Quality & Sample",
    items: [
      {
        key: "qc", access: "qc", icon: ClipboardCheck, label: "Quality Control",
        groups: [
          {
            label: "Status", items: [
              { access: "qc:lolos", to: "qc-lolos", icon: CheckSquare, label: "QC Lolos" },
              { access: "qc:reject", to: "qc-reject", icon: X, label: "QC Reject", iconColor: "#ff6b6b" },
            ]
          },
        ],
      },
      {
        key: "sample", access: "sample", icon: Layers, label: "Manajemen Sample",
        groups: [
          { label: "Master Data", items: [{ access: "sample:tukang", to: "tukang-sample", icon: User, label: "Tukang Sample" }] },
          {
            label: "Operasional", items: [
              { access: "sample:spk", to: "spk-sample", icon: FileText, label: "SPK Sample" },
              { access: "sample:summary", to: "summary-spk-sample", icon: TrendingUp, label: "Summary SPK Sample" },
            ]
          },
        ],
      },
    ],
  },

  {
    label: "Inventaris & Gudang",
    items: [
      {
        key: "aksesoris", access: "aksesoris", icon: Package, label: "Aksesoris",
        groups: [
          { label: "Master Data", items: [{ access: "aksesoris:data", to: "aksesoris", icon: Package, label: "Data Aksesoris" }] },
          {
            label: "Pembelian", items: [
              { access: "aksesoris:pembelian_toko", to: "pembelianA", icon: ShoppingCart, label: "Pembelian Aksesoris Toko" },
              { access: "aksesoris:pembelian_cmt", to: "petugas-c", icon: ShoppingCart, label: "Pembelian Aksesoris CMT" },
            ]
          },
        ],
      },
      {
        key: "produk", access: "produk", icon: ShoppingBag, label: "Produk",
        groups: [
          { label: "Master Data", items: [{ access: "produk:list", to: "produk-list", icon: Layers, label: "Daftar Produk" }] },
          {
            label: "Keuangan", items: [
              { access: "produk:hpp", to: "hppProduk", icon: ShoppingBag, label: "HPP Produk" },
              { access: "produk:list", to: "daftar-sku-ginee", icon: Layers, label: "Daftar SKU Ginee" },
            ]
          },
        ],
      },
      {
        key: "gudangBahan", access: "gudang_bahan", icon: Warehouse, label: "Gudang Bahan",
        groups: [
          {
            label: "Master Data", items: [
              { access: "gudang_bahan:pabrik", to: "pabrik", icon: Building, label: "Data Pabrik" },
              { access: "gudang_bahan:gudang", to: "gudang", icon: Warehouse, label: "Data Gudang" },
              { access: "gudang_bahan:bahan", to: "bahan", icon: Layers, label: "Data Bahan" },
              { access: "gudang_bahan:list_bahan", to: "bahan-list", icon: List, label: "Daftar Bahan" },
            ]
          },
          {
            label: "Operasional", items: [
              { access: "gudang_bahan:pemesanan", to: "spk-bahan", icon: FileText, label: "Pemesanan Bahan" },
              { access: "gudang_bahan:pengiriman", to: "pembelianBahan", icon: ShoppingCart, label: "Pengiriman Bahan" },
              { access: "gudang_bahan:return", to: "refund-bahan", icon: Undo, label: "Retur Bahan" },
              { access: "gudang_bahan:opname", to: "stok-opname-bahan", icon: ClipboardCheck, label: "Stok Opname Bahan", iconColor: "#a78bfa" },
            ]
          },
          {
            label: "Inventory", items: [
              { access: "gudang_bahan:stok", to: "stok-per-bahan", icon: Package, label: "Stok Bahan" },
              { access: "gudang_bahan:scan_masuk", to: "scan-bahan", icon: Barcode, label: "Scan Bahan Masuk" },
              { access: "gudang_bahan:scan_keluar", to: "scan-stok-bahan-keluar", icon: Barcode, label: "Scan Bahan Keluar" },
              { access: "gudang_bahan:history_keluar", to: "riwayat-stok-bahan-keluar", icon: History, label: "Riwayat Stok Keluar" },
            ]
          },
          {
            label: "Keuangan", items: [
              { access: "gudang_bahan:hutang_pabrik", to: "pendapatan-pabrik", icon: Banknote, label: "Hutang Pabrik" },
              { access: "gudang_bahan:history_hutang_pabrik", to: "history-pendapatan-pabrik", icon: History, label: "Riwayat Hutang Pabrik" },
            ]
          },
        ],
      },
    ],
  },

  {
    label: "Produksi & CMT",
    items: [
      {
        key: "cutting", access: "cutting", icon: Scissors, label: "Cutting",
        groups: [
          { label: "Utama", items: [{ access: "cutting:dashboard", to: "dashboardCutting", icon: TrendingUp, label: "Dashboard Cutting" }] },
          { label: "Master Data", items: [{ access: "cutting:tukang", to: "tukangCutting", icon: User, label: "Tukang Cutting" }] },
          {
            label: "Operasional", items: [
              { access: "cutting:spk", to: "spkcutting", icon: FileText, label: "SPK Cutting" },
              { access: "cutting:hasil", to: "hasilcutting", icon: CheckSquare, label: "Input Hasil Cutting" },
              { access: "cutting:laporan", to: "laporanhasil", icon: ClipboardCheck, label: "Laporan Hasil Cutting" },
              { access: "cutting:acuan", to: "laporan-data-acuan", icon: List, label: "Laporan Data Acuan" },
              { access: "cutting:history_hasil", to: "historyhasilcutting", icon: History, label: "Riwayat Hasil Cutting" },
              { access: "cutting:history_distribusi", to: "historydistribusispk", icon: History, label: "Riwayat Distribusi SPK" },
            ]
          },
          {
            label: "Keuangan", items: [
              { access: "cutting:hutang", to: "hutangc", icon: CreditCard, label: "Hutang Tukang Cutting" },
              { access: "cutting:cashbon", to: "cashboanc", icon: Banknote, label: "Kasbon Tukang Cutting" },
              { access: "cutting:piutang", to: "pendapatancutting", icon: Banknote, label: "Piutang Tukang Cutting" },
              { access: "cutting:history_pembayaran", to: "pendapatanhistory", icon: History, label: "Riwayat Pembayaran" },
            ]
          },
        ],
      },
      {
        key: "jasa", access: "jasa", icon: PenTool, label: "Jasa",
        groups: [
          { label: "Utama", items: [{ access: "jasa:dashboard", to: "dashboard-jasa", icon: TrendingUp, label: "Dashboard Jasa" }] },
          { label: "Master Data", items: [{ access: "jasa:tukang", to: "tukangJasa", icon: User, label: "Tukang Jasa" }] },
          {
            label: "Operasional", items: [
              { access: "jasa:spk", to: "spkjasa", icon: FileText, label: "SPK Jasa" },
              { access: "jasa:hasil", to: "hasiljasa", icon: CheckSquare, label: "Hasil Jasa" },
            ]
          },
          {
            label: "Keuangan", items: [
              { access: "jasa:cashbon", to: "cashboanjasa", icon: Banknote, label: "Kasbon" },
              { access: "jasa:hutang", to: "hutangjasa", icon: CreditCard, label: "Hutang" },
              { access: "jasa:pendapatan", to: "pendapatanjasa", icon: Banknote, label: "Pendapatan" },
              { access: "jasa:history_pendapatan", to: "pendapatanhistoryjasa", icon: History, label: "Riwayat Pendapatan" },
            ]
          },
        ],
      },
      {
        key: "cmt", access: "cmt", icon: Shirt, label: "CMT",
        groups: [
          { label: "Utama", items: [{ access: "cmt:dashboard", to: "dashboard-cmt", icon: TrendingUp, label: "Dashboard CMT" }] },
          { label: "Master Data", items: [{ access: "cmt:penjahit", to: "penjahit", icon: User, label: "Daftar Penjahit" }] },
          {
            label: "Operasional", items: [
              { access: "cmt:pekerjaan_tersedia", to: "kode-seri-belum-dikerjakan", icon: Barcode, label: "Pekerjaan Tersedia" },
              { access: "cmt:spk", to: "spkcmt", icon: FileText, label: "SPK CMT" },
              { access: "cmt:data_dikerjakan", to: "data-dikerjakan-pengiriman-cmt", icon: TrendingUp, label: "Data Dikerjakan & Pengiriman", when: (ctx) => !isPenjahit(ctx) },
              { access: "cmt:pengiriman", to: "pengiriman", icon: Package, label: "Pengiriman", when: (ctx) => !isPenjahit(ctx) },
            ]
          },
          {
            label: "Keuangan", items: [
              { access: "cmt:hutang", to: "hutang", icon: CreditCard, label: "Hutang", when: (ctx) => !isPenjahit(ctx) },
              { access: "cmt:cashbon", to: "cashbon", icon: Banknote, label: "Kasbon", when: (ctx) => !isPenjahit(ctx) },
              { access: "cmt:pendapatan", to: "pendapatan", icon: Banknote, label: "Pendapatan", when: (ctx) => !isPenjahit(ctx) },
              { access: "cmt:history_pendapatan", to: "historyPendapatan", icon: History, label: "Riwayat Pendapatan", when: (ctx) => !isPenjahit(ctx) },
            ]
          },
        ],
      },
    ],
  },

  {
    label: "Distribusi & Logistik",
    items: [
      {
        key: "gudangProduk", access: "gudang_produk", icon: ShoppingBag, label: "Gudang Produk",
        groups: [
          { label: "Master", items: [{ access: "gudang_produk:master_layout", to: "master-gudang-produk", icon: Warehouse, label: "Layout Gudang" }] },
          {
            label: "Operasional", items: [
              { access: "gudang_produk:scan_masuk", to: "scan-produk-masuk-gudang", icon: Barcode, label: "Scan Produk Masuk" },
              { access: "gudang_produk:mutasi", to: "mutasi-gudang-produk", icon: PackageOpen, label: "Mutasi Gudang" },
            ]
          },
          {
            label: "Stok & Opname", items: [
              { access: "gudang_produk:stok_awal", to: "stok-awal-gudang-produk", icon: ClipboardCheck, label: "Stok Awal" },
              { access: "gudang_produk:stok_opname", to: "stok-opname-gudang", icon: ClipboardCheck, label: "Stok Opname", iconColor: "#a78bfa" },
              { access: "gudang_produk:stok_lokasi", to: "stok-lokasi-gudang", icon: Layers, label: "Stok per Lokasi" },
              { access: "gudang_produk:list_stok", to: "list-stok-product", icon: Package, label: "Daftar Stok Produk" },
            ]
          },
          {
            label: "History & Lainnya", items: [
              { access: "gudang_produk:stok_opname", to: "riwayat-stok-opname-gudang", icon: History, label: "Riwayat Stok Opname", iconColor: "#a78bfa" },
              { access: "gudang_produk:history_mutasi", to: "history-mutasi-gudang", icon: History, label: "Riwayat Mutasi" },
              { access: "gudang_produk:history_produk", to: "history-produk-gudang", icon: History, label: "Riwayat Produk" },
              { access: "gudang_produk:history_stok_awal", to: "history-stok-awal-gudang", icon: ClipboardCheck, label: "Riwayat Stok Awal", iconColor: "#a78bfa" },
              { access: "gudang_produk:history_produk_masuk", to: "history-produk-masuk-gudang", icon: History, label: "Riwayat Produk Masuk" },
              { access: "gudang_produk:history_out_check", to: "history-out-check-gudang", icon: History, label: "Riwayat Keluar Masuk" },
              { access: "gudang_produk:pencarian_seri", to: "pencarian-seri-gudang", icon: Barcode, label: "Pencarian Seri" },
            ]
          },
          {
            label: "Manajemen Sample", items: [
              { access: "gudang_produk:sample", to: "scan-sample", icon: Barcode, label: "Scan Sample (Pinjam/Kembali)" },
              { access: "gudang_produk:sample", to: "riwayat-sample", icon: History, label: "Riwayat Sample Gudang" },
            ]
          },
        ],
      },
      {
        key: "packing", access: "packing", icon: PackageOpen, label: "Packing",
        groups: [
          {
            label: "Operasional", items: [
              { access: "packing:packing", to: "packing", icon: PackageOpen, label: "Input Packing" },
              { access: "packing:random", to: "packing-random", icon: Barcode, label: "Packing Random" },
              { access: "packing:pendingan", to: "packing-pendingan", icon: Clock, label: "Barang Pending" },
              { access: "packing:belum_barcode", to: "packing-belum-barcode", icon: QrCode, label: "Produk Belum Barcode" },
              { access: "packing:no_data_ginee", to: "packing-no-data-ginee", icon: AlertTriangle, label: "Order Tanpa Data Ginee", iconColor: "#f59e0b" },
              { access: "packing:inject", to: "packing-inject", icon: FileText, label: "Input Data Manual" },
              { access: "packing:seri", to: "seri", icon: QrCode, label: "Input Nomor Seri" },
            ]
          },
          {
            label: "Monitoring & Laporan", items: [
              { access: "packing:logs", to: "monitoring", icon: TrendingUp, label: "Monitoring Harian" },
              { access: "packing:logs", to: "logs", icon: History, label: "Riwayat Scan" },
              { access: "packing:seri", to: "seri-report", icon: FileText, label: "Laporan Seri" },
            ]
          },
        ],
      },
      {
        key: "return", access: "return", icon: Undo, label: "Retur",
        groups: [
          {
            label: "Operasional", items: [
              { access: "return:return", to: "return", icon: Undo, label: "Input Retur" },
              { access: "return:logs", to: "return-logs", icon: History, label: "Log Retur" },
            ]
          },
        ],
      },
    ],
  },

  {
    label: "Support",
    items: [
      {
        key: "cs", access: "cs", icon: Headphones, label: "Customer Service",
        groups: [
          { label: null, items: [{ access: "cs:monitoring_notes", to: "customer-service/monitoring-notes", icon: null, label: "Monitoring Notes" }] },
        ],
      },
    ],
  },

  {
    label: "Pengaturan",
    when: (ctx) => ctx.role === "super-admin",
    items: [
      { to: "/user-management", icon: User, label: "User Management" },
      { to: "/getPassword", icon: Key, label: "Get Password" },
      { to: "/order", icon: ShoppingCart, label: "Order Monitor" },
    ],
  },
];

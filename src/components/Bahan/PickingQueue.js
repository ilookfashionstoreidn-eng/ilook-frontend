import React, { useState, useEffect } from 'react';
import API from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './PickingQueue.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PickingQueue = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchCount, setBatchCount] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchOrders = async () => {
        try {
            const response = await API.get('/picking-queue');
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching picking queue:", error);
            toast.error("Gagal memuat data picking queue");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleMarkPicked = async (id) => {
        try {
            await API.post(`/orders/${id}/mark-picked`);
            toast.success("Order marked as picked successfully");
            fetchOrders(); // Refresh list
        } catch (error) {
            console.error("Error marking order as picked:", error);
            toast.error("Gagal menandai order sebagai picked");
        }
    };

    const handleBatchPick = async (e) => {
        e.preventDefault();
        
        if (!batchCount || batchCount <= 0) {
            toast.warning("Masukkan jumlah order yang valid");
            return;
        }

        try {
            setProcessing(true);
            const response = await API.post('/orders/batch-pick', {
                limit: parseInt(batchCount)
            });

            toast.success(response.data.message);
            
            // Generate PDF
            generatePdf(response.data.summary, response.data.processed_orders, response.data.timestamp);
            
            setBatchCount("");
            fetchOrders();
        } catch (error) {
            console.error("Error batch picking:", error);
            const msg = error.response?.data?.message || "Gagal memproses batch picking";
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    const generatePdf = (summary, orderNumbers, timestamp) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Picking Summary Report", 14, 20);
        
        doc.setFontSize(11);
        doc.text(`Tanggal: ${timestamp}`, 14, 30);
        doc.text(`Total SKU: ${Object.keys(summary).length}`, 14, 36);

        // Table Data
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

        const sortedEntries = Object.entries(summary).sort((a, b) => {
            const skuA = a[0];
            const skuB = b[0];

            const sizeA = skuA.split(' ').pop().toUpperCase();
            const sizeB = skuB.split(' ').pop().toUpperCase();

            const indexA = sizeOrder.indexOf(sizeA);
            const indexB = sizeOrder.indexOf(sizeB);

            // kalau dua-duanya punya size → bandingkan size
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            // kalau tidak ada size → balik ke alfabet
            return skuA.localeCompare(skuB);
        });

        const tableData = sortedEntries.map(([sku, qty], index) => [
            index + 1,
            sku,
            qty
        ]);


        // Generate Table
        doc.autoTable({
            startY: 45,
            head: [['No', 'Nama SKU', 'Total Quantity']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
        });

        // Add list of order numbers at the bottom
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text("Processed Orders:", 14, finalY);
        
        const splitOrders = doc.splitTextToSize(orderNumbers.join(", "), 180);
        doc.text(splitOrders, 14, finalY + 7);

        // Save PDF
        doc.save(`picking_summary_${timestamp.replace(/[: ]/g, '_')}.pdf`);
    };

    return (
        <div className="picking-queue-container">
            <ToastContainer />
            <h1 className="page-title">Picking Queue</h1>
            
            <div className="batch-pick-section">
                <form onSubmit={handleBatchPick} className="batch-pick-form">
                    <div className="form-group">
                        <label htmlFor="batchCount">Ambil Order Teratas:</label>
                        <div className="input-group">
                            <input
                                type="number"
                                id="batchCount"
                                className="form-control"
                                placeholder="Jumlah order (contoh: 5)"
                                value={batchCount}
                                onChange={(e) => setBatchCount(e.target.value)}
                                min="1"
                            />
                            <button 
                                type="submit" 
                                className="btn-batch-process"
                                disabled={processing || loading || orders.length === 0}
                            >
                                {processing ? 'Memproses...' : 'Proses & Print Summary'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-responsive">
                    <table className="picking-table">
                        <thead>
                            <tr>
                                <th>Order Number</th>
                                <th>Tracking Number</th>
                                <th>Platform</th>
                                <th>Customer</th>
                                <th>Print Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.order_number}</td>
                                        <td>{order.tracking_number}</td>
                                        <td>{order.platform}</td>
                                        <td>{order.customer_name}</td>
                                        <td>{new Date(order.label_print_time).toLocaleString('id-ID')}</td>
                                        <td>
                                            <button 
                                                className="btn-mark-picked"
                                                onClick={() => handleMarkPicked(order.id)}
                                            >
                                                Mark as Picked
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">Tidak ada antrian picking</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PickingQueue;

import React, { useState, useEffect } from 'react';
import API from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './PickingQueue.css';

const PickingQueue = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="picking-queue-container">
            <ToastContainer />
            <h1 className="page-title">Picking Queue</h1>
            
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

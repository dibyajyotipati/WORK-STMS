import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Truck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const DriverDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
      } catch {
        toast.error('Could not load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My tasks</h1>
        <p className="text-slate-600 mt-1">Your assigned shipments and current status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Total assigned" value={stats?.shipments?.total ?? 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Clock} label="Active trips" value={stats?.shipments?.active ?? 0} color="bg-amber-100 text-amber-600" />
        <StatCard icon={CheckCircle} label="Delivered" value={stats?.shipments?.delivered ?? 0} color="bg-green-100 text-green-600" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Truck size={18} /> My shipments
          </h3>
          <Link to="/shipments" className="text-sm text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentShipments || []).length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    No shipments assigned yet
                  </td>
                </tr>
              ) : (
                (stats?.recentShipments || []).map((s) => (
                  <tr key={s._id}>
                    <td className="font-mono text-xs text-primary-700">
                      <Link to={`/shipments/${s._id}`} className="hover:underline">
                        {s.trackingId}
                      </Link>
                    </td>
                    <td>{s.customerName}</td>
                    <td className="text-slate-600">{s.source} → {s.destination}</td>
                    <td>{s.vehicleId?.vehicleNumber || '—'}</td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
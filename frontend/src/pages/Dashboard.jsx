import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Truck,
  Users,
  DollarSign,
  Fuel,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

const StatCard = ({ icon: Icon, label, value, color = 'primary', sub }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${color}-100 text-${color}-600`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
      } catch (err) {
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

  if (!stats) {
    return <div className="text-center py-12 text-slate-500">No data available</div>;
  }

  const statusData = Object.entries(stats.shipments.byStatus || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const kpiBars = [
    { name: 'Total', value: stats.shipments.total },
    { name: 'Active', value: stats.shipments.active },
    { name: 'Delivered', value: stats.shipments.delivered },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your fleet operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Shipments"
          value={stats.shipments.total}
          color="blue"
          sub={`${stats.shipments.active} active`}
        />
        <StatCard
          icon={Truck}
          label="Fleet"
          value={stats.vehicles.total}
          color="emerald"
          sub={`${stats.vehicles.active} on road`}
        />
        <StatCard
          icon={Users}
          label="Drivers"
          value={stats.drivers.total}
          color="amber"
          sub={`${stats.drivers.available} available`}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={`₹${(stats.finance.revenue || 0).toLocaleString('en-IN')}`}
          color="primary"
          sub={`Fuel: ₹${(stats.finance.fuelCost || 0).toLocaleString('en-IN')}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={18} /> Shipment status
            </h3>
          </div>
          <div className="card-body h-72">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No shipment data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} /> Shipment overview
            </h3>
          </div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Fuel size={18} /> Recent shipments
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
              {(stats.recentShipments || []).map((s) => (
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
              ))}
              {(stats.recentShipments || []).length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400">
                    No shipments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

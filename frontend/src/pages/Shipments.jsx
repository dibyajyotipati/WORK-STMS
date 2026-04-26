import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const EMPTY = {
  customerName: '',
  customerPhone: '',
  source: '',
  destination: '',
  cargoType: 'general',
  weightKg: 100,
  fareAmount: 0,
  vehicleId: '',
  driverId: '',
  notes: '',
};

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [estimating, setEstimating] = useState(false);
  const [preview, setPreview] = useState(null); // { distance_km, duration_min, fuel_litres, fuel_cost }

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/shipments', { params });
      setShipments(data);
    } catch (err) {
      toast.error('Could not load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, statusFilter]);

  const openNew = async () => {
    setForm(EMPTY);
    setPreview(null);
    setModalOpen(true);
    try {
      const [v, d] = await Promise.all([
        api.get('/vehicles', { params: { status: 'idle' } }),
        api.get('/drivers', { params: { status: 'available' } }),
      ]);
      setVehicles(v.data);
      setDrivers(d.data);
    } catch (err) {
      toast.error('Could not load vehicles/drivers');
    }
  };

  const estimate = async () => {
    if (!form.source || !form.destination) {
      toast.error('Enter source & destination first');
      return;
    }
    setEstimating(true);
    try {
      const { data: route } = await api.post('/ai/route', {
        source: form.source,
        destination: form.destination,
      });

      const vehicle = vehicles.find((v) => v._id === form.vehicleId);
      const { data: fuel } = await api.post('/ai/fuel', {
        distance_km: route.distance_km,
        vehicle_type: vehicle?.type || 'truck',
        mileage_kmpl: vehicle?.mileage || 10,
        load_kg: Number(form.weightKg) || 0,
      });

      setPreview({
        distance_km: route.distance_km,
        duration_min: route.duration_min,
        fuel_litres: fuel.fuel_litres,
        fuel_cost: fuel.fuel_cost,
        provider: route.provider,
      });
      toast.success('AI estimate ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI estimate failed');
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.vehicleId) delete payload.vehicleId;
      if (!payload.driverId) delete payload.driverId;
      await api.post('/shipments', payload);
      toast.success('Shipment created (AI estimates applied)');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-600 mt-1">Track and manage deliveries</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} /> New shipment
        </button>
      </div>

      <div className="card">
        <div className="card-header flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Tracking ID or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="booked">Booked</option>
              <option value="assigned">Assigned</option>
              <option value="in_transit">In transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="text-sm text-slate-500">{shipments.length} total</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Distance</th>
                <th>Fuel (₹)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <Package size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No shipments yet</p>
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s._id}>
                    <td className="font-mono text-xs text-primary-700">
                      <Link to={`/shipments/${s._id}`} className="hover:underline">
                        {s.trackingId}
                      </Link>
                    </td>
                    <td className="font-medium">{s.customerName}</td>
                    <td className="text-slate-600">{s.source} → {s.destination}</td>
                    <td>{s.distanceKm?.toFixed(1) || 0} km</td>
                    <td>₹{(s.fuelCostEstimate || 0).toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="text-right">
                      <Link to={`/shipments/${s._id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New shipment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer name *</label>
              <input className="input" required value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="label">Customer phone</label>
              <input className="input" value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">Source *</label>
              <input className="input" required placeholder="e.g. Bhubaneswar"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div>
              <label className="label">Destination *</label>
              <input className="input" required placeholder="e.g. Cuttack"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </div>
            <div>
              <label className="label">Weight (kg) *</label>
              <input type="number" min="0" className="input" required
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Cargo type</label>
              <input className="input" value={form.cargoType}
                onChange={(e) => setForm({ ...form, cargoType: e.target.value })} />
            </div>
            <div>
              <label className="label">Fare (₹)</label>
              <input type="number" min="0" className="input"
                value={form.fareAmount}
                onChange={(e) => setForm({ ...form, fareAmount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Vehicle (optional)</label>
              <select className="input" value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">— none —</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Driver (optional)</label>
              <select className="input" value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                <option value="">— none —</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} — {d.phone}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows="2" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Sparkles size={16} className="text-primary-600" />
                AI estimate
              </div>
              <button
                type="button"
                onClick={estimate}
                disabled={estimating}
                className="btn-secondary btn-sm"
              >
                {estimating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                {estimating ? 'Estimating…' : 'Preview estimate'}
              </button>
            </div>
            {preview && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Distance</p><p className="font-semibold">{preview.distance_km} km</p></div>
                <div><p className="text-xs text-slate-500">Duration</p><p className="font-semibold">{preview.duration_min} min</p></div>
                <div><p className="text-xs text-slate-500">Fuel</p><p className="font-semibold">{preview.fuel_litres} L</p></div>
                <div><p className="text-xs text-slate-500">Fuel cost</p><p className="font-semibold">₹{preview.fuel_cost}</p></div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Estimates are recalculated on save. You can preview here or just submit — the backend will call the AI service automatically.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create shipment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shipments;

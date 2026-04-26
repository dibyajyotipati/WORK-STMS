import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  vehicleNumber: '',
  type: 'truck',
  model: '',
  capacity: 1000,
  mileage: 10,
  status: 'idle',
  currentLocation: '',
};

const Vehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vehicles', { params: { q: search || undefined } });
      setVehicles(data);
    } catch (err) {
      toast.error('Could not load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ ...v, lastServiceDate: v.lastServiceDate?.substring(0, 10) || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/vehicles/${editing._id}`, form);
        toast.success('Vehicle updated');
      } else {
        await api.post('/vehicles', form);
        toast.success('Vehicle added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Delete vehicle ${v.vehicleNumber}?`)) return;
    try {
      await api.delete(`/vehicles/${v._id}`);
      toast.success('Vehicle deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-600 mt-1">Manage your fleet</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Add vehicle
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by vehicle number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500">{vehicles.length} total</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle #</th>
                <th>Type</th>
                <th>Model</th>
                <th>Capacity (kg)</th>
                <th>Mileage</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <Truck size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No vehicles found</p>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v._id}>
                    <td className="font-mono font-semibold text-slate-900">{v.vehicleNumber}</td>
                    <td className="capitalize">{v.type?.replace('_', ' ')}</td>
                    <td>{v.model || '—'}</td>
                    <td>{v.capacity.toLocaleString()}</td>
                    <td>{v.mileage} km/L</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td className="text-right space-x-2">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(v)}
                          className="text-slate-500 hover:text-primary-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(v)}
                          className="text-slate-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
        title={editing ? 'Edit vehicle' : 'Add vehicle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle number *</label>
              <input
                className="input"
                required
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="label">Type *</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="mini_truck">Mini truck</option>
                <option value="container">Container</option>
                <option value="tanker">Tanker</option>
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <input
                className="input"
                value={form.model || ''}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Capacity (kg) *</label>
              <input
                type="number"
                min="0"
                className="input"
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Mileage (km/L)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input"
                value={form.mileage}
                onChange={(e) => setForm({ ...form, mileage: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="idle">Idle</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Current location</label>
              <input
                className="input"
                value={form.currentLocation || ''}
                onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vehicles;

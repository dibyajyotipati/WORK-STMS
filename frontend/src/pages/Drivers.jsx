import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Users, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  licenseNumber: '',
  licenseExpiry: '',
  experienceYears: 0,
  status: 'available',
};

const EMPTY_ACCOUNT = { email: '', password: '' };

const Drivers = () => {
  const { user } = useAuth();
  const [drivers, setDrivers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [editing, setEditing]         = useState(null);
  const [saving, setSaving]           = useState(false);
  // Portal account creation alongside driver profile
  const [createAccount, setCreateAccount] = useState(false);
  const [account, setAccount]         = useState(EMPTY_ACCOUNT);

  const canWrite  = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/drivers', { params: { q: search || undefined } });
      setDrivers(data);
    } catch {
      toast.error('Could not load drivers');
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
    setAccount(EMPTY_ACCOUNT);
    setCreateAccount(false);
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ ...d, licenseExpiry: d.licenseExpiry?.substring(0, 10) || '' });
    setCreateAccount(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.licenseExpiry) delete payload.licenseExpiry;

      if (editing) {
        await api.put(`/drivers/${editing._id}`, payload);
        toast.success('Driver updated');
      } else {
        // 1. Create the driver profile
        const { data: newDriver } = await api.post('/drivers', payload);

        // 2. Optionally create a linked portal account
        if (createAccount) {
          if (!account.email || !account.password) {
            toast.error('Email and password required for portal account');
            setSaving(false);
            return;
          }
          await api.post('/auth/register', {
            name: form.name,
            email: account.email,
            password: account.password,
            phone: form.phone,
            role: 'driver',
            driverProfileId: newDriver._id,
          });
          toast.success('Driver profile + portal account created');
        } else {
          toast.success('Driver profile created');
        }
      }

      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Delete driver ${d.name}?`)) return;
    try {
      await api.delete(`/drivers/${d._id}`);
      toast.success('Driver deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-slate-600 mt-1">Manage your driver roster</p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Add driver
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500">{drivers.length} total</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>License</th>
                <th>Experience</th>
                <th>Portal access</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <Users size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No drivers found</p>
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d._id}>
                    <td className="font-medium text-slate-900">{d.name}</td>
                    <td className="font-mono text-xs">{d.phone}</td>
                    <td className="font-mono text-xs">{d.licenseNumber}</td>
                    <td>{d.experienceYears} yrs</td>
                    <td>
                      {d.userId ? (
                        <span className="text-xs bg-green-100 text-green-800 font-medium px-2 py-0.5 rounded-full">
                          Linked
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          No account
                        </span>
                      )}
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-right space-x-2">
                      {canWrite && (
                        <button onClick={() => openEdit(d)} className="text-slate-500 hover:text-primary-600" title="Edit">
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(d)} className="text-slate-500 hover:text-red-600" title="Delete">
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
        title={editing ? 'Edit driver' : 'Add driver'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input className="input" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input" required placeholder="+919876543210" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">License # *</label>
              <input className="input" required value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="label">License expiry</label>
              <input type="date" className="input" value={form.licenseExpiry || ''}
                onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input type="number" min="0" className="input" value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="available">Available</option>
                <option value="on_trip">On trip</option>
                <option value="off_duty">Off duty</option>
              </select>
            </div>
          </div>

          {/* Portal account section — only when creating new driver */}
          {!editing && (
            <div className="border-t border-slate-200 pt-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary-600"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                />
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-primary-600" />
                  <span className="font-medium text-slate-800 text-sm">Also create portal login for this driver</span>
                </div>
              </label>
              <p className="text-xs text-slate-400 mt-1 ml-7">
                Driver will be able to log in and view their assigned shipments.
              </p>

              {createAccount && (
                <div className="grid grid-cols-2 gap-4 mt-3 ml-7">
                  <div>
                    <label className="label">Login email *</label>
                    <input type="email" className="input" required={createAccount}
                      value={account.email}
                      onChange={(e) => setAccount({ ...account, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input type="password" className="input" required={createAccount} minLength={6}
                      value={account.password}
                      onChange={(e) => setAccount({ ...account, password: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Drivers;
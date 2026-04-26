import { useEffect, useState } from 'react';
import {
  Shield, UserCheck, UserX, ChevronDown,
  Users as UsersIcon, Plus, Loader2, X, Trash2, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  driver:  'bg-amber-100 text-amber-800',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'manager', phone: '' };

const Users = () => {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // user to confirm delete
  const [deleting, setDeleting]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Add member ──────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/register', form);
      toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created successfully`);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create account');
    } finally {
      setSaving(false);
    }
  };

  // ── Role change ──────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u._id === data._id ? { ...u, role: data.role } : u)));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role change failed');
    }
  };

  // ── Activate / Deactivate ────────────────────────────────
  const handleToggleActive = async (userId) => {
    try {
      const { data } = await api.put(`/auth/users/${userId}/active`);
      setUsers((prev) => prev.map((u) => (u._id === data._id ? { ...u, active: data.active } : u)));
      toast.success(data.active ? 'User activated' : 'User deactivated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  // ── Delete member ────────────────────────────────────────
  const confirmDelete = (u) => setDeleteTarget(u);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team members</h1>
          <p className="text-slate-600 mt-1">Add new members or remove members who have left the company</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          <UserPlus size={16} /> Add member
        </button>
      </div>

      {/* Role legend cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-purple-600" />
            <span className="font-semibold text-slate-900">Admin</span>
          </div>
          <p className="text-xs text-slate-500">Full access — manage users, delete anything, all operations.</p>
        </div>
        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={16} className="text-blue-600" />
            <span className="font-semibold text-slate-900">Manager</span>
          </div>
          <p className="text-xs text-slate-500">Create shipments, assign vehicles & drivers, update statuses.</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <UsersIcon size={16} className="text-amber-600" />
            <span className="font-semibold text-slate-900">Driver</span>
          </div>
          <p className="text-xs text-slate-500">View and progress their own assigned shipments only.</p>
        </div>
      </div>

      {/* Users table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">All members</h3>
          <span className="text-sm text-slate-500">{users.length} total</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400">No members found</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className={!u.active ? 'opacity-50' : ''}>
                    <td className="font-medium text-slate-900">
                      {u.name}
                      {u._id === me._id && (
                        <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">you</span>
                      )}
                    </td>
                    <td className="text-slate-600 text-sm">{u.email}</td>
                    <td>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      {u._id !== me._id && (
                        <div className="flex items-center justify-end gap-2">

                          {/* Role selector */}
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-6 bg-white text-slate-700 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="driver">Driver</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>

                          {/* Activate / Deactivate */}
                          <button
                            onClick={() => handleToggleActive(u._id)}
                            title={u.active ? 'Deactivate account' : 'Activate account'}
                            className={`p-1.5 rounded-lg transition-colors ${u.active
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                          >
                            {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>

                          {/* Delete — permanent removal */}
                          <button
                            onClick={() => confirmDelete(u)}
                            title="Remove member permanently"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Member Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-primary-600" />
                <h2 className="text-lg font-semibold text-slate-900">Add new member</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Full name *</label>
                  <input
                    className="input" required
                    placeholder="e.g. Rajesh Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Email address *</label>
                  <input
                    type="email" className="input" required
                    placeholder="e.g. rajesh@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input
                    type="password" className="input" required minLength={6}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Role *</label>
                  <select
                    className="input" value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="manager">Manager — can manage shipments & drivers</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    To add a driver, go to the Drivers page and use "Add driver".
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving
                    ? <><Loader2 className="animate-spin" size={14} /> Adding…</>
                    : <><UserPlus size={14} /> Add member</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Remove member</h2>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="font-medium text-slate-900">{deleteTarget.name}</p>
                <p className="text-sm text-slate-500">{deleteTarget.email}</p>
                <span className={`mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[deleteTarget.role]}`}>
                  {deleteTarget.role}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-5">
                This will permanently delete <span className="font-semibold">{deleteTarget.name}'s</span> account.
                They will no longer be able to log in to the portal.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="btn-secondary flex-1"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <><Loader2 className="animate-spin" size={14} /> Removing…</>
                    : <><Trash2 size={14} /> Yes, remove member</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
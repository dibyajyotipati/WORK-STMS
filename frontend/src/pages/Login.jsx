import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@stms.com', password: 'Admin@123' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg mb-4">
            <Truck size={28} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome to STMS</h1>
          <p className="text-slate-600 mt-2">Smart Transport Management System</p>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <strong>Demo credentials:</strong> admin@stms.com / Admin@123
        </div>
      </div>
    </div>
  );
};

export default Login;
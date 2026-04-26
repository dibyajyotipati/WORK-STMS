import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DriverDashboard from './pages/DriverDashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Users from './pages/Users';

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'driver' ? <DriverDashboard /> : <Dashboard />;
};

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Only public route is login */}
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<RootRedirect />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />

        {/* Admin + Manager only */}
        {user?.role !== 'driver' && (
          <>
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/drivers" element={<Drivers />} />
          </>
        )}

        {/* Admin only */}
        {user?.role === 'admin' && (
          <Route path="/users" element={<Users />} />
        )}
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
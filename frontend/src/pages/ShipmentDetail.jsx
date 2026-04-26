import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  User,
  Fuel,
  Clock,
  Route as RouteIcon,
  CheckCircle,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

// Actions per role per status
const ACTIONS_BY_ROLE = {
  admin: {
    booked: [
      { status: 'assigned', label: 'Assign', icon: User },
      { status: 'cancelled', label: 'Cancel', icon: XCircle, danger: true },
    ],
    assigned: [
      { status: 'in_transit', label: 'Start trip', icon: PlayCircle },
      { status: 'cancelled', label: 'Cancel', icon: XCircle, danger: true },
    ],
    in_transit: [{ status: 'delivered', label: 'Mark delivered', icon: CheckCircle }],
    delivered: [],
    cancelled: [],
  },
  manager: {
    booked: [
      { status: 'assigned', label: 'Assign', icon: User },
      { status: 'cancelled', label: 'Cancel', icon: XCircle, danger: true },
    ],
    assigned: [
      { status: 'in_transit', label: 'Start trip', icon: PlayCircle },
      { status: 'cancelled', label: 'Cancel', icon: XCircle, danger: true },
    ],
    in_transit: [{ status: 'delivered', label: 'Mark delivered', icon: CheckCircle }],
    delivered: [],
    cancelled: [],
  },
  // Drivers can only progress their own trip, cannot cancel or assign
  driver: {
    assigned: [{ status: 'in_transit', label: 'Start trip', icon: PlayCircle }],
    in_transit: [{ status: 'delivered', label: 'Mark delivered', icon: CheckCircle }],
    booked: [],
    delivered: [],
    cancelled: [],
  },
};

const Field = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3">
    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900 truncate">{value || '—'}</p>
    </div>
  </div>
);

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assign, setAssign] = useState({ vehicleId: '', driverId: '' });
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/shipments/${id}`);
      setShipment(data);
    } catch (err) {
      toast.error('Shipment not found');
      navigate('/shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  const doTransition = async (status) => {
    if (status === 'assigned') return openAssign();
    if (status === 'cancelled' && !confirm('Cancel this shipment?')) return;
    setActing(true);
    try {
      const { data } = await api.put(`/shipments/${id}/status`, { status });
      setShipment(data);
      toast.success(`Status → ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setActing(false);
    }
  };

  const openAssign = async () => {
    setAssign({ vehicleId: shipment.vehicleId?._id || '', driverId: shipment.driverId?._id || '' });
    setAssignOpen(true);
    try {
      const [v, d] = await Promise.all([
        api.get('/vehicles', { params: { status: 'idle' } }),
        api.get('/drivers', { params: { status: 'available' } }),
      ]);
      setVehicles(v.data);
      setDrivers(d.data);
    } catch (err) {
      toast.error('Could not load options');
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assign.vehicleId || !assign.driverId) {
      toast.error('Select both vehicle and driver');
      return;
    }
    setActing(true);
    try {
      const { data } = await api.put(`/shipments/${id}/assign`, assign);
      setShipment(data);
      setAssignOpen(false);
      toast.success('Resources assigned');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!shipment) return null;

  const actions = (ACTIONS_BY_ROLE[user?.role] || ACTIONS_BY_ROLE.manager)[shipment.status] || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/shipments" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft size={16} /> Back to shipments
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-primary-700">{shipment.trackingId}</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{shipment.customerName}</h1>
            <p className="text-slate-600 mt-1">{shipment.source} → {shipment.destination}</p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>
      </div>

      {actions.length > 0 && (
        <div className="card card-body flex flex-wrap gap-3">
          {actions.map(({ status, label, icon: Icon, danger }) => (
            <button
              key={status}
              onClick={() => doTransition(status)}
              disabled={acting}
              className={danger ? 'btn-danger' : 'btn-primary'}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Route & cargo</h3></div>
          <div className="card-body space-y-4">
            <Field icon={MapPin} label="Source" value={shipment.source} />
            <Field icon={MapPin} label="Destination" value={shipment.destination} />
            <Field icon={RouteIcon} label="Distance" value={`${shipment.distanceKm?.toFixed(1) || 0} km`} />
            <Field icon={Clock} label="Estimated duration" value={`${shipment.durationMin?.toFixed(0) || 0} min`} />
            <Field icon={Package} label="Cargo" value={`${shipment.cargoType} — ${shipment.weightKg} kg`} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Assignment & AI estimates</h3></div>
          <div className="card-body space-y-4">
            <Field
              icon={Truck}
              label="Vehicle"
              value={
                shipment.vehicleId
                  ? `${shipment.vehicleId.vehicleNumber} (${shipment.vehicleId.type})`
                  : 'Not assigned'
              }
            />
            <Field
              icon={User}
              label="Driver"
              value={
                shipment.driverId
                  ? `${shipment.driverId.name} — ${shipment.driverId.phone}`
                  : 'Not assigned'
              }
            />
            <Field
              icon={Fuel}
              label="Fuel estimate"
              value={
                shipment.fuelEstimateLitres
                  ? `${shipment.fuelEstimateLitres.toFixed(2)} L (₹${shipment.fuelCostEstimate?.toFixed(0)})`
                  : '—'
              }
            />
            {shipment.fareAmount > 0 && (
              <Field icon={Package} label="Fare" value={`₹${shipment.fareAmount.toLocaleString('en-IN')}`} />
            )}
          </div>
        </div>
      </div>

      {(shipment.notes || shipment.startTime || shipment.endTime) && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Timeline & notes</h3></div>
          <div className="card-body space-y-2 text-sm">
            {shipment.startTime && (
              <p><span className="text-slate-500">Started:</span> {new Date(shipment.startTime).toLocaleString()}</p>
            )}
            {shipment.endTime && (
              <p><span className="text-slate-500">Delivered:</span> {new Date(shipment.endTime).toLocaleString()}</p>
            )}
            {shipment.notes && (
              <p className="pt-2 border-t border-slate-100"><span className="text-slate-500">Notes:</span> {shipment.notes}</p>
            )}
          </div>
        </div>
      )}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign vehicle & driver">
        <form onSubmit={submitAssign} className="space-y-4">
          <div>
            <label className="label">Vehicle</label>
            <select
              className="input"
              required
              value={assign.vehicleId}
              onChange={(e) => setAssign({ ...assign, vehicleId: e.target.value })}
            >
              <option value="">— select —</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber} ({v.type}, cap {v.capacity} kg)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Driver</label>
            <select
              className="input"
              required
              value={assign.driverId}
              onChange={(e) => setAssign({ ...assign, driverId: e.target.value })}
            >
              <option value="">— select —</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>{d.name} — {d.phone}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAssignOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={acting} className="btn-primary">
              {acting ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShipmentDetail;
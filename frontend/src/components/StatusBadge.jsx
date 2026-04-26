const STATUS_STYLES = {
  // shipment
  booked: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  // vehicle
  active: 'bg-emerald-100 text-emerald-700',
  idle: 'bg-slate-100 text-slate-700',
  maintenance: 'bg-amber-100 text-amber-700',
  // driver
  available: 'bg-emerald-100 text-emerald-700',
  on_trip: 'bg-blue-100 text-blue-700',
  off_duty: 'bg-slate-100 text-slate-700',
};

const StatusBadge = ({ status }) => {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700';
  const label = (status || '').replace(/_/g, ' ');
  return <span className={`badge ${cls} capitalize`}>{label}</span>;
};

export default StatusBadge;

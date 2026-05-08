// SparkWash Center App — data.js
// Static reference data (wash types, labels, slot times)

const WASH_TYPES = ['water', 'dry', 'steam', 'd2d'];

const WASH_LABELS = {
  water: { label: 'Water Wash', icon: '💧' },
  dry:   { label: 'Dry Wash',   icon: '🌬️' },
  steam: { label: 'Steam Wash', icon: '♨️' },
  d2d:   { label: 'Door-to-Door', icon: '🚗' },
};

const STATUS_META = {
  new:       { label: 'New',       icon: '🆕', badge: 'badge-new',       next: 'confirmed', nextLabel: 'Accept',      reject: true  },
  confirmed: { label: 'Confirmed', icon: '✅', badge: 'badge-confirmed', next: 'arrived',   nextLabel: 'Mark Arrived',reject: true  },
  arrived:   { label: 'Arrived',   icon: '🚗', badge: 'badge-arrived',   next: 'washing',   nextLabel: 'Start Wash',  reject: false },
  washing:   { label: 'Washing',   icon: '🔄', badge: 'badge-washing',   next: 'done',      nextLabel: 'Mark Done',   reject: false },
  done:      { label: 'Done',      icon: '✨', badge: 'badge-done',      next: null,        nextLabel: null,          reject: false },
  cancelled: { label: 'Cancelled', icon: '❌', badge: 'badge-cancelled', next: null,        nextLabel: null,          reject: false },
};

const SLOT_TIMES = [
  '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM',
  '03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM',
];

function todayLabel() {
  const d = new Date();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

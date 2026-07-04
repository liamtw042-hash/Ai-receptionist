import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, List, Plus, X, Phone, MapPin, Clock, FileText, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Search, DollarSign, Loader2,
  Trash2, CalendarClock, Briefcase,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks, isSameDay, isSameMonth, isToday,
  format,
} from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { staggerContainer, staggerItem, instantContainer, instantItem } from '../lib/motion';
import { clsx } from 'clsx';

type JobStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled';

interface Job {
  id: string;
  customerName: string;
  customerPhone: string;
  jobType: string;
  address?: string;
  notes?: string;
  quoteGiven?: string;
  status: JobStatus;
  scheduledStart: string;
  scheduledEnd: string;
  source: 'call' | 'manual';
  callId?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<JobStatus, { label: string; dot: string; badge: string }> = {
  booked:    { label: 'Booked',    dot: 'bg-blue-400',   badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  completed: { label: 'Completed', dot: 'bg-gray-400',   badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400',    badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const STATUS_FILTERS: Array<{ key: 'all' | JobStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function fmtPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  if (clean.length === 10 && clean.startsWith('0')) return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  return num;
}

function fmtTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso), e = new Date(endIso);
  const sameMeridiem = format(s, 'a') === format(e, 'a');
  return `${format(s, sameMeridiem ? 'h:mm' : 'h:mm a')} – ${format(e, 'h:mm a')}`;
}

function fmtDayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return 'Tomorrow';
  return format(d, 'EEEE d MMMM');
}

function dayKey(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

function toLocalInputDate(iso: string): string { return format(new Date(iso), 'yyyy-MM-dd'); }
function toLocalInputTime(iso: string): string { return format(new Date(iso), 'HH:mm'); }

// ── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', meta.badge)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

// ── Job card (list view) ────────────────────────────────────────────────────
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const isTerminal = job.status === 'completed' || job.status === 'cancelled';
  const accent = STATUS_META[job.status].dot; // reuse the status colour as a left rail
  const reduce = useReducedMotion();
  return (
    <motion.button variants={reduce ? instantItem : staggerItem} onClick={onClick}
      className={clsx(
        'group relative w-full text-left glass rounded-xl p-4 pl-5 border border-white/8 hover:border-orange-500/30 hover:bg-white/[0.03] transition-all duration-150 overflow-hidden hover:-translate-y-px',
        isTerminal && 'opacity-60 hover:opacity-90'
      )}>
      {/* Status colour rail */}
      <span className={clsx('absolute left-0 top-3 bottom-3 w-1 rounded-r-full', accent)} />
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className={clsx('text-sm font-semibold text-white truncate', job.status === 'cancelled' && 'line-through decoration-gray-600')}>
            {job.customerName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{fmtPhone(job.customerPhone)}</p>
        </div>
        <StatusPill status={job.status} />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-200 mb-1.5">
        <Briefcase size={13} className="text-gray-500 flex-shrink-0" />
        <span className="truncate font-medium">{job.jobType}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Clock size={11} />{fmtTimeRange(job.scheduledStart, job.scheduledEnd)}</span>
        {job.address && <span className="flex items-center gap-1.5 truncate max-w-[200px]"><MapPin size={11} />{job.address}</span>}
        {job.quoteGiven && <span className="flex items-center gap-1.5"><DollarSign size={11} />{job.quoteGiven}</span>}
      </div>
      {job.notes && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2 border-t border-white/6 pt-2">{job.notes}</p>
      )}
    </motion.button>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function ListView({ jobs, onSelect, filtered, onNewJob, reduceMotion }: {
  jobs: Job[]; onSelect: (j: Job) => void; filtered: boolean; onNewJob: () => void; reduceMotion: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      const key = dayKey(job.scheduledStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [jobs]);

  if (jobs.length === 0) {
    // Distinguish "your filter matched nothing" from "you have no jobs at all".
    return filtered ? (
      <div className="py-16 text-center">
        <div className="w-14 h-14 bg-white/4 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/8">
          <Search size={24} className="text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-400">No jobs match your filters</p>
        <p className="text-xs text-gray-600 mt-1">Try clearing the search or switching status.</p>
      </div>
    ) : (
      <div className="relative overflow-hidden rounded-2xl border border-white/8 py-14 px-6 text-center"
        style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 0%,rgba(249,115,22,0.07),transparent 70%)' }}>
        <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarClock size={30} className="text-orange-400" />
        </div>
        <p className="text-base font-bold text-white">No jobs on the board yet</p>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
          When your AI books a caller in, the job lands here automatically — with their details, the quote given and your notes.
          Booked one over the phone yourself? Add it manually.
        </p>
        <div className="flex items-center justify-center gap-2 mt-5">
          <Button onClick={onNewJob}><Plus size={15} /> Add your first job</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6"
      variants={reduceMotion ? instantContainer : staggerContainer(0.04)}
      initial="hidden" animate="show">
      {grouped.map(([key, dayJobs]) => (
        <div key={key}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
            {fmtDayLabel(new Date(dayJobs[0].scheduledStart))}
          </p>
          <div className="space-y-2.5">
            {dayJobs.map(job => <JobCard key={job.id} job={job} onClick={() => onSelect(job)} />)}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ── Month calendar ───────────────────────────────────────────────────────────
function MonthGrid({ anchorDate, jobs, onSelectJob, onSelectDay }: {
  anchorDate: Date; jobs: Job[]; onSelectJob: (j: Job) => void; onSelectDay: (d: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate));
    const end = endOfWeek(endOfMonth(anchorDate));
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      const key = dayKey(job.scheduledStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return map;
  }, [jobs]);

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const key = format(d, 'yyyy-MM-dd');
          const dayJobs = jobsByDay.get(key) || [];
          const inMonth = isSameMonth(d, anchorDate);
          const today = isToday(d);
          const visible = dayJobs.slice(0, 3);
          const overflow = dayJobs.length - visible.length;
          return (
            <div key={key} role="button" tabIndex={0}
              onClick={() => onSelectDay(d)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectDay(d); } }}
              className={clsx(
                'min-h-[92px] sm:min-h-[108px] p-1.5 sm:p-2 border-b border-r border-white/5 text-left flex flex-col gap-1 transition-colors hover:bg-white/[0.03] cursor-pointer',
                i % 7 === 6 && 'border-r-0',
                !inMonth && 'opacity-35'
              )}>
              <span className={clsx(
                'text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0',
                today ? 'bg-orange-500 text-black' : 'text-gray-400'
              )}>
                {format(d, 'd')}
              </span>
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {visible.map(job => (
                  <button key={job.id} type="button"
                    onClick={e => { e.stopPropagation(); onSelectJob(job); }}
                    title={job.customerName}
                    className={clsx(
                      'flex items-center gap-1 sm:px-1.5 py-0.5 rounded text-[10px] font-medium truncate border text-left justify-center sm:justify-start',
                      STATUS_META[job.status].badge
                    )}>
                    <span className={clsx('w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full flex-shrink-0', STATUS_META[job.status].dot)} />
                    {/* Full name on wider cells; too cramped to be legible below sm, so just the dot there */}
                    <span className="truncate hidden sm:inline">{job.customerName}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-gray-600 px-1.5 text-center sm:text-left">+{overflow}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week calendar (time-block grid) ─────────────────────────────────────────
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 20;
const HOUR_HEIGHT = 56;

function WeekGrid({ anchorDate, jobs, onSelectJob }: { anchorDate: Date; jobs: Job[]; onSelectJob: (j: Job) => void }) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return eachDayOfInterval({ start, end: endOfWeek(anchorDate) });
  }, [anchorDate]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      const key = dayKey(job.scheduledStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return map;
  }, [jobs]);

  const topFor = (d: Date) => Math.max(0, (d.getHours() - GRID_START_HOUR) * HOUR_HEIGHT + (d.getMinutes() / 60) * HOUR_HEIGHT);
  const heightFor = (s: Date, e: Date) => Math.max(28, ((e.getTime() - s.getTime()) / 60000 / 60) * HOUR_HEIGHT);

  const weekHasJobs = weekDays.some(d => (jobsByDay.get(format(d, 'yyyy-MM-dd')) || []).length > 0);

  // Below sm, 7 equal-width day columns get crushed into ~40px each — too
  // narrow for a customer name + job type to be legible. Instead give each
  // day a sane minimum width and let the whole grid scroll horizontally, the
  // way mobile calendar apps handle a week view.
  const gridTemplate = '48px repeat(7, minmax(84px, 1fr))';

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 48 + 7 * 84 }}>
          {/* Day headers */}
          <div className="grid border-b border-white/8" style={{ gridTemplateColumns: gridTemplate, background: 'rgba(255,255,255,0.02)' }}>
            <div />
            {weekDays.map(d => (
              <div key={d.toISOString()} className="py-2.5 text-center border-l border-white/5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{format(d, 'EEE')}</p>
                <p className={clsx(
                  'text-sm font-bold mt-0.5 w-6 h-6 mx-auto flex items-center justify-center rounded-full',
                  isToday(d) ? 'bg-orange-500 text-black' : 'text-white'
                )}>
                  {format(d, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto relative" style={{ maxHeight: '640px' }}>
            {!weekHasJobs && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-sm font-medium text-gray-500">Nothing booked this week</p>
                <p className="text-xs text-gray-700 mt-0.5">Jump to another week, or add a job</p>
              </div>
            )}
            <div className="grid relative" style={{ gridTemplateColumns: gridTemplate }}>
              {/* Hour labels column */}
              <div className="relative">
                {hours.map(h => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="text-right pr-2 -mt-2">
                    <span className="text-[10px] text-gray-600">{format(new Date(2000, 0, 1, h), 'ha')}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                const dayJobs = jobsByDay.get(key) || [];
                return (
                  <div key={key} className="relative border-l border-white/5" style={{ height: gridHeight }}>
                    {hours.map((h, idx) => (
                      <div key={h} className="absolute inset-x-0 border-t border-white/4" style={{ top: idx * HOUR_HEIGHT }} />
                    ))}
                    {dayJobs.map(job => {
                      const s = new Date(job.scheduledStart), e = new Date(job.scheduledEnd);
                      return (
                        <button key={job.id} onClick={() => onSelectJob(job)}
                          style={{ top: topFor(s), height: heightFor(s, e) }}
                          className={clsx(
                            'absolute inset-x-0.5 rounded-md px-1.5 py-1 text-left overflow-hidden border text-[10px] leading-tight transition-transform hover:scale-[1.02] hover:z-10',
                            STATUS_META[job.status].badge
                          )}>
                          <p className="font-semibold truncate">{job.customerName}</p>
                          <p className="truncate opacity-80">{job.jobType}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Job modal ────────────────────────────────────────────────────────────
function NewJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: (j: Job) => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', jobType: '', address: '',
    date: today, startTime: '09:00', endTime: '11:00', quoteGiven: '', notes: '',
  });

  const update = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setError('');
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.jobType.trim()) {
      setError('Customer name, phone, and job type are required.');
      return;
    }
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      const job = await api.post<Job>('/jobs', {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        jobType: form.jobType.trim(),
        address: form.address.trim(),
        quoteGiven: form.quoteGiven.trim(),
        notes: form.notes.trim(),
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      });
      showToast('Job added ✓');
      onCreated(job);
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#17191e] rounded-2xl border border-white/12 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 sticky top-0 bg-[#17191e] z-10">
          <h3 className="text-base font-bold text-white flex items-center gap-2"><Plus size={16} className="text-orange-400" /> New Job</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Customer name" value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder="Dave Smith" required />
            <Input label="Phone" type="tel" value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} placeholder="0400 000 000" required />
          </div>
          <Input label="Job type" value={form.jobType} onChange={e => update('jobType', e.target.value)} placeholder="Hot water system replacement" required />
          <Input label="Address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Example St, Newcastle NSW" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={e => update('date', e.target.value)} />
            <Input label="Start" type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
            <Input label="End" type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} />
          </div>
          <Input label="Quote given (optional)" value={form.quoteGiven} onChange={e => update('quoteGiven', e.target.value)} placeholder="$450–$600" />
          <Textarea label="Notes (optional)" value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Anything the customer mentioned…" />
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/8">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} type="button"><Plus size={15} /> Add job</Button>
        </div>
      </div>
    </div>
  );
}

// ── Job detail slide-over panel ─────────────────────────────────────────────
function JobDetailPanel({ job, onClose, onUpdated, onDeleted }: {
  job: Job; onClose: () => void; onUpdated: (j: Job) => void; onDeleted: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState<'complete' | 'cancel' | 'reschedule' | 'delete' | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [resched, setResched] = useState({
    date: toLocalInputDate(job.scheduledStart),
    startTime: toLocalInputTime(job.scheduledStart),
    endTime: toLocalInputTime(job.scheduledEnd),
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const patchStatus = async (status: JobStatus, which: 'complete' | 'cancel') => {
    setUpdating(which);
    try {
      const updated = await api.patch<Job>(`/jobs/${job.id}`, { status });
      onUpdated(updated);
      showToast(status === 'completed' ? 'Job marked complete ✓' : 'Job cancelled');
    } catch (err: any) {
      showToast(err.message || 'Failed to update job', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const saveReschedule = async () => {
    const start = new Date(`${resched.date}T${resched.startTime}`);
    const end = new Date(`${resched.date}T${resched.endTime}`);
    if (end <= start) { showToast('End time must be after start time', 'error'); return; }
    setUpdating('reschedule');
    try {
      const updated = await api.patch<Job>(`/jobs/${job.id}`, {
        scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(),
        status: job.status === 'cancelled' ? 'booked' : job.status,
      });
      onUpdated(updated);
      setRescheduling(false);
      showToast('Job rescheduled ✓');
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job permanently? This can\'t be undone.')) return;
    setUpdating('delete');
    try {
      await api.delete(`/jobs/${job.id}`);
      showToast('Job deleted');
      onDeleted(job.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete job', 'error');
      setUpdating(null);
    }
  };

  const isTerminal = job.status === 'completed' || job.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-[9990]">
      <div className={clsx('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')} onClick={handleClose} />
      <div className={clsx(
        'absolute inset-y-0 right-0 w-full sm:w-[440px] bg-[#0a0f1d] border-l border-white/10 shadow-2xl shadow-black/60 flex flex-col transition-transform duration-200 ease-out',
        visible ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-lg font-bold text-white truncate">{job.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{job.source === 'call' ? 'Booked by AI during a call' : 'Added manually'}</p>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white p-1 flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <StatusPill status={job.status} />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Phone size={15} className="text-orange-400 flex-shrink-0" />
              <a href={`tel:${job.customerPhone}`} className="font-medium hover:text-orange-400 transition-colors">{fmtPhone(job.customerPhone)}</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Briefcase size={15} className="text-gray-500 flex-shrink-0" />
              <span>{job.jobType}</span>
            </div>
            {job.address && (
              <div className="flex items-center gap-3 text-sm text-gray-200">
                <MapPin size={15} className="text-gray-500 flex-shrink-0" />
                <span>{job.address}</span>
              </div>
            )}
            {job.quoteGiven && (
              <div className="flex items-center gap-3 text-sm text-gray-200">
                <DollarSign size={15} className="text-gray-500 flex-shrink-0" />
                <span>{job.quoteGiven}</span>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="glass rounded-xl p-4 border border-white/8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</p>
              {!rescheduling && !isTerminal && (
                <button onClick={() => setRescheduling(true)} className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1">
                  <CalendarClock size={11} /> Reschedule
                </button>
              )}
            </div>
            {rescheduling ? (
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Date" type="date" value={resched.date} onChange={e => setResched(r => ({ ...r, date: e.target.value }))} className="!py-2 !px-2.5 text-xs" />
                  <Input label="Start" type="time" value={resched.startTime} onChange={e => setResched(r => ({ ...r, startTime: e.target.value }))} className="!py-2 !px-2.5 text-xs" />
                  <Input label="End" type="time" value={resched.endTime} onChange={e => setResched(r => ({ ...r, endTime: e.target.value }))} className="!py-2 !px-2.5 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveReschedule} loading={updating === 'reschedule'} type="button">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRescheduling(false)} type="button">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-white font-medium mt-1">{format(new Date(job.scheduledStart), 'EEEE d MMMM yyyy')}</p>
                <p className="text-sm text-gray-400">{fmtTimeRange(job.scheduledStart, job.scheduledEnd)}</p>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText size={11} /> Notes from the call</p>
            <p className="text-sm text-gray-300 leading-relaxed glass rounded-xl p-4 border border-white/8">
              {job.notes || 'No notes captured for this job.'}
            </p>
          </div>

          <p className="text-[11px] text-gray-700">Added {format(new Date(job.createdAt), 'd MMM yyyy, h:mm a')}</p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-white/8 flex-shrink-0 space-y-2">
          {!isTerminal ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => patchStatus('completed', 'complete')} loading={updating === 'complete'} type="button">
                <CheckCircle size={15} /> Mark complete
              </Button>
              <Button variant="danger" onClick={() => patchStatus('cancelled', 'cancel')} loading={updating === 'cancel'} type="button">
                <XCircle size={15} /> Cancel
              </Button>
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center py-1">
              This job is {STATUS_META[job.status].label.toLowerCase()} — no further actions needed.
            </p>
          )}
          <button onClick={handleDelete} disabled={updating === 'delete'}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors py-1.5 disabled:opacity-50">
            {updating === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JobsPage() {
  useEffect(() => { document.title = 'Jobs | TradeDesk'; }, []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const reduceMotion = !!useReducedMotion();

  useEffect(() => {
    api.get<Job[]>('/jobs')
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return j.customerName.toLowerCase().includes(q) || j.customerPhone.includes(q) || j.jobType.toLowerCase().includes(q);
    }).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  }, [jobs, search, statusFilter]);

  const handleCreated = (job: Job) => { setJobs(js => [...js, job]); setShowNewJob(false); };
  const handleUpdated = (job: Job) => {
    setJobs(js => js.map(j => j.id === job.id ? job : j));
    setSelectedJob(job);
  };
  const handleDeleted = (id: string) => {
    setJobs(js => js.filter(j => j.id !== id));
    setSelectedJob(null);
  };

  const navPrev = () => setAnchorDate(d => calendarMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1));
  const navNext = () => setAnchorDate(d => calendarMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1));
  const navToday = () => setAnchorDate(new Date());

  const rangeLabel = calendarMode === 'month'
    ? format(anchorDate, 'MMMM yyyy')
    : `${format(startOfWeek(anchorDate), 'd MMM')} – ${format(endOfWeek(anchorDate), 'd MMM yyyy')}`;

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-none">Jobs</h1>
          <p className="text-gray-500 text-sm mt-1.5">Every booked job in one place</p>
        </div>
        <button onClick={() => setShowNewJob(true)}
          className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm px-4 py-2 rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-[0.97] min-h-[38px]">
          <Plus size={15} /> New Job
        </button>
      </div>

      {/* View toggle + calendar nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 glass rounded-xl p-1 border border-white/8 w-fit">
          <button onClick={() => setView('list')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all', view === 'list' ? 'bg-orange-500 text-black shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <List size={13} /> List
          </button>
          <button onClick={() => setView('calendar')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all', view === 'calendar' ? 'bg-orange-500 text-black shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <Calendar size={13} /> Calendar
          </button>
        </div>

        {view === 'calendar' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 glass rounded-xl p-1 border border-white/8">
              <button onClick={() => setCalendarMode('week')}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold transition-all', calendarMode === 'week' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300')}>Week</button>
              <button onClick={() => setCalendarMode('month')}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold transition-all', calendarMode === 'month' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300')}>Month</button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={navPrev} className="w-8 h-8 rounded-lg glass border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
              <button onClick={navToday} className="px-3 h-8 rounded-lg glass border border-white/8 text-xs font-medium text-gray-300 hover:text-white transition-colors">Today</button>
              <button onClick={navNext} className="w-8 h-8 rounded-lg glass border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
            </div>
            <span className="text-sm font-semibold text-white">{rangeLabel}</span>
          </div>
        )}

        {view === 'list' && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…"
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            {/* Filter pills scroll horizontally rather than overflow the row on
                a narrow (~390px) phone. */}
            <div className="flex items-center gap-1 glass rounded-xl p-1 border border-white/8 overflow-x-auto max-w-full no-scrollbar">
              {STATUS_FILTERS.map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0', statusFilter === f.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2.5">{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : view === 'list' ? (
        <ListView jobs={filtered} onSelect={setSelectedJob}
          filtered={search.trim() !== '' || statusFilter !== 'all'}
          onNewJob={() => setShowNewJob(true)} reduceMotion={reduceMotion} />
      ) : calendarMode === 'month' ? (
        <MonthGrid anchorDate={anchorDate} jobs={jobs} onSelectJob={setSelectedJob}
          onSelectDay={d => { setAnchorDate(d); setCalendarMode('week'); }} />
      ) : (
        <WeekGrid anchorDate={anchorDate} jobs={jobs} onSelectJob={setSelectedJob} />
      )}

      {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} onCreated={handleCreated} />}
      {selectedJob && (
        <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      )}
    </div>
  );
}

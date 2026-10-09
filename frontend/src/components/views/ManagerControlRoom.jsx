import { useState } from 'react'
import {
  Users, AlertTriangle, CloudLightning, Activity, Search,
  MapPin, CheckCircle2, Clock, Wifi, Eye, RefreshCw,
  ArrowUpRight, Shield, Gauge, TrendingUp, Filter, ChevronDown,
  Siren, Radio, Zap, XCircle,
} from 'lucide-react'

/* ─── Data ──────────────────────────────────────────────────── */
const WORKERS = [
  { id:'LAB-8842', name:'Ramesh Kumar',    pit:'Pit 4 – UG Zone B',  status:'certified',  checkin:'06:00 AM', zone:'Zone B-2', active:true },
  { id:'LAB-7731', name:'Suresh Yadav',    pit:'Pit 2 – Open Cast',  status:'renewal',    checkin:'06:15 AM', zone:'Zone A-1', active:true },
  { id:'LAB-9213', name:'Mohan Tiwari',    pit:'Pit 7 – UG Zone A',  status:'certified',  checkin:'06:05 AM', zone:'Zone A-3', active:true },
  { id:'LAB-6654', name:'Anil Sharma',     pit:'Pit 4 – UG Zone B',  status:'certified',  checkin:'06:30 AM', zone:'Zone B-4', active:true },
  { id:'LAB-4421', name:'Vijay Singh',     pit:'Pit 1 – Surface',    status:'renewal',    checkin:'07:00 AM', zone:'Surface',  active:false },
  { id:'LAB-5580', name:'Deepak Mishra',   pit:'Pit 3 – Deep Shaft', status:'certified',  checkin:'06:00 AM', zone:'Level 3',  active:true },
  { id:'LAB-3310', name:'Santosh Pandey',  pit:'Pit 5 – Open Cast',  status:'certified',  checkin:'06:20 AM', zone:'Zone C-1', active:true },
  { id:'LAB-2295', name:'Rajesh Gupta',    pit:'Pit 6 – Prep Plant', status:'renewal',    checkin:'07:15 AM', zone:'Plant A',  active:true },
]

const ALERTS = [
  { id:1, time:'18:42:11', worker:'LAB-8842 · Ramesh Kumar', location:'Pit 4 – Zone B-2', type:'SOS Triggered',     severity:'critical', icon:Siren },
  { id:2, time:'18:39:05', worker:'LAB-7731 · Suresh Yadav', location:'Pit 2 – Zone A-1', type:'Gas Level Spike',   severity:'high',     icon:AlertTriangle },
  { id:3, time:'18:31:22', worker:'System Alert',             location:'Pit 3 – Level 3',  type:'Equipment Fault',  severity:'medium',   icon:Zap },
  { id:4, time:'18:15:00', worker:'LAB-9213 · Mohan Tiwari', location:'Pit 7 – Zone A-3', type:'Check-in Missed',  severity:'low',      icon:Clock },
  { id:5, time:'17:58:44', worker:'LAB-6654 · Anil Sharma',  location:'Pit 4 – Zone B-4', type:'Hazard Reported',  severity:'medium',   icon:AlertTriangle },
]

const severityConfig = {
  critical: { bg:'bg-red-500/15', text:'text-red-400', border:'border-red-500/30',    badge:'bg-red-500/20 text-red-400',      dot:'bg-red-400' },
  high:     { bg:'bg-orange-500/15', text:'text-orange-400', border:'border-orange-500/30', badge:'bg-orange-500/20 text-orange-400', dot:'bg-orange-400' },
  medium:   { bg:'bg-amber-500/15', text:'text-amber-400', border:'border-amber-500/30',   badge:'bg-amber-500/20 text-amber-400',   dot:'bg-amber-400' },
  low:      { bg:'bg-blue-500/15', text:'text-blue-400', border:'border-blue-500/30',     badge:'bg-blue-500/20 text-blue-400',     dot:'bg-blue-400' },
}

/* ─── KPI Gauge ─────────────────────────────────────────────── */
function RiskGauge({ score }) {
  const angle = (score / 100) * 180 - 90
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'
  const label = score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MODERATE' : 'LOW RISK'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-20 overflow-hidden">
        {/* Arc track */}
        <svg viewBox="0 0 144 80" className="w-full h-full">
          <path d="M 10 72 A 62 62 0 0 1 134 72" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <path d="M 10 72 A 62 62 0 0 1 134 72" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${score * 1.95} 195`} opacity="0.9" />
        </svg>
        {/* Needle */}
        <div className="absolute inset-0 flex items-end justify-center pb-1"
          style={{ transformOrigin:'center bottom' }}>
          <div className="relative" style={{ transform:`rotate(${angle}deg)`, transformOrigin:'bottom center', height:'52px' }}>
            <div className="w-0.5 h-full rounded-full mx-auto" style={{ background:color }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 bg-slate-900" style={{ borderColor:color }} />
          </div>
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{score}%</p>
      <span className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold`}
        style={{ background:`${color}20`, color }}>{label}</span>
    </div>
  )
}

/* ─── KPI Card ──────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 p-4 sm:p-5 relative overflow-hidden" style={{ background:'#0d1520' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 pointer-events-none"
        style={{ background:`radial-gradient(circle, ${color} 0%, transparent 70%)`, transform:'translate(30%,-30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:`${color}20`, border:`1px solid ${color}40` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color }}>
            <TrendingUp size={12} />{trend}
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-100 mb-0.5">{value}</p>
      <p className="text-xs sm:text-sm font-semibold text-slate-300">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── Main View ─────────────────────────────────────────────── */
export default function ManagerControlRoom() {
  const [search, setSearch]         = useState('')
  const [filterPit, setFilterPit]   = useState('')
  const [passportId, setPassportId] = useState(null)
  const [reassignId, setReassignId] = useState(null)

  const filtered = WORKERS.filter(w =>
    (w.name.toLowerCase().includes(search.toLowerCase()) || w.id.toLowerCase().includes(search.toLowerCase())) &&
    (!filterPit || w.pit.includes(filterPit))
  )

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Risk Gauge – special card */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-red-500/30 p-4 sm:p-5 flex flex-col items-center gap-1"
          style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.25) 0%,#0d1520 100%)' }}>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium self-start mb-2">AI Mine Risk Score</p>
          <RiskGauge score={78} />
          <p className="text-xs text-slate-400 mt-1 text-center">Based on 14 live parameters</p>
        </div>
        <KpiCard icon={Users}         label="Active Underground" value="142" sub="Labours checked in" color="#10b981" trend="+4" />
        <KpiCard icon={AlertTriangle} label="Safety Violations"  value="3"   sub="Unresolved reports"  color="#ef4444" trend="⚠" />
        <KpiCard icon={CloudLightning}label="Weather Warning"    value="HIGH" sub="Landslide + Flood risk" color="#f59e0b" />
      </div>

      {/* ── Roster Table ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(245,158,11,0.03) 0%,transparent 100%)' }}>
          <div className="flex items-center gap-2 mr-auto">
            <Users size={15} className="text-amber-400 shrink-0" />
            <h3 className="font-semibold text-slate-200 text-sm">Labour Roster & Qualification Table</h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">{WORKERS.length} Workers</span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers…"
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-600/40 bg-slate-800/60 text-slate-300 text-xs w-36 sm:w-44 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20" />
            </div>
            <select value={filterPit} onChange={e => setFilterPit(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-600/40 bg-slate-800/60 text-slate-400 text-xs focus:outline-none focus:border-amber-500/50">
              <option value="">All Pits</option>
              <option>Pit 4</option><option>Pit 2</option><option>Pit 7</option>
              <option>Pit 1</option><option>Pit 3</option><option>Pit 5</option><option>Pit 6</option>
            </select>
          </div>
        </div>

        {/* Table — scrollable on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-700/30">
                {['Worker','Assigned Pit','Qualification','Check-in','GPS Zone','Actions'].map(h => (
                  <th key={h} className="text-left px-4 sm:px-5 py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {filtered.map(w => (
                <tr key={w.id} className="hover:bg-slate-800/25 transition-colors group">
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-400">{w.name.split(' ').map(n=>n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{w.name}</p>
                        <p className="text-xs text-slate-400">{w.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{w.pit}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    {w.status === 'certified'
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"><CheckCircle2 size={10} />Certified</span>
                      : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25"><AlertTriangle size={10} />Renewal Needed</span>
                    }
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={11} className="text-slate-400" />{w.checkin}
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${w.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className={`text-xs font-medium ${w.active ? 'text-emerald-400' : 'text-slate-400'}`}>{w.zone}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPassportId(passportId === w.id ? null : w.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
                        <Eye size={11} />Passport
                      </button>
                      <button onClick={() => setReassignId(reassignId === w.id ? null : w.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                        <RefreshCw size={11} />Reassign
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">No workers match your search.</div>
          )}
        </div>
      </div>

      {/* Passport / Reassign popups */}
      {passportId && (
        <div className="rounded-2xl border border-blue-500/30 p-4 sm:p-5 space-y-3" style={{ background:'rgba(23,37,84,0.4)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-300 text-sm flex items-center gap-2"><Shield size={14} />Safety Passport — {passportId}</h4>
            <button onClick={() => setPassportId(null)} className="text-slate-400 hover:text-slate-300"><XCircle size={16} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {['DGMS Permit: Valid','Equipment Class A: Valid','Medical Fitness: ⚠️ 12 Days','Gas Rescue: Valid'].map(t => (
              <div key={t} className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-300">{t}</div>
            ))}
          </div>
        </div>
      )}
      {reassignId && (
        <div className="rounded-2xl border border-amber-500/30 p-4 sm:p-5 space-y-3" style={{ background:'rgba(92,51,0,0.25)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-amber-300 text-sm flex items-center gap-2"><MapPin size={14} />Reassign Pit — {reassignId}</h4>
            <button onClick={() => setReassignId(null)} className="text-slate-400 hover:text-slate-300"><XCircle size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Pit 1 – Surface','Pit 2 – Open Cast','Pit 4 – UG Zone B','Pit 5 – Open Cast','Pit 6 – Prep Plant'].map(p => (
              <button key={p} onClick={() => setReassignId(null)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/30 transition-colors">{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Live AI Incident Feed ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(239,68,68,0.04) 0%,transparent 100%)' }}>
          <Activity size={15} className="text-red-400 animate-pulse shrink-0" />
          <h3 className="font-semibold text-slate-200 text-sm">Live AI Incident & SOS Feed</h3>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-red-400 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />Live
          </span>
        </div>
        <div className="divide-y divide-slate-700/20">
          {ALERTS.map(alert => {
            const Icon = alert.icon
            const cfg = severityConfig[alert.severity]
            return (
              <div key={alert.id} className={`flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-800/20 transition-colors ${alert.severity === 'critical' ? 'bg-red-950/10' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}>
                  <Icon size={16} className={cfg.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-200 truncate">{alert.type}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>{alert.severity.toUpperCase()}</span>
                    {alert.severity === 'critical' && <span className="text-xs text-red-400 font-bold animate-pulse">● ACTIVE</span>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{alert.worker}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10} />{alert.location}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={10} />{alert.time}</span>
                  </div>
                </div>
                <button className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors">
                  Respond
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

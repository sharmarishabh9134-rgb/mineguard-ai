import { useState } from 'react'
import {
  Siren, MapPin, Clock, Ambulance, Heart, Wind,
  Stethoscope, Activity, CheckCircle2, AlertTriangle,
  Phone, Radio, Navigation, Bed, Pill, Zap, ChevronRight,
  User, XCircle, RefreshCw, ThermometerSun,
} from 'lucide-react'

/* ─── Data ──────────────────────────────────────────────────── */
const SOS_REQUESTS = [
  {
    id:'LAB-8842', name:'Ramesh Kumar', zone:'Pit 4 – Zone B-2',
    time:'18:42:11', eta:'8 min', facility:'Jharia Central Trauma Unit',
    status:'dispatched', severity:'critical', injury:'Suspected gas inhalation + collapse trauma',
  },
  {
    id:'LAB-7731', name:'Suresh Yadav', zone:'Pit 2 – Zone A-1',
    time:'18:39:05', eta:'12 min', facility:'Raniganj District Medical',
    status:'en-route', severity:'high', injury:'Head laceration – machinery impact',
  },
  {
    id:'LAB-5580', name:'Deepak Mishra', zone:'Pit 3 – Level 3',
    time:'18:31:22', eta:'20 min', facility:'SECL Mine Hospital – Korba',
    status:'pending', severity:'medium', injury:'Fracture – left arm, equipment fall',
  },
]

const ICU_ZONES = [
  { zone:'Jharia Central Trauma Unit',  total:12, avail:8,  oxygen:'48 cyl', status:'ready' },
  { zone:'Raniganj District Medical',    total:8,  avail:3,  oxygen:'22 cyl', status:'limited' },
  { zone:'SECL Mine Hospital – Korba',   total:10, avail:9,  oxygen:'60 cyl', status:'ready' },
  { zone:'Underground Trauma Post – Pit 4', total:4, avail:4, oxygen:'8 cyl', status:'standby' },
]

const severityConfig = {
  critical: { text:'text-red-400', badge:'bg-red-500/20 text-red-400 border-red-500/30', dot:'bg-red-400', border:'border-red-500/40', bg:'bg-red-950/10' },
  high:     { text:'text-orange-400', badge:'bg-orange-500/20 text-orange-400 border-orange-500/30', dot:'bg-orange-400', border:'border-orange-500/40', bg:'bg-orange-950/5' },
  medium:   { text:'text-amber-400', badge:'bg-amber-500/20 text-amber-400 border-amber-500/30', dot:'bg-amber-400', border:'border-amber-500/30', bg:'' },
}

const statusLabel = {
  dispatched: { label:'Ambulance Dispatched', color:'text-red-400', icon:Ambulance },
  'en-route': { label:'En Route to Facility',  color:'text-orange-400', icon:Navigation },
  pending:    { label:'Awaiting Dispatch',     color:'text-amber-400', icon:Clock },
}

/* ─── ICU Bed Bar ───────────────────────────────────────────── */
function BedBar({ total, avail }) {
  const pct = (avail / total) * 100
  const color = pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Bed Availability</span>
        <span className="font-bold" style={{ color }}>{avail} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  )
}

/* ─── Main View ─────────────────────────────────────────────── */
export default function MedicalDashboard() {
  const [selected, setSelected] = useState(null)
  const [dispatchId, setDispatch] = useState(null)

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">

      {/* ── Summary KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon:Siren,       label:'Active SOS',      value:'3',  color:'#ef4444', pulse:true },
          { icon:Ambulance,   label:'Dispatched Units', value:'2',  color:'#f59e0b' },
          { icon:Bed,         label:'ICU Beds Free',   value:'24', color:'#10b981' },
          { icon:Wind,        label:'Oxygen Cylinders',value:'138', color:'#60a5fa' },
        ].map(({ icon:Icon, label, value, color, pulse }) => (
          <div key={label} className="rounded-2xl border border-slate-700/50 p-4 relative overflow-hidden" style={{ background:'#0d1520' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 pointer-events-none"
              style={{ background:`radial-gradient(circle,${color} 0%,transparent 70%)`, transform:'translate(30%,-30%)' }} />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background:`${color}20`, border:`1px solid ${color}40` }}>
              <Icon size={16} style={{ color }} className={pulse ? 'animate-pulse' : ''} />
            </div>
            <p className="text-2xl font-black text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Active Rescue Status ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(239,68,68,0.05) 0%,transparent 100%)' }}>
          <Siren size={15} className="text-red-400 animate-pulse shrink-0" />
          <h3 className="font-semibold text-slate-200 text-sm">Active SOS Rescue Status</h3>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-red-400 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />Live Feed
          </span>
        </div>

        <div className="divide-y divide-slate-700/20">
          {SOS_REQUESTS.map(req => {
            const cfg = severityConfig[req.severity]
            const st = statusLabel[req.status]
            const StIcon = st.icon
            const isOpen = selected === req.id
            return (
              <div key={req.id} className={`transition-colors ${cfg.bg}`}>
                <button className="w-full flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-800/20 transition-colors text-left"
                  onClick={() => setSelected(isOpen ? null : req.id)}>
                  {/* Severity indicator */}
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${req.severity === 'critical' ? 'animate-pulse' : ''}`} style={{ marginTop:'6px' }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-slate-100 text-sm">{req.name}</span>
                      <span className="text-xs text-slate-500">· {req.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>{req.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1"><MapPin size={11} />{req.zone}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5"><Stethoscope size={11} />{req.injury}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={`flex items-center gap-1 text-xs font-semibold ${st.color}`}><StIcon size={11} />{st.label}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={10} />SOS at {req.time}</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><Navigation size={10} />ETA: {req.eta}</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className={`text-slate-600 shrink-0 transition-transform mt-1 ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-slate-700/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div className="rounded-xl border border-slate-700/30 p-3.5 bg-slate-800/30 space-y-1">
                        <p className="text-xs text-slate-500 font-medium">Routed Facility</p>
                        <p className="text-sm font-semibold text-slate-200">{req.facility}</p>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle2 size={11} />Trauma Unit Ready
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-700/30 p-3.5 bg-slate-800/30 space-y-1">
                        <p className="text-xs text-slate-500 font-medium">Ambulance ETA</p>
                        <p className="text-3xl font-black text-amber-400">{req.eta}</p>
                      </div>
                      <div className="rounded-xl border border-slate-700/30 p-3.5 bg-slate-800/30 flex flex-col gap-2">
                        <p className="text-xs text-slate-500 font-medium">Quick Actions</p>
                        <button className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors">
                          <Phone size={11} />Call Rescue Team
                        </button>
                        <button className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
                          <Radio size={11} />Radio Control Room
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Hospital Readiness ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(16,185,129,0.04) 0%,transparent 100%)' }}>
          <Heart size={15} className="text-emerald-400 shrink-0" />
          <h3 className="font-semibold text-slate-200 text-sm">Hospital & Medical Unit Readiness</h3>
          <span className="ml-auto"><span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">Updated 2 min ago</span></span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-700/20">
          {ICU_ZONES.map(z => {
            const statusColors = { ready:'text-emerald-400 bg-emerald-500/15 border-emerald-500/25', limited:'text-amber-400 bg-amber-500/15 border-amber-500/25', standby:'text-blue-400 bg-blue-500/15 border-blue-500/25' }
            const pct = z.avail / z.total
            return (
              <div key={z.zone} className="p-4 sm:p-5 bg-slate-800/10 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200 leading-tight">{z.zone}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 capitalize ${statusColors[z.status]}`}>{z.status}</span>
                </div>
                <BedBar total={z.total} avail={z.avail} />
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Wind size={11} className="text-cyan-400" />
                    <span>Oxygen:</span>
                    <span className="font-semibold text-cyan-400">{z.oxygen}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Activity size={11} className="text-emerald-400" />
                    <span>ICU Ready: <span className="font-semibold text-emerald-400">{z.avail} beds</span></span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick Dispatch Panel ── */}
      <div className="rounded-2xl border border-amber-500/20 p-4 sm:p-5"
        style={{ background:'linear-gradient(135deg,rgba(92,51,0,0.2) 0%,#0d1520 100%)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Ambulance size={15} className="text-amber-400" />
          <h3 className="font-semibold text-amber-300 text-sm">Emergency Dispatch Control</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['Dispatch Ambulance to Pit 4','Alert All Trauma Units','Mobilize Rescue Squad'].map(action => (
            <button key={action}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 hover:scale-[1.02] active:scale-95"
              style={{ background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.25)', color:'#f59e0b', boxShadow:'0 2px 15px rgba(245,158,11,0.1)' }}>
              <Zap size={14} />{action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import {
  HardHat, MapPin, ShieldCheck, CheckCircle2, AlertTriangle,
  Clock, Zap, CloudRain, Wind, Thermometer, Activity,
  FileText, BadgeAlert, Phone, Radio, User, Award,
  ChevronRight, Flame, Mountain, Timer,
} from 'lucide-react'

/* ─── Sub components ─────────────────────────────────────────── */
function Badge({ color, children }) {
  const colors = {
    green:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red:    'bg-red-500/15 text-red-400 border-red-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    slate:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[color] || colors.slate}`}>
      {children}
    </span>
  )
}

const CERTS = [
  { title:'DGMS Underground Safety Permit',      status:'valid',    expiry:'Valid · Expires Dec 2026' },
  { title:'Heavy Equipment Operation - Class A', status:'valid',    expiry:'Valid · Expires Aug 2026' },
  { title:'Medical Fitness Certificate',         status:'warning',  expiry:'⚠️ Expires in 12 Days' },
  { title:'First Aid & Gas Rescue Certification',status:'valid',    expiry:'Valid · Expires Mar 2027' },
]

/* ─── SOS Button with 3-sec hold ────────────────────────────── */
function SOSButton() {
  const [holding, setHolding]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [fired, setFired]       = useState(false)
  const intervalRef = useRef(null)

  const startHold = () => {
    if (fired) return
    setHolding(true)
    let p = 0
    intervalRef.current = setInterval(() => {
      p += 100 / 30
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(intervalRef.current)
        setFired(true)
        setHolding(false)
      }
    }, 100)
  }

  const endHold = () => {
    if (fired) return
    clearInterval(intervalRef.current)
    setHolding(false)
    setProgress(0)
  }

  const reset = () => { setFired(false); setProgress(0); setHolding(false) }

  return (
    <div className="text-center">
      {fired ? (
        <div className="rounded-2xl border border-red-500/50 bg-red-900/20 p-6 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center mx-auto">
            <Radio size={28} className="text-red-400 animate-pulse" />
          </div>
          <p className="text-red-300 font-bold text-lg">SOS ACTIVATED</p>
          <p className="text-slate-400 text-sm">Emergency broadcast sent to Control Room & Rescue Team</p>
          <div className="space-y-1.5 text-left bg-red-950/40 rounded-xl p-3 border border-red-500/20">
            <div className="flex items-center gap-2 text-xs text-red-300"><Radio size={11} className="animate-pulse" /><span>Broadcasting…</span></div>
            <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={11} /><span>GPS: Pit 4 – Underground Zone B</span></div>
            <div className="flex items-center gap-2 text-xs text-slate-400"><Phone size={11} /><span>Notified: Safety Officer + DGMS</span></div>
          </div>
          <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">Reset (demo)</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative inline-block">
            {/* Pulsing rings */}
            <div className={`absolute inset-0 rounded-full border-2 border-red-500 scale-125 ${holding ? '' : 'animate-ping opacity-30'}`} />
            <div className={`absolute inset-0 rounded-full border border-red-400 scale-150 ${holding ? '' : 'animate-ping opacity-20'} [animation-delay:0.5s]`} />
            {/* Main button */}
            <button
              onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
              onTouchStart={startHold} onTouchEnd={endHold}
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full font-black text-white select-none transition-transform duration-150 active:scale-95"
              style={{
                background: holding
                  ? `conic-gradient(#dc2626 ${progress * 3.6}deg, #7f1d1d ${progress * 3.6}deg)`
                  : 'radial-gradient(circle at 35% 35%, #ef4444, #991b1b)',
                boxShadow: holding
                  ? '0 0 40px rgba(239,68,68,0.8), inset 0 0 20px rgba(0,0,0,0.3)'
                  : '0 0 30px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.2), inset 0 0 20px rgba(0,0,0,0.3)',
                border: '3px solid rgba(239,68,68,0.6)',
              }}>
              <div className="flex flex-col items-center gap-1">
                <BadgeAlert size={28} />
                <span className="text-sm font-black tracking-widest">SOS</span>
                <span className="text-xs font-semibold opacity-80">EMERGENCY</span>
              </div>
            </button>
          </div>
          <p className="text-slate-500 text-xs">{holding ? `Hold… ${Math.round(progress / 100 * 3)}s / 3s` : 'Hold 3 seconds to trigger emergency'}</p>
        </div>
      )}
    </div>
  )
}

/* ─── View ──────────────────────────────────────────────────── */
export default function LabourDashboard() {
  const [hazardModal, setHazardModal] = useState(false)
  const [hazardType, setHazardType]   = useState('')
  const [hazardNote, setHazardNote]   = useState('')
  const [submitted, setSubmitted]     = useState(false)

  const submitHazard = () => {
    if (!hazardType) return
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setHazardModal(false); setHazardType(''); setHazardNote('') }, 2000)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">

      {/* ── Worker Profile Header ── */}
      <div className="rounded-2xl border border-slate-700/50 p-4 sm:p-5 relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#0f1929 0%,#0d1520 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5 pointer-events-none"
          style={{ background:'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ background:'linear-gradient(135deg,#1e3a5f,#0f2040)', border:'2px solid rgba(245,158,11,0.4)', boxShadow:'0 0 20px rgba(245,158,11,0.1)' }}>
              <span className="text-amber-400">RK</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-100">Ramesh Kumar</h2>
              <Badge color="slate">LAB-8842</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge color="green"><CheckCircle2 size={11} />Safety Clearance: ACTIVE</Badge>
              <Badge color="blue"><HardHat size={11} />Field Worker</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin size={13} className="text-amber-400 shrink-0" />
              <span>Pit 4 — Underground Zone B</span>
            </div>
          </div>

          {/* Shift info */}
          <div className="flex sm:flex-col gap-3 sm:gap-2 text-right">
            <div className="text-xs text-slate-500">Shift Start</div>
            <div className="text-lg font-bold text-amber-400">06:00 AM</div>
            <div className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /><span>Shift 3 · 8h</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/40">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Shift Progress</span><span>5h 30m / 8h</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width:'68%' }} />
          </div>
        </div>
      </div>

      {/* ── Safety Passport ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(245,158,11,0.05) 0%,transparent 100%)' }}>
          <Award size={16} className="text-amber-400 shrink-0" />
          <h3 className="font-semibold text-slate-200 text-sm">Labour Qualification & Safety Passport</h3>
          <div className="ml-auto"><Badge color="green"><ShieldCheck size={10} />Verified</Badge></div>
        </div>
        <div className="divide-y divide-slate-700/30">
          {CERTS.map((cert, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${cert.status === 'valid' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                {cert.status === 'valid'
                  ? <CheckCircle2 size={16} className="text-emerald-400" />
                  : <AlertTriangle size={16} className="text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{cert.title}</p>
                <p className={`text-xs mt-0.5 ${cert.status === 'warning' ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>{cert.expiry}</p>
              </div>
              <ChevronRight size={14} className="text-slate-600 shrink-0 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Environment Widget ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ background:'#0d1520' }}>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-700/40"
          style={{ background:'linear-gradient(90deg,rgba(59,130,246,0.05) 0%,transparent 100%)' }}>
          <CloudRain size={16} className="text-blue-400 shrink-0" />
          <h3 className="font-semibold text-slate-200 text-sm">Site Environment & Weather</h3>
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><Activity size={10} />Live</span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Pit 4 – Underground Zone B</p>
              <div className="flex flex-wrap gap-2">
                <Badge color="red"><Mountain size={11} />High Landslide Risk</Badge>
                <Badge color="amber"><AlertTriangle size={11} />Flood Watch Active</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-400">78<span className="text-lg font-normal text-slate-500">mm</span></p>
              <p className="text-xs text-slate-500">Rainfall</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Thermometer, label:'Temp',     value:'31°C',   color:'text-orange-400' },
              { icon: Wind,        label:'Wind',     value:'22 km/h', color:'text-blue-400'  },
              { icon: CloudRain,   label:'Humidity', value:'89%',    color:'text-cyan-400'   },
              { icon: Flame,       label:'Gas Level',value:'12 ppm', color:'text-amber-400'  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <Icon size={14} className={`${color} shrink-0`} />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Center ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SOS */}
        <div className="rounded-2xl border border-red-500/30 p-5 sm:p-6 flex flex-col items-center gap-4"
          style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.3) 0%,rgba(9,13,22,0.8) 100%)' }}>
          <div className="flex items-center gap-2 self-start">
            <BadgeAlert size={14} className="text-red-400" />
            <h3 className="font-semibold text-red-300 text-sm">Emergency SOS</h3>
          </div>
          <SOSButton />
        </div>

        {/* Hazard Report */}
        <div className="rounded-2xl border border-slate-700/50 p-5 sm:p-6"
          style={{ background:'linear-gradient(135deg,#0f1929 0%,#090d16 100%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-amber-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Hazard / Issue Report</h3>
          </div>
          <div className="space-y-3">
            <select value={hazardType} onChange={e => setHazardType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-300 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20">
              <option value="">Select hazard type…</option>
              <option>Equipment Malfunction</option>
              <option>Gas Leak Detected</option>
              <option>Structural Crack / Collapse Risk</option>
              <option>Flooding / Water Ingress</option>
              <option>Electrical Fault</option>
              <option>Injury / Medical</option>
            </select>
            <textarea value={hazardNote} onChange={e => setHazardNote(e.target.value)}
              rows={3} placeholder="Describe the issue…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-300 text-sm placeholder-slate-600
                focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 resize-none" />
            <button onClick={submitHazard}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: submitted ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color:'#0f172a', boxShadow: submitted ? '0 4px 20px rgba(16,185,129,0.3)' : '0 4px 20px rgba(245,158,11,0.25)' }}>
              {submitted ? (<><CheckCircle2 size={15} />Reported!</>) : (<><Zap size={15} />Log Mine Hazard / Equipment Issue</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

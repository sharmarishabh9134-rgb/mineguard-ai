import { useState, useRef, useEffect } from 'react'
import {
  ShieldCheck, HardHat, Stethoscope, Briefcase, MapPin, Lock,
  Mail, Eye, EyeOff, AlertTriangle, ChevronDown, Activity,
  ArrowRight, Siren, BadgeAlert, Building2, User, KeyRound,
  CheckSquare, Square, Radio, AlertCircle
} from 'lucide-react'

const ROLES = [
  { id: 'labour',     label: 'Labour / Field Worker',    shortLabel: 'Worker',     icon: HardHat },
  { id: 'supervisor', label: 'Supervisor / Manager',      shortLabel: 'Supervisor', icon: Briefcase },
  { id: 'admin',      label: 'Admin',                    shortLabel: 'Admin',    icon: Building2 },
]

const PIT_LOCATIONS = [
  'Pit 4 – Underground Zone B', 'Pit 2 – Open Cast (North)',
  'Pit 7 – Underground Zone A', 'Pit 1 – Surface Operations',
  'Pit 5 – Open Cast (South)', 'Pit 3 – Deep Shaft Level 3',
  'Pit 6 – Preparation Plant',
]

const MINE_SITES = [
  'Jharia Coalfields – Subsidiary A', 'Raniganj Coalfields – Subsidiary B',
  'Korba Mines – SECL Unit 3', 'Singrauli – NCL Central Hub',
  'Talcher Coalfields – MCL East', 'Bokaro – BCCL Sector II',
]

const MEDICAL_UNITS = [
  'Central Hospital – Jharia HQ', 'Underground Trauma Unit – Pit 4',
  'Open-cast First Aid Post – Pit 2', 'Raniganj District Medical Centre',
  'SECL Mine Hospital – Korba',
]

function Select({ options, value, onChange, placeholder, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 focus:outline-none
          ${open ? 'bg-slate-700/60 border-amber-500/70 ring-2 ring-amber-500/20' : 'bg-slate-800/60 border-slate-600/50 hover:border-slate-500'}`}>
        {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
        <span className={`flex-1 text-sm truncate ${value ? 'text-slate-200' : 'text-slate-500'}`}>{value || placeholder}</span>
        <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-slate-600/50 bg-slate-800/95 backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                  ${value === opt ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300 hover:bg-slate-700/70 hover:text-slate-100'}`}>
                {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PinInput({ value, onChange }) {
  const inputs = useRef([])
  const handleChange = (i, v) => {
    const digits = value.split('')
    const digit = v.replace(/\D/g, '').slice(-1)
    digits[i] = digit
    onChange(digits.join(''))
    if (digit && i < 3) inputs.current[i + 1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus()
  }
  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3].map(i => (
        <input key={i} ref={el => (inputs.current[i] = el)}
          type="password" maxLength={1} inputMode="numeric"
          value={value[i] || ''} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold rounded-xl border border-slate-600/50 bg-slate-800/60
            text-amber-400 caret-amber-400 focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20
            focus:bg-slate-700/60 transition-all duration-200 placeholder-slate-600"
          placeholder="•" />
      ))}
    </div>
  )
}

export default function LoginPage({ onLogin }) {
  const [activeRole, setActiveRole] = useState('labour')
  const [workerId, setWorkerId]     = useState('LAB-8842')
  const [pitLocation, setPitLoc]   = useState(PIT_LOCATIONS[0])
  const [pin, setPin]               = useState('1234')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [mineSite, setMineSite]     = useState(MINE_SITES[0])
  const [medicalUnit, setMedUnit]   = useState(MEDICAL_UNITS[0])
  const [showPw, setShowPw]         = useState(false)
  const [remember, setRemember]     = useState(true)
  const [loading, setLoading]       = useState(false)
  const [showSOS, setShowSOS]       = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    // Resolve default worker ID per role; user can override via workerId field
    const targetWorkerId =
      activeRole === 'labour'     ? (workerId || 'LAB-8842') :
      activeRole === 'supervisor' ? (workerId || 'RISHI') :
      activeRole === 'admin'      ? (workerId || 'ADM-0001') :
      (workerId || 'MED-901')

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: targetWorkerId,
          role: activeRole,          // send the real selected role — no mapping
          password: password         // include password
        })
      })

      const data = await resp.json()

      if (resp.ok && data.success) {
        const confirmedRole = data.worker.role   // role from server — always authoritative
        localStorage.setItem('mineguard_jwt_token', data.token)
        localStorage.setItem('mineguard_user_role', confirmedRole)
        onLogin(confirmedRole)
      } else {
        setErrorMessage(data.message || 'Authentication failed. Please check your credentials.')
      }
    } catch (err) {
      // Offline fallback: accept known demo IDs and use their correct role
      const knownIds = { 'LAB-8842': 'labour', 'LAB-9012': 'labour', 'RISHI': 'supervisor', 'ADM-0001': 'admin' }
      const offlineRole = knownIds[targetWorkerId.toUpperCase()]
      if (offlineRole) {
        localStorage.setItem('mineguard_user_role', offlineRole)
        onLogin(offlineRole)
      } else {
        setErrorMessage(`Invalid Worker ID '${targetWorkerId}'. You are not registered. Please contact your Supervisor for registration.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a2744 0%, #090d16 70%, #05080f 100%)' }}>
      
      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-slate-900/95 p-6 text-center shadow-2xl shadow-red-900/30">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 sos-pulse">
              <Siren size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">SOS Emergency Mode</h2>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Broadcasting to <span className="text-red-300 font-semibold">Mine Control Room</span>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSOS(false)} className="flex-1 py-3 rounded-xl border border-slate-600/50 text-slate-400 text-sm font-medium hover:bg-slate-800/50 transition-colors">Cancel</button>
              <button onClick={() => setShowSOS(false)} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">Confirm SOS</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(160deg,#0f1929 0%,#0a1020 50%,#0c1525 100%)' }}>

          <div className="p-5 sm:p-7 pb-4">
            <div className="text-center mb-6">
              <div className="relative inline-block mb-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#1a2744 0%,#0f1929 100%)', border: '2px solid rgba(245,158,11,0.4)' }}>
                  <ShieldCheck size={32} className="text-amber-400 relative z-10" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold tracking-wide mb-1 text-amber-400">MineGuard AI</h1>
              <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">Smart Governance & Safety Portal</p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Role Tabs */}
            <div className="mb-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-medium">Select Role</p>
              <div className="flex rounded-xl p-1 gap-1 bg-slate-950 border border-slate-800">
                {ROLES.map(({ id, shortLabel, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => { setActiveRole(id); setErrorMessage(''); setWorkerId(''); setPassword(''); }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200
                      ${activeRole === id ? 'text-slate-900 shadow-lg bg-amber-400' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Icon size={14} /><span className="leading-tight">{shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {activeRole === 'labour' && (<>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5"><User size={12} />Registered Worker ID</label>
                  <div className="relative">
                    <input type="text" value={workerId} onChange={e => setWorkerId(e.target.value)} placeholder="e.g. MG-LAB-0001"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500" required />
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5"><Lock size={12} />Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500" required={activeRole === 'labour'} />
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Only Worker IDs authorized by your Supervisor can log in.</p>
                </div>
              </>)}

              {activeRole === 'supervisor' && (<>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5"><Briefcase size={12} />Supervisor ID / Email</label>
                  <div className="relative">
                    <input type="text" value={workerId} onChange={e => setWorkerId(e.target.value)} placeholder="RISHI"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500" required />
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </>)}


              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                {loading ? 'Authenticating…' : 'Access Safety Portal'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

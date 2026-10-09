import { ShieldCheck, Users, Activity, Database, Settings, AlertTriangle, BarChart3, KeyRound } from 'lucide-react'

const STAT_CARDS = [
  { label: 'Total Workers',      value: '247',   icon: Users,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  { label: 'Active Mines',       value: '6',     icon: Activity,       color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
  { label: 'Open Alerts',        value: '3',     icon: AlertTriangle,  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  { label: 'System Health',      value: '99.8%', icon: Database,       color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
]

const RECENT_ACTIONS = [
  { action: 'Worker LAB-9012 registration approved',   time: '2 min ago',  type: 'success' },
  { action: 'Supervisor SUP-1001 shift started',       time: '14 min ago', type: 'info' },
  { action: 'Pit 4 emergency drill completed',         time: '1 hr ago',   type: 'warning' },
  { action: 'DGMS compliance report generated',        time: '3 hr ago',   type: 'success' },
  { action: 'New mine site Bokaro registered',         time: '1 day ago',  type: 'info' },
]

export default function AdminDashboard() {
  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">

      {/* Header Banner */}
      <div className="rounded-2xl border border-amber-500/20 p-5 sm:p-6"
        style={{ background: 'linear-gradient(135deg,#1a1a0a 0%,#0f1929 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
            <KeyRound size={24} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-amber-400">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">System Administration · MineGuard AI Platform</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">All Systems Online</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-700/50 p-5"
          style={{ background: 'linear-gradient(160deg,#0d1829 0%,#090d16 100%)' }}>
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-amber-400" /> Recent Activity
          </h2>
          <div className="space-y-3">
            {RECENT_ACTIONS.map(({ action, time, type }, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800/60 last:border-0">
                <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                  type === 'success' ? 'bg-emerald-400' : type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Controls */}
        <div className="rounded-2xl border border-slate-700/50 p-5"
          style={{ background: 'linear-gradient(160deg,#0d1829 0%,#090d16 100%)' }}>
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Settings size={14} className="text-amber-400" /> System Controls
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Manage Workers',    desc: 'Register / deactivate workers',   color: 'blue' },
              { label: 'Manage Supervisors',desc: 'Assign shifts and mine zones',     color: 'purple' },
              { label: 'RBAC Settings',     desc: 'Role permissions and access',      color: 'amber' },
              { label: 'Audit Logs',        desc: 'Full system event history',        color: 'emerald' },
              { label: 'DGMS Compliance',   desc: 'Regulatory reports and exports',   color: 'red' },
            ].map(({ label, desc, color }) => (
              <button key={label}
                className={`w-full text-left px-4 py-3 rounded-xl border border-slate-700/40 bg-slate-800/40
                  hover:bg-slate-700/50 hover:border-${color}-500/30 transition-all duration-200 group`}>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white">{label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Platform Stats Bar */}
      <div className="rounded-xl border border-slate-700/30 p-4 flex flex-wrap gap-6"
        style={{ background: 'rgba(13,24,41,0.6)' }}>
        {[
          { label: 'Uptime',         value: '99.8%' },
          { label: 'API Calls Today',value: '14,302' },
          { label: 'Active Sessions',value: '38' },
          { label: 'DB Status',      value: 'Fallback (In-Memory)' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

    </div>
  )
}

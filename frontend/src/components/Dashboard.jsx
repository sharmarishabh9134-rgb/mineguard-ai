import { useState } from 'react'
import {
  HardHat, LayoutDashboard, Stethoscope, ShieldCheck, KeyRound,
  LogOut, Menu, X, ChevronRight, Activity, Brain
} from 'lucide-react'
import LabourMobileSafetyApp    from './views/LabourMobileSafetyApp'
import SupervisorCommandCenter  from './views/SupervisorCommandCenter'
import MedicalDashboard         from './views/MedicalDashboard'
import RiskIntelligenceView     from './views/RiskIntelligenceView'
import AdminDashboard           from './views/AdminDashboard'
import SOSBroadcastListener      from './SOSBroadcastListener'

// ─── Navigation items — roles array controls who sees what ───────────────────
const ALL_NAV_ITEMS = [
  {
    id: 'labour',
    label: 'Labour Mobile App',
    icon: HardHat,
    sub: 'Worker Safety & Offline GPS',
    roles: ['labour'],
  },
  {
    id: 'supervisor',
    label: 'Supervisor Command Center',
    icon: LayoutDashboard,
    sub: 'Control Room & Live Map',
    roles: ['supervisor'],
  },
  {
    id: 'admin',
    label: 'Admin Dashboard',
    icon: KeyRound,
    sub: 'System Administration',
    roles: ['admin'],
  },
  {
    id: 'medical',
    label: 'Medical Response Center',
    icon: Stethoscope,
    sub: 'Live SOS & Response Alerts',
    roles: ['medical'],
  },
  {
    id: 'ml_risk',
    label: 'AI Risk Intelligence',
    icon: Brain,
    sub: 'Predictive Analytics Engine',
    roles: ['labour', 'supervisor', 'admin', 'medical'],
  },

]

// ─── Derive the default landing view for each role ───────────────────────────
function defaultViewForRole(role) {
  if (role === 'supervisor') return 'supervisor'
  if (role === 'admin')      return 'admin'
  if (role === 'medical')    return 'medical'
  return 'labour'
}

export default function Dashboard({ userRole, onLogout }) {
  const normalizedRole = (userRole || '').toLowerCase()

  console.log('[Dashboard] userRole received:', userRole, '→ normalizedRole:', normalizedRole)

  // Filter sidebar to only permitted items
  const permittedNavItems = ALL_NAV_ITEMS.filter(item =>
    item.roles.includes(normalizedRole)
  )

  const [activeView, setActiveView] = useState(() => defaultViewForRole(normalizedRole))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ─── Render the correct view based on activeView AND normalizedRole ──────
  const renderView = () => {
    console.log('[Dashboard] renderView — activeView:', activeView, '| normalizedRole:', normalizedRole)

    if (activeView === 'labour'     && normalizedRole === 'labour')     return <LabourMobileSafetyApp />
    if (activeView === 'supervisor' && normalizedRole === 'supervisor') return <SupervisorCommandCenter />
    if (activeView === 'admin'      && normalizedRole === 'admin')      return <AdminDashboard />
    if (activeView === 'medical'    && normalizedRole === 'medical')    return <MedicalDashboard />
    if (activeView === 'ml_risk')                                        return <RiskIntelligenceView />

    // Role-locked fallback — never show a higher-privilege view
    if (normalizedRole === 'labour')     return <LabourMobileSafetyApp />
    if (normalizedRole === 'supervisor') return <SupervisorCommandCenter />
    if (normalizedRole === 'admin')      return <AdminDashboard />
    if (normalizedRole === 'medical')    return <MedicalDashboard />

    // Unknown role — show access denied
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldCheck size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm">Your role <strong className="text-slate-300">"{normalizedRole}"</strong> does not have a permitted dashboard.</p>
        <button onClick={onLogout} className="mt-6 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">
          Sign Out
        </button>
      </div>
    )
  }

  const NavLink = ({ item }) => {
    const Icon = item.icon
    const active = activeView === item.id
    return (
      <button
        onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group
          ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`}
        style={active ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' } : {}}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
          ${active ? 'bg-amber-600/30' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}>
          <Icon size={16} className={active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-300'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${active ? 'text-slate-900' : ''}`}>{item.label}</p>
          <p className={`text-xs truncate ${active ? 'text-slate-800' : 'text-slate-400'}`}>{item.sub}</p>
        </div>
        {active && <ChevronRight size={14} className="text-slate-800 shrink-0" />}
      </button>
    )
  }

  const roleLabel = normalizedRole === 'supervisor' ? 'Supervisor'
    : normalizedRole === 'admin' ? 'Admin'
    : normalizedRole === 'medical' ? 'Medical'
    : 'Worker'

  const roleInitial = normalizedRole === 'supervisor' ? 'SUP'
    : normalizedRole === 'admin' ? 'ADM'
    : normalizedRole === 'medical' ? 'MED'
    : 'WK'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#1a2744,#0f1929)', border: '2px solid rgba(245,158,11,0.4)', boxShadow: '0 0 15px rgba(245,158,11,0.1)' }}>
            <ShieldCheck size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="font-extrabold text-sm" style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MineGuard AI</p>
            <p className="text-xs text-slate-400">Governance Portal</p>
          </div>
        </div>
      </div>

      {/* Role indicator */}
      <div className="mx-4 mt-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-xs text-emerald-400 font-medium font-mono uppercase">{normalizedRole} Portal</span>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-medium px-2 mb-2">Navigation</p>
        {permittedNavItems.map(item => <NavLink key={item.id} item={item} />)}
      </div>

      {/* User info + logout */}
      <div className="px-3 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-amber-400 font-bold text-xs">{roleInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">{roleLabel}</p>
            <p className="text-xs text-slate-400 truncate">{normalizedRole === 'admin' ? 'Head Office' : 'Jharia Coalfields'}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut size={15} /><span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  const currentNav = permittedNavItems.find(n => n.id === activeView) || permittedNavItems[0]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#090d16' }}>
      <SOSBroadcastListener />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-700/50 h-full"
        style={{ background: 'linear-gradient(160deg,#0d1829 0%,#090d16 100%)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-700/50 z-50"
            style={{ background: 'linear-gradient(160deg,#0d1829 0%,#090d16 100%)' }}>
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700/50 shrink-0"
          style={{ background: 'rgba(9,13,22,0.95)', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
            <Menu size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {currentNav && <currentNav.icon size={14} className="text-amber-400 shrink-0" />}
              <h1 className="text-sm sm:text-base font-bold text-slate-100 truncate">{currentNav?.label}</h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">MineGuard AI · Jharia Coalfields · DGMS Compliant</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
              <Activity size={11} className="animate-pulse" />
              <span className="font-medium">Live</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-xs">{roleInitial}</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#090d16' }}>
          {renderView()}
        </main>
      </div>
    </div>
  )
}

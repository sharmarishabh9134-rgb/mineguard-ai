import { apiFetch } from '../../services/apiUrl.js'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, MapPin, ShieldCheck, AlertTriangle, Users,
  Clock, Activity, Radio, Phone, RefreshCw, Filter, Search,
  ChevronRight, Navigation, CheckCircle2, Sliders, ShieldAlert,
  HardHat, Wifi, WifiOff, Eye, Cpu, UserPlus, X, Volume2, VolumeX
} from 'lucide-react'
import { sirenAudioService } from '../../utils/sirenAudio'
import WeatherWidget from '../WeatherWidget'
import ProductionDashboard from './ProductionDashboard'
import LabourManagement from './LabourManagement'
import ProblemsDashboard from './ProblemsDashboard'
import LabourConcerns from './LabourConcerns'
import LabourDocuments from './LabourDocuments'
import LabourIncidentIntelligence from './LabourIncidentIntelligence'
import SupervisorMapManagement from './SupervisorMapManagement'

export default function SupervisorCommandCenter() {
  const [mineFilter, setMineFilter] = useState("Jharia Coalfields – Subsidiary A")
  const [zoneFilter, setZoneFilter] = useState("ALL")
  const [shiftFilter, setShiftFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeView, setActiveView] = useState('WORKERS') // dashboard view key

  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [sosAlerts, setSosAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [sirenMuted, setSirenMuted] = useState(false)

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false)
  const [regId, setRegId] = useState('')
  const [regName, setRegName] = useState('')
  const [regMine, setRegMine] = useState('Jharia Coalfields – Pit 4')
  const [regStatusMsg, setRegStatusMsg] = useState('')

  // Fetch Supervisor Authorized Workers Data
  const fetchSupervisorData = async () => {
    setLoading(true)
    try {
      const token=localStorage.getItem('mineguard_jwt_token')||''
      const resp = await apiFetch('/api/supervisor/workers', {headers:{Authorization:`Bearer ${token}`}})
      if (resp.ok) {
        const data = await resp.json()
        const fetchedWorkers = data.workers || []
        const fetchedSos = data.sos_alerts || []
        setWorkers(fetchedWorkers)
        setSosAlerts(fetchedSos)
        setSelectedWorker(current=>current?fetchedWorkers.find(w=>w.worker_id===current.worker_id)||current:fetchedWorkers[0]||null)

        // Trigger Audio Siren if active unacknowledged SOS exists
        const unackedSOS = fetchedSos.filter(s => s.status === 'PENDING_DISPATCH')
        if (unackedSOS.length > 0 && !sirenMuted) {
          sirenAudioService.startSiren()
        } else {
          sirenAudioService.stopSiren()
        }
      }
    } catch (err) {
      console.error('Failed to fetch supervisor data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupervisorData()
    const interval = setInterval(fetchSupervisorData, 4000)
    return () => {
      clearInterval(interval)
      sirenAudioService.stopSiren()
    }
  }, [mineFilter, sirenMuted])

  const handleAcknowledgeSOS = async (alertId) => {
    try {
      sirenAudioService.stopSiren()
      await apiFetch('/api/supervisor/sos-acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      })
      fetchSupervisorData()
    } catch (e) {
      console.error('SOS acknowledge error:', e)
    }
  }

  const handleRegisterWorkerSubmit = async (e) => {
    e.preventDefault()
    setRegStatusMsg('')
    if (!regId || !regName) {
      setRegStatusMsg('Please enter both Worker ID and Name.')
      return
    }

    try {
      const token = localStorage.getItem('mineguard_jwt_token') || ''
      const resp = await apiFetch('/api/supervisor/register-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workerId: regId,
          name: regName,
          role: 'labour',
          assignedMineLocation: regMine
        })
      })

      const resData = await resp.json()
      if (resp.ok) {
        setRegStatusMsg(`✅ ${resData.message}`)
        setRegId('')
        setRegName('')
        sirenAudioService.playBeep()
        fetchSupervisorData()
      } else {
        setRegStatusMsg(`❌ ${resData.message || 'Registration failed.'}`)
      }
    } catch (err) {
      setRegStatusMsg(`❌ Server error: ${err.message}`)
    }
  }

  const filteredWorkers = workers.filter(w => {
    if (zoneFilter !== 'ALL' && w.zone_id !== zoneFilter) return false
    if (shiftFilter !== 'ALL' && w.shift_id !== shiftFilter) return false
    if (statusFilter === 'SOS' && w.sos_status !== 'SOS_ACTIVE') return false
    if (statusFilter === 'OFFLINE' && w.network_status !== 'OFFLINE') return false
    if (statusFilter === 'GPS_LOST' && w.gps_status !== 'GPS_SIGNAL_LOST') return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return w.name.toLowerCase().includes(term) || w.worker_id.toLowerCase().includes(term)
    }
    return true
  })

  const totalWorkers = workers.length
  const activeUnderground = workers.filter(w => w.tracking_status === 'ACTIVE').length
  const offlineWorkers = workers.filter(w => w.network_status === 'OFFLINE').length
  const gpsLostCount = workers.filter(w => w.gps_status === 'GPS_SIGNAL_LOST').length
  const activeSOSCount = workers.filter(w => w.sos_status === 'SOS_ACTIVE').length
  const locatedWorkers=filteredWorkers.filter(w=>Number.isFinite(w.last_location?.latitude)&&Number.isFinite(w.last_location?.longitude))
  const minLat=Math.min(...locatedWorkers.map(w=>w.last_location.latitude)), maxLat=Math.max(...locatedWorkers.map(w=>w.last_location.latitude))
  const minLng=Math.min(...locatedWorkers.map(w=>w.last_location.longitude)), maxLng=Math.max(...locatedWorkers.map(w=>w.last_location.longitude))
  const gpsPointFor=(worker)=>({x:locatedWorkers.length<2||maxLng===minLng?50:14+((worker.last_location.longitude-minLng)/(maxLng-minLng))*72,y:locatedWorkers.length<2||maxLat===minLat?50:82-((worker.last_location.latitude-minLat)/(maxLat-minLat))*64})

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Control Room Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold shadow-lg shadow-amber-500/10">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">MINEGUARD — Supervisor Safety Command Center</h1>
              <p className="text-xs text-slate-400">Mine Governance & Authorized Worker Safety Control Room · DGMS Standards</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Siren Mute Toggle */}
          <button onClick={() => {
              setSirenMuted(!sirenMuted)
              if (!sirenMuted) sirenAudioService.stopSiren()
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${sirenMuted ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
            {sirenMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-bounce" />}
            <span>{sirenMuted ? 'Siren Muted' : 'Siren Active'}</span>
          </button>

          <button onClick={fetchSupervisorData} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex gap-2 text-xs overflow-x-auto pb-2">
        <button
          onClick={() => setActiveView('WORKERS')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'WORKERS' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          👷 Workers &amp; Map
        </button>
        <button
          onClick={() => setActiveView('PRODUCTION')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'PRODUCTION' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          📊 Production Management
        </button>
        <button
          onClick={() => setActiveView('LABOUR')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'LABOUR' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          👥 Labour Management
        </button>
        <button
          onClick={() => setActiveView('PROBLEMS')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'PROBLEMS' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          ⚠️ Problems
        </button>
        <button
          onClick={() => setActiveView('CONCERNS')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'CONCERNS' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          💬 Labour Concerns
        </button>
        <button
          onClick={() => setActiveView('DOCUMENTS')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'DOCUMENTS' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          📄 Labour Documents
        </button>
        <button
          onClick={() => setActiveView('INTELLIGENCE')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'INTELLIGENCE' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          🧠 Incident Intelligence
        </button>
        <button
          onClick={() => setActiveView('MAP_MANAGEMENT')}
          className={`px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap ${activeView === 'MAP_MANAGEMENT' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          🗺️ Manage Mine Map
        </button>
      </div>

      {/* Production Dashboard Tab */}
      {activeView === 'PRODUCTION' && <ProductionDashboard />}

      {/* Labour Management Tab */}
      {activeView === 'LABOUR' && <LabourManagement />}

      {activeView === 'PROBLEMS' && <ProblemsDashboard />}
      {activeView === 'CONCERNS' && <LabourConcerns />}
      {activeView === 'DOCUMENTS' && <LabourDocuments supervisor />}
      {activeView === 'INTELLIGENCE' && <LabourIncidentIntelligence />}
      {activeView === 'MAP_MANAGEMENT' && <SupervisorMapManagement />}

      {/* Workers Tab Content */}
      {activeView === 'WORKERS' && (
        <div className="space-y-6">

      {/* Detailed Weather Widget */}
      <WeatherWidget mineId={mineFilter} simplified={false} />

      {/* Control Room Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Workers</span>
          <span className="text-2xl font-black text-slate-100">{totalWorkers}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Active Underground</span>
          <span className="text-2xl font-black text-emerald-400">{activeUnderground}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Offline / Sync Pending</span>
          <span className="text-2xl font-black text-amber-400">{offlineWorkers}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">GPS Signal Lost</span>
          <span className="text-2xl font-black text-sky-400">{gpsLostCount}</span>
        </div>

        <div className={`p-3.5 rounded-2xl border ${activeSOSCount > 0 ? 'bg-red-950/60 border-red-500/60 text-red-200' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider block">SOS Alerts</span>
          <span className={`text-2xl font-black ${activeSOSCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
            {activeSOSCount}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Sync</span>
          <span className="text-xs font-mono font-bold text-slate-300 mt-2 block">Live Feeds Active</span>
        </div>
      </div>

      {/* SOS Alert Banner */}
      {sosAlerts.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 space-y-3 shadow-2xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert size={24} className="text-red-400" />
              <div>
                <h3 className="text-sm font-black text-red-200">🔴 EMERGENCY SOS ALERT BROADCAST (SIREN ACTIVE)</h3>
                <p className="text-xs text-red-300">Immediate action required for worker in mine zone.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-red-400 px-2.5 py-1 rounded bg-black/40">HIGH PRIORITY</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sosAlerts.map((sos) => (
              <div key={sos.id} className="bg-slate-950/90 p-3 rounded-xl border border-red-500/40 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>👷 {sos.worker_name} ({sos.worker_id})</span>
                  <span className="text-red-400">{sos.timestamp}</span>
                </div>
                <p className="text-slate-400">Zone: <strong className="text-amber-400">{sos.zone_name}</strong></p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-slate-400">GPS: {sos.gps_status}</span>
                  <button onClick={() => handleAcknowledgeSOS(sos.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-[11px] transition-colors">
                    Acknowledge & Mute Siren
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Control Room Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Interactive Mine Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Live Authorized Worker Underground Map</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{locatedWorkers.length} sharing GPS</span>
          </div>

          <div className="w-full h-96 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center p-3">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <rect x="5" y="5" width="90" height="90" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
              <path d="M 10 80 L 30 65 L 55 50 L 75 30" fill="none" stroke="#475569" strokeWidth="4" />
              <path d="M 55 50 L 40 20" fill="none" stroke="#10b981" strokeWidth="3" />
              <path d="M 55 50 L 85 15" fill="none" stroke="#ef4444" strokeWidth="3" />

              <circle cx="10" cy="80" r="4" fill="#38bdf8" />
              <text x="5" y="90" fill="#94a3b8" fontSize="3.5">Main Shaft Entrance</text>

              <circle cx="40" cy="20" r="4" fill="#10b981" />
              <text x="32" y="14" fill="#10b981" fontSize="3.5" fontWeight="bold">Emergency Exit Shaft</text>

              <circle cx="85" cy="15" r="4" fill="#ef4444" />
              <text x="72" y="10" fill="#ef4444" fontSize="3.5">Restricted Zone X</text>

              {locatedWorkers.map((w) => {
                const isSelected = selectedWorker?.worker_id === w.worker_id
                const isSOS = w.sos_status === 'SOS_ACTIVE'
                const lastPoint = gpsPointFor(w)
                const isStale=w.tracking_status==='STALE'
                
                return (
                  <g key={w.worker_id} onClick={() => setSelectedWorker(w)} className="cursor-pointer">
                    <circle cx={lastPoint.x} cy={lastPoint.y} r={isSelected ? "6" : "4"}
                      fill={isSOS ? "#ef4444" : isStale ? "#64748b" : w.network_status === 'OFFLINE' ? "#f59e0b" : "#10b981"}
                      className={isSOS ? "animate-ping" : ""} />
                    <text x={lastPoint.x + 5} y={lastPoint.y + 2} fill={isSelected ? "#fbbf24" : "#cbd5e1"} fontSize="3.5" fontWeight="bold">
                      👷 {w.name.split(' ')[0]} ({w.worker_id})
                    </text>
                  </g>
                )
              })}
              {!locatedWorkers.length&&<text x="50" y="48" textAnchor="middle" fill="#94a3b8" fontSize="4">No workers have shared a GPS position yet</text>}
            </svg>
          </div>

          <p className="text-[10px] text-slate-400">Workers appear after they allow location and keep sharing enabled. Dots are positioned relative to current GPS coordinates on this schematic; use each worker’s map link for the precise location.</p>
          {locatedWorkers.length>0&&<div className="grid sm:grid-cols-2 gap-2">{locatedWorkers.map(w=><div key={w.worker_id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs"><button onClick={()=>setSelectedWorker(w)} className="font-bold text-slate-200 hover:text-amber-300">{w.name} · {w.worker_id}</button><p className="mt-1 text-slate-400">{w.last_location.latitude.toFixed(5)}, {w.last_location.longitude.toFixed(5)} · {new Date(w.last_location.updatedAt).toLocaleTimeString()}</p><a className="text-sky-300" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${w.last_location.latitude}&mlon=${w.last_location.longitude}#map=17/${w.last_location.latitude}/${w.last_location.longitude}`}>Open precise location</a></div>)}</div>}

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>🟢 Active / Online</span>
            <span>🟠 Offline Queue</span>
            <span>🔴 SOS Alert</span>
            <span>⚠️ GPS Signal Lost</span>
          </div>
        </div>

        {/* Worker Safety Detail Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter size={14} className="text-amber-400" /> Authorized Worker Search
              </span>
            </div>

            <div className="space-y-2">
              <input type="text" placeholder="Search by Worker ID or Name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500" />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700/60 text-slate-300 text-[11px]">
                  <option value="ALL">All Mine Zones</option>
                  <option value="pit_4_zone_b">Pit 4 Zone B</option>
                  <option value="tunnel_b">Tunnel B</option>
                  <option value="restricted_zone_x">Restricted Zone X</option>
                </select>

                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700/60 text-slate-300 text-[11px]">
                  <option value="ALL">All Statuses</option>
                  <option value="SOS">SOS Active</option>
                  <option value="OFFLINE">Offline Queue</option>
                  <option value="GPS_LOST">GPS Signal Lost</option>
                </select>
              </div>
            </div>
          </div>

          {selectedWorker ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedWorker.name}</h3>
                  <p className="text-xs text-slate-400">{selectedWorker.worker_id} · {selectedWorker.contractor || 'Registered Labour'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  selectedWorker.sos_status === 'SOS_ACTIVE' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' :
                  selectedWorker.network_status === 'OFFLINE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {selectedWorker.sos_status === 'SOS_ACTIVE' ? '🔴 SOS ACTIVE' : selectedWorker.network_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Assigned Zone</span>
                  <span className="font-bold text-amber-400">{selectedWorker.zone_id}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">GPS Status</span>
                  <span className="font-bold text-sky-400">{selectedWorker.gps_status}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <span className="text-slate-400">Latest shared GPS</span>
                {selectedWorker.last_location?<><p className="mt-1 font-mono text-slate-200">{selectedWorker.last_location.latitude.toFixed(6)}, {selectedWorker.last_location.longitude.toFixed(6)}</p><p className="mt-1 text-slate-400">Accuracy ±{Math.round(selectedWorker.last_location.accuracy||0)} m · {new Date(selectedWorker.last_location.updatedAt).toLocaleString()}</p><a className="mt-1 inline-block text-sky-300" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${selectedWorker.last_location.latitude}&mlon=${selectedWorker.last_location.longitude}#map=17/${selectedWorker.last_location.latitude}/${selectedWorker.last_location.longitude}`}>Open precise location</a></>:<p className="mt-1 text-slate-400">This worker has not shared a GPS position.</p>}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-300 mb-1">Underground Path Trace:</p>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  {selectedWorker.path?.map((pt, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{i + 1}. {pt.name}</span>
                      <span className="text-slate-400">{pt.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">Select a worker from the map or list to view path trace.</p>
          )}

        </div>

      </div>
      </div>
      )} 

      {/* REGISTER NEW WORKER MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus size={18} className="text-amber-400" /> Register New Labour ID
              </h3>
              <button onClick={() => { setShowRegModal(false); setRegStatusMsg(''); }} className="text-slate-400 hover:text-white font-bold">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterWorkerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Worker ID (e.g. LAB-1042)</label>
                <input type="text" placeholder="LAB-1042" value={regId} onChange={e => setRegId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" required />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Full Worker Name</label>
                <input type="text" placeholder="e.g. Rajesh Sharma" value={regName} onChange={e => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" required />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Assigned Pit / Location</label>
                <select value={regMine} onChange={e => setRegMine(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500">
                  <option value="Jharia Coalfields – Pit 4">Jharia Coalfields – Pit 4</option>
                  <option value="Jharia Coalfields – Tunnel B">Jharia Coalfields – Tunnel B</option>
                  <option value="Raniganj Coalfields – Zone A">Raniganj Coalfields – Zone A</option>
                </select>
              </div>

              {regStatusMsg && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  {regStatusMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowRegModal(false); setRegStatusMsg(''); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors">
                  Authorize & Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

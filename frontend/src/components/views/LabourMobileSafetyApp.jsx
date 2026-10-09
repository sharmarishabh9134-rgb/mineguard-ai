import { useState, useEffect, useRef } from 'react'
import {
  HardHat, MapPin, ShieldCheck, AlertTriangle,
  Clock, Radio, BadgeAlert, Wifi, WifiOff,
  Lock
} from 'lucide-react'
import { offlineSyncEngine } from '../../services/offlineSync'
import { deviceLocationTracker } from '../../services/locationTracker'
import { apiFetch } from '../../services/apiUrl'
import WeatherWidget from '../WeatherWidget'
import LabourDocuments from './LabourDocuments'
import WorkerSafetyVision from './WorkerSafetyVision'
import WorkerAIAssistant from './WorkerAIAssistant'

export default function LabourMobileSafetyApp() {
  const [syncDetails, setSyncDetails] = useState(offlineSyncEngine.getStatus())
  const [trackerState, setTrackerState] = useState(deviceLocationTracker.getState())
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [sosFired, setSosFired] = useState(false)
  const [sosHolding, setSosHolding] = useState(false)
  const [sosProgress, setSosProgress] = useState(0)
  const [complaintText, setComplaintText] = useState('')
  const [concernTitle, setConcernTitle] = useState('')
  const [concernType, setConcernType] = useState('COMPLAINT')
  const [concernPhoto, setConcernPhoto] = useState(null)
  const [concernLocation, setConcernLocation] = useState(null)
  const [concernGeoMessage, setConcernGeoMessage] = useState('')
  const [complaintMsg, setComplaintMsg] = useState('')
  const [profile, setProfile] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('mineguard_jwt_token');
        if (!token) return;
        // Basic decode of JWT to get workerId
        const payload = JSON.parse(atob(token.split('.')[1]));
        const res = await apiFetch(`/api/auth/profile/${payload.workerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      }
    };
    fetchProfile();

    const unsubscribeSync = offlineSyncEngine.subscribeStatus(setSyncDetails)
    const unsubscribeTracker = deviceLocationTracker.subscribe(setTrackerState)
    if(deviceLocationTracker.getState().enabled) deviceLocationTracker.startTracking()
    return () => {
      unsubscribeSync()
      unsubscribeTracker()
    }
  }, [])

  const handleRequestPermission = async () => {
    await deviceLocationTracker.requestPermission()
  }

  const handleToggleTracking = (enable) => {
    deviceLocationTracker.toggleTracking(enable)
  }

  // SOS Hold Logic (3 seconds)
  const startHoldSOS = () => {
    if (sosFired) return
    setSosHolding(true)
    let p = 0
    intervalRef.current = setInterval(() => {
      p += 100 / 30
      setSosProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(intervalRef.current)
        triggerEmergencySOS()
      }
    }, 100)
  }

  const endHoldSOS = () => {
    if (sosFired) return
    clearInterval(intervalRef.current)
    setSosHolding(false)
    setSosProgress(0)
  }

  const triggerEmergencySOS = async () => {
    setSosFired(true)
    setSosHolding(false)
    const token=localStorage.getItem('mineguard_jwt_token')||''
    let session={}
    try{session=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))}catch{}
    const payload = {
      worker_id: session.workerId || profile?.workerId || '',
      worker_name: profile?.name || 'Worker',
      mine_id: profile?.assignedMineLocation || session.assignedMineLocation || '',
      zone_id: profile?.zoneId || '',
      latitude: trackerState.position?.latitude ?? null,
      longitude: trackerState.position?.longitude ?? null,
      accuracy: trackerState.position?.accuracy ?? null,
      gps_status: trackerState.gpsStatus,
      network_status: syncDetails.isOnline ? 'ONLINE' : 'OFFLINE',
      timestamp: new Date().toLocaleTimeString()
    }
    await offlineSyncEngine.queueSOS(payload)
  }

  const resetSOS = () => {
    setSosFired(false)
    setSosProgress(0)
    setSosHolding(false)
  }

  const handleSubmitComplaint = async () => {
    if (!concernTitle.trim() || !complaintText.trim()) {
      setComplaintMsg('Add a title and describe your concern.')
      return
    }
    try {
      const token = localStorage.getItem('mineguard_jwt_token') || ''
      const res = await apiFetch('/api/labour/concerns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: concernType, title: concernTitle, message: complaintText, location: concernLocation, photo: concernPhoto })
      })
      
      const contentType = res.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await res.json().catch(() => null)
        : null
      
      if (res.ok && data?.success === true) {
        setComplaintMsg(data.persisted === false ? '✓ Accepted temporarily; MongoDB is offline, so it may not survive a server restart.' : '✓ Sent to your supervisor.')
        setComplaintText('')
        setConcernTitle('')
        setConcernPhoto(null)
        setConcernLocation(null)
      } else {
        if (res.status === 401 || res.status === 403) {
          setComplaintMsg('Unauthorized: You do not have permission to submit complaints.')
        } else if (res.status >= 500) {
          setComplaintMsg(`Server error (${res.status}): ${data?.message || 'Could not save complaint.'}`)
        } else if (res.status === 400) {
          setComplaintMsg('Invalid request: ' + (data?.message || 'Check your input.'))
        } else {
          setComplaintMsg(`Request failed (${res.status}): ${data?.message || (contentType.includes('text/html') ? 'The request reached a page, not the API. Check VITE_API_URL and backend CORS settings.' : 'Could not send the concern.')}`)
        }
      }
    } catch (e) {
      if (e instanceof TypeError || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        setComplaintMsg('Network error: Cannot reach the backend. Check VITE_API_URL, backend availability, and CORS_ORIGINS.')
      } else {
        setComplaintMsg('Failed to send complaint: ' + e.message)
      }
    }
  }

  const TABS = [
    { id: 'DASHBOARD', label: '📊 Overview' },
    { id: 'MAP', label: '🗺️ Map' },
    { id: 'COMPLAINT', label: '📝 Labour Concern' },
    { id: 'DOCUMENTS', label: '📄 Documents' },
    { id: 'AI_SCAN', label: '📷 AI Safety Check' },
    { id: 'ASK_AI', label: '🤖 Ask MineGuard' }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-lg mx-auto pb-24 space-y-4">

      {/* App Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <HardHat size={22} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-100">MINEGUARD — Worker Safety</h1>
            {profile ? (
              <p className="text-xs text-slate-400">{profile.name} ({profile.workerId}) · {profile.mineId} {profile.zoneId}</p>
            ) : (
              <p className="text-xs text-slate-400">Loading Profile...</p>
            )}
          </div>
        </div>

        {/* Online/Offline Indicator */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
          syncDetails.status === 'ONLINE'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : syncDetails.status === 'SYNCING'
            ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 animate-pulse'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
        }`}>
          {syncDetails.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>
            {syncDetails.status === 'ONLINE' && '🟢 ONLINE'}
            {syncDetails.status === 'OFFLINE' && '🟠 OFFLINE'}
            {syncDetails.status === 'SYNCING' && '🔄 SYNCING...'}
            {syncDetails.status === 'SYNC_COMPLETE' && '✓ SYNCED'}
          </span>
        </div>
      </div>

      {/* Location Permission Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-200">Authorized Worker Safety Tracking</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              When you allow location and keep sharing enabled, your live GPS is sent to the server and visible to supervisors authorized for your mine. Pause sharing any time.
            </p>
          </div>
        </div>

        {trackerState.permission !== 'GRANTED' ? (
          <button
            onClick={handleRequestPermission}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2"
          >
            <MapPin size={14} /> Allow Location Permission
          </button>
        ) : (
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${trackerState.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-semibold text-slate-300">
                {trackerState.enabled ? '🟢 Location Active' : '🔴 Location Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">Sync: {syncDetails.lastSyncTime}</span>
              <button
                onClick={() => handleToggleTracking(!trackerState.enabled)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px]"
              >
                {trackerState.enabled ? 'Pause' : 'Enable'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GPS Status */}
      <div className="px-3.5 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
        <Radio size={14} className="animate-pulse shrink-0" />
        <span>
          GPS: <strong className="font-mono">
            {trackerState.gpsStatus === 'SATELLITE_GPS'
              ? '🟢 Satellite GPS'
              : '⚠️ GPS SIGNAL LOST — Last known position shown'}
          </strong>
        </span>
      </div>

      {/* Safety Status Banner */}
      <div className={`p-4 rounded-2xl border text-center transition-all ${
        sosFired
          ? 'bg-red-950/60 border-red-500/60 text-red-200'
          : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {sosFired
            ? <AlertTriangle size={24} className="text-red-400 animate-bounce" />
            : <ShieldCheck size={24} className="text-emerald-400" />
          }
          <h2 className="text-base font-black uppercase tracking-wider">
            {sosFired ? '🔴 EMERGENCY SOS ACTIVATED' : '🟢 SAFETY STATUS: YOU ARE SAFE'}
          </h2>
        </div>
        {sosFired && (
          <p className="text-xs text-red-300 mt-1">
            {syncDetails.isOnline
              ? 'Broadcasting live position to Control Room…'
              : 'OFFLINE → SOS QUEUED LOCALLY (Will sync upon reconnect)'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Simplified Weather */}
      <div className="mb-2">
        <WeatherWidget mineId="default" simplified={true} />
      </div>

      {/* TAB: DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-4">
          {/* SOS Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Emergency Response</h3>
            {sosFired ? (
              <div className="space-y-3">
                <p className="text-xs text-red-400 font-mono">SOS Alert Queued &amp; Transmitted</p>
                <button onClick={resetSOS} className="text-xs text-slate-400 hover:text-slate-200 underline">
                  Reset Emergency State
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sosHolding && (
                  <div className="w-32 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${sosProgress}%` }}
                    />
                  </div>
                )}
                <button
                  onMouseDown={startHoldSOS}
                  onMouseUp={endHoldSOS}
                  onMouseLeave={endHoldSOS}
                  onTouchStart={startHoldSOS}
                  onTouchEnd={endHoldSOS}
                  className="w-32 h-32 rounded-full font-black text-white bg-gradient-to-br from-red-500 to-red-800 border-4 border-red-400 shadow-2xl shadow-red-500/40 select-none active:scale-95 transition-transform flex flex-col items-center justify-center mx-auto"
                >
                  <BadgeAlert size={36} />
                  <span className="text-sm font-extrabold mt-1">HOLD 3s SOS</span>
                </button>
                <p className="text-[11px] text-slate-400">Hold button for 3 seconds to trigger emergency alert</p>
              </div>
            )}
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Current Zone</span>
              <span className="font-bold text-amber-400">{profile?.zoneId || 'Pit 4 Zone B'}</span>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Nearest Exit</span>
              <span className="font-bold text-emerald-400">North Shaft (250m)</span>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Shift</span>
              <span className="font-bold text-slate-300">{profile?.shift || 'Morning'}</span>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Status</span>
              <span className="font-bold text-emerald-400">{profile?.status || 'ACTIVE'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MAP */}
      {activeTab === 'MAP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200">Underground Cave Path &amp; Exit Navigation</h3>
            <span className="text-[10px] text-emerald-400 font-mono">You Are Here 👷</span>
          </div>

          {/* SVG Underground Map */}
          <div className="w-full h-64 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center p-2">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <path d="M 10 80 L 30 65 L 55 50 L 75 30" fill="none" stroke="#475569" strokeWidth="4" strokeDasharray="2" />
              <path d="M 55 50 L 40 20" fill="none" stroke="#10b981" strokeWidth="3" />
              <path d="M 55 50 L 85 15" fill="none" stroke="#ef4444" strokeWidth="3" />
              <circle cx="10" cy="80" r="4" fill="#38bdf8" />
              <text x="5" y="90" fill="#94a3b8" fontSize="3.5">Mine Shaft</text>
              <circle cx="40" cy="20" r="4" fill="#10b981" />
              <text x="35" y="14" fill="#10b981" fontSize="3.5" fontWeight="bold">Emergency Exit</text>
              <circle cx="85" cy="15" r="4" fill="#ef4444" />
              <text x="75" y="10" fill="#ef4444" fontSize="3.5">Restricted Zone X</text>
              <polyline points="10,80 30,65 55,50 75,30" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              <circle cx="75" cy="30" r="5" fill="#f59e0b" />
              <text x="65" y="24" fill="#fbbf24" fontSize="4" fontWeight="bold">You (Ramesh)</text>
            </svg>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-slate-300">Underground Route Trace:</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono overflow-x-auto pb-1">
              <span className="text-sky-400">Shaft Entrance</span>
              <span>→</span>
              <span className="text-slate-300">Tunnel A</span>
              <span>→</span>
              <span className="text-slate-300">Junction B</span>
              <span>→</span>
              <span className="text-amber-400 font-bold">Pit 4 Zone B</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMPLAINT */}
      {activeTab === 'COMPLAINT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div><h3 className="text-sm font-bold text-slate-100">Labour Concern</h3><p className="text-xs text-slate-400 mt-1">Send a complaint, idea or safety issue with an optional photo and current GPS location.</p></div>
          <label className="block text-xs text-slate-400">Concern type<select value={concernType} onChange={e=>setConcernType(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100"><option value="COMPLAINT">Complaint</option><option value="IDEA">Idea / suggestion</option><option value="SAFETY_ISSUE">Safety issue</option><option value="OTHER">Other concern</option></select></label>
          <input value={concernTitle} onChange={e=>setConcernTitle(e.target.value)} maxLength={160} placeholder="Short subject" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100" />
          <textarea
            value={complaintText}
            onChange={e => setComplaintText(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 resize-none"
            rows={4}
            maxLength={4000}
            placeholder="Describe the concern and what would help resolve it..."
          />
          <section className="rounded-xl border border-slate-700 p-3 space-y-2"><h4 className="text-xs font-bold text-slate-200">Geo-tag this concern</h4><button onClick={()=>{if(!navigator.geolocation){setConcernGeoMessage('This browser does not provide GPS.');return}setConcernGeoMessage('Requesting current location…');navigator.geolocation.getCurrentPosition(({coords,timestamp})=>{setConcernLocation({latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,source:'gps',capturedAt:new Date(timestamp).toISOString()});setConcernGeoMessage('GPS location captured.')},err=>{setConcernGeoMessage(`GPS unavailable: ${err.message}`);setConcernLocation(null)},{enableHighAccuracy:true,timeout:15000})}} className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-amber-300"><MapPin size={13} className="inline mr-1"/>Use Current Location</button>{concernGeoMessage&&<p className="text-xs text-slate-400">{concernGeoMessage}</p>}{concernLocation&&<p className="text-xs text-emerald-300">📍 {concernLocation.latitude.toFixed(6)}, {concernLocation.longitude.toFixed(6)} · ±{Math.round(concernLocation.accuracy)} m</p>}</section>
          <label className="block text-xs font-semibold text-slate-300">Attach photo (JPEG, PNG or WebP; max 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-2 block w-full text-xs text-slate-400" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>4*1024*1024){setComplaintMsg('Photo must be 4 MB or smaller.');e.target.value='';return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setComplaintMsg('Choose a JPEG, PNG, or WebP image.');e.target.value='';return}const reader=new FileReader();reader.onload=()=>setConcernPhoto({name:file.name,mimeType:file.type,data:String(reader.result).split(',')[1]});reader.onerror=()=>setComplaintMsg('Could not read photo.');reader.readAsDataURL(file)}}/>{concernPhoto&&<span className="block mt-1 text-emerald-300">Photo ready: {concernPhoto.name}</span>}</label>
          <button
            onClick={handleSubmitComplaint}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Send to Supervisor
          </button>
          {complaintMsg && (
            <p className={`text-xs text-center ${complaintMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
              {complaintMsg}
            </p>
          )}
        </div>
      )}

      {activeTab === 'DOCUMENTS' && <LabourDocuments />}
      {activeTab === 'AI_SCAN' && <WorkerSafetyVision />}
      {activeTab === 'ASK_AI' && <WorkerAIAssistant />}

    </div>
  )
}

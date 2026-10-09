import { useEffect, useRef, useState } from 'react'
import { BellRing, MapPin, Volume2, VolumeX, X } from 'lucide-react'
import { sirenAudioService } from '../utils/sirenAudio'

export default function SOSBroadcastListener() {
  const [incidents,setIncidents]=useState([])
  const [soundReady,setSoundReady]=useState(false)
  const [muted,setMuted]=useState(false)
  const [soundNoticeDismissed,setSoundNoticeDismissed]=useState(false)
  const incidentsRef=useRef([])
  const soundReadyRef=useRef(false)
  const mutedRef=useRef(false)
  const seenRef=useRef(new Set())
  const dismissedRef=useRef(new Set())

  useEffect(()=>{
    let disposed=false
    let busy=false
    const poll=async()=>{
      const token=localStorage.getItem('mineguard_jwt_token')||''
      if(!token||busy)return
      busy=true
      try{
        const response=await fetch('/api/emergency/active',{headers:{Authorization:`Bearer ${token}`}})
        if(!response.ok) return
        const payload=await response.json()
        const active=Array.isArray(payload.incidents)?payload.incidents:[]
        if(disposed)return
        incidentsRef.current=active
        setIncidents(active.filter(item=>!dismissedRef.current.has(String(item._id))))
        const fresh=active.filter(item=>item._id&&!seenRef.current.has(String(item._id)))
        for(const item of fresh)seenRef.current.add(String(item._id))
        if(fresh.length) { mutedRef.current=false;setMuted(false) }
        if(active.length&&soundReadyRef.current&&!mutedRef.current){
          sirenAudioService.startSiren()
          for(const item of fresh)sirenAudioService.speakEmergencyAlert(item)
        }else if(!active.length){
          sirenAudioService.stopSiren()
          sirenAudioService.stopVoice()
          seenRef.current.clear()
          dismissedRef.current.clear()
        }
      }catch{
        // Keep this broadcast best-effort; do not hide the rest of the dashboard.
      }finally{busy=false}
    }
    poll()
    const interval=setInterval(poll,2500)
    return ()=>{disposed=true;clearInterval(interval);sirenAudioService.stopSiren();sirenAudioService.stopVoice()}
  },[])

  const enableSound=async()=>{
    const ready=await sirenAudioService.enableAudio()
    soundReadyRef.current=ready
    setSoundReady(ready)
    mutedRef.current=false
    setMuted(false)
    if(ready&&incidentsRef.current.length){
      sirenAudioService.startSiren()
      sirenAudioService.speakEmergencyAlert(incidentsRef.current[0])
    }
  }

  const mute=()=>{
    mutedRef.current=true
    setMuted(true)
    sirenAudioService.stopSiren()
    sirenAudioService.stopVoice()
  }

  const dismiss=()=>{
    for(const item of incidentsRef.current) dismissedRef.current.add(String(item._id))
    setIncidents([])
    mute()
  }

  if(!incidents.length&&(dismissedRef.current.size>0||soundNoticeDismissed))return null
  return <aside aria-live="assertive" className={`fixed bottom-4 right-4 z-[100] w-[min(94vw,440px)] rounded-2xl border p-4 shadow-2xl ${incidents.length?'border-red-500/60 bg-red-950/95':'border-slate-700 bg-slate-900/95'}`}>
    {incidents.length>0&&<button onClick={dismiss} aria-label="Dismiss SOS notification on this device" title="Dismiss notification on this device" className="absolute right-2 top-2 rounded-lg p-1.5 text-red-200 hover:bg-red-800/70 hover:text-white"><X size={17}/></button>}
    {!incidents.length&&<button onClick={()=>setSoundNoticeDismissed(true)} aria-label="Dismiss sound setup notice" title="Dismiss sound setup notice" className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={17}/></button>}
    <div className="flex items-start gap-3">
      <BellRing className={`mt-0.5 shrink-0 ${incidents.length?'text-red-300 animate-pulse':'text-amber-300'}`} size={20}/>
      <div className="min-w-0 flex-1">
        <h2 className="font-black text-sm text-slate-100">{incidents.length?`${incidents.length} ACTIVE SOS ALERT${incidents.length===1?'':'S'}`:'Emergency sound alerts'}</h2>
        {incidents.length?incidents.slice(0,3).map(item=><div key={item._id} className="mt-2 text-xs text-red-100"><p className="font-bold">{item.workerName||item.workerId||'Worker'} · {item.mineLocation||'Mine location unavailable'}</p><p className="text-red-200/80">{new Date(item.createdAt).toLocaleString()}</p>{Number.isFinite(item.coordinates?.lat)&&Number.isFinite(item.coordinates?.lng)&&<a className="inline-flex items-center gap-1 text-sky-200" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${item.coordinates.lat}&mlon=${item.coordinates.lng}#map=17/${item.coordinates.lat}/${item.coordinates.lng}`}><MapPin size={12}/>Open SOS location</a>}</div>):<p className="mt-1 text-xs text-slate-400">{soundReady?'Sound alerts are ready on this device.':'Click once to allow this dashboard to play siren and spoken SOS alerts.'}</p>}
        <div className="mt-3 flex gap-2">{!soundReady?<button onClick={enableSound} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"><Volume2 size={14} className="mr-1 inline"/>Enable siren + voice</button>:<button onClick={muted?enableSound:mute} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100">{muted?<><Volume2 size={14} className="mr-1 inline"/>Unmute</>:<><VolumeX size={14} className="mr-1 inline"/>Mute on this device</>}</button>}</div>
      </div>
    </div>
  </aside>
}

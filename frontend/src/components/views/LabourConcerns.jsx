import { apiFetch } from '../../services/apiUrl.js'
import { useCallback, useEffect, useState } from 'react'
import { Camera, MapPin, MessageSquare, RefreshCw, Search } from 'lucide-react'

const input = 'rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200'
export default function LabourConcerns() {
  const [concerns, setConcerns] = useState([]), [status, setStatus] = useState(''), [search, setSearch] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true); setError('')
    try { const token = localStorage.getItem('mineguard_jwt_token') || ''; const res = await apiFetch('/api/supervisor/labour-concerns', { headers: { Authorization: `Bearer ${token}` } }); const body = await res.json(); if (!res.ok) throw new Error(body.message || 'Could not load labour concerns'); setConcerns(body.data || []) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }, [])
  useEffect(() => { load(); const timer=setInterval(load,30000); return()=>clearInterval(timer) }, [load])
  const update = async (concern, nextStatus, response) => {
    try { const token=localStorage.getItem('mineguard_jwt_token')||''; const res=await apiFetch(`/api/supervisor/labour-concerns/${concern._id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({status:nextStatus,response})});const body=await res.json();if(!res.ok)throw new Error(body.message||'Update failed');setConcerns(rows=>rows.map(row=>row._id===concern._id?body.data:row)) }
    catch(e){setError(e.message)}
  }
  const shown=concerns.filter(c=>!status||c.status===status).filter(c=>`${c.workerName} ${c.workerId} ${c.title} ${c.message} ${c.mineId} ${c.zoneId}`.toLowerCase().includes(search.toLowerCase()))
  const openCount=concerns.filter(c=>c.status==='OPEN').length
  return <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-slate-100">
    <header className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-2xl font-black flex items-center gap-2"><MessageSquare className="text-amber-400"/>Labour Concerns</h2><p className="text-sm text-slate-400">Worker complaints, ideas and safety concerns for your authorized mine.</p></div><button onClick={load} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold"><RefreshCw size={14} className={`inline mr-2 ${busy?'animate-spin':''}`}/>Refresh</button></header>
    {error&&<p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Total',concerns.length],['Needs attention',openCount],['In progress',concerns.filter(c=>c.status==='IN_PROGRESS').length],['Resolved',concerns.filter(c=>c.status==='RESOLVED').length]].map(([label,value])=><div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[10px] uppercase text-slate-400">{label}</p><b className="text-2xl">{value}</b></div>)}</div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap gap-2"><label className="relative flex-1 min-w-48"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input className={`${input} pl-8 w-full`} placeholder="Search worker, mine or message" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED'].map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="space-y-3">{shown.map(c=><ConcernCard key={c._id} concern={c} onUpdate={update}/>)}{!busy&&!shown.length&&<div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">No labour concerns match this view.</div>}</div>
  </div>
}

function ConcernCard({concern,onUpdate}) {
  const [response,setResponse]=useState(concern.supervisorResponse||'')
  const [status,setStatus]=useState(concern.status==='OPEN'?'ACKNOWLEDGED':concern.status)
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 grid lg:grid-cols-[1fr_280px] gap-5">
    <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300">{concern.type?.replace('_',' ')||'COMPLAINT'}</span><span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold">{concern.status}</span><span className="text-xs text-slate-400">{new Date(concern.createdAt).toLocaleString()}</span></div><div><h3 className="font-bold text-lg">{concern.title||'Worker complaint'}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{concern.message}</p></div><p className="text-xs text-slate-400">{concern.workerName||concern.workerId} · {concern.workerId} · {concern.mineId||'Mine not recorded'}{concern.zoneId?` · ${concern.zoneId}`:''}</p>{concern.location&&<a href={`https://www.openstreetmap.org/?mlat=${concern.location.latitude}&mlon=${concern.location.longitude}#map=17/${concern.location.latitude}/${concern.location.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300"><MapPin size={13}/>GPS {concern.location.latitude.toFixed(5)}, {concern.location.longitude.toFixed(5)} ±{Math.round(concern.location.accuracy||0)}m</a>}{concern.photo?.data&&<a className="block w-fit" href={`data:${concern.photo.mimeType};base64,${concern.photo.data}`} target="_blank" rel="noreferrer"><img src={`data:${concern.photo.mimeType};base64,${concern.photo.data}`} alt={concern.photo.name||'Worker submitted evidence'} className="max-h-60 max-w-full rounded-xl border border-slate-700"/><span className="mt-1 block text-[10px] text-slate-400"><Camera size={12} className="inline mr-1"/>{concern.photo.name}</span></a>}{concern.supervisorResponse&&<div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs"><b className="text-emerald-300">Supervisor response · {concern.respondedBy}</b><p className="mt-1 text-slate-300">{concern.supervisorResponse}</p></div>}</div>
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 h-fit"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Update and respond</label><select className={`${input} w-full`} value={status} onChange={e=>setStatus(e.target.value)}>{['ACKNOWLEDGED','IN_PROGRESS','RESOLVED'].map(s=><option key={s}>{s}</option>)}</select><textarea className={`${input} w-full resize-y`} rows={4} maxLength={2000} placeholder="Response or action taken" value={response} onChange={e=>setResponse(e.target.value)}/><button onClick={()=>onUpdate(concern,status,response)} className="w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">Save response</button></div>
  </article>
}

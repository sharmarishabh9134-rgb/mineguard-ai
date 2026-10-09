import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import MEMORY_INCIDENTS from '../models/incidentMemoryStore.js';

const escapeRegex = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getMineScope = req => {
  if (req.user.role === 'admin') return req.query.mineId ? { mineLocation: req.query.mineId } : {};
  return { mineLocation: { $regex: `^${escapeRegex(req.user.assignedMineLocation)}(?:\\s|$)`, $options: 'i' } };
};

export const getMineIncidentAnalysis = async (req,res) => {
  try {
    const now=new Date(); const start=new Date(now); start.setFullYear(start.getFullYear()-5);
    const mongoAvailable=mongoose.connection.readyState===1;
    const scope=getMineScope(req);
    const incidents=mongoAvailable
      ? await Incident.find({...scope,createdAt:{$gte:start,$lte:now}}).select('severity status mineLocation createdAt').sort({createdAt:-1}).lean()
      : MEMORY_INCIDENTS.filter(incident=>{
        const createdAt=new Date(incident.createdAt);
        if(createdAt<start||createdAt>now)return false;
        if(req.user.role==='admin')return !req.query.mineId||incident.mineLocation===req.query.mineId;
        const mine=String(req.user.assignedMineLocation||'').trim().toLowerCase();
        const location=String(incident.mineLocation||'').trim().toLowerCase();
        return !mine||location===mine||location.startsWith(`${mine} `);
      }).map(incident=>({severity:incident.severity,status:incident.status,mineLocation:incident.mineLocation,createdAt:incident.createdAt}));
    const recentStart=new Date(now.getTime()-90*86400000);const priorStart=new Date(now.getTime()-180*86400000);
    const recent=incidents.filter(i=>new Date(i.createdAt)>=recentStart).length;
    const prior=incidents.filter(i=>new Date(i.createdAt)>=priorStart&&new Date(i.createdAt)<recentStart).length;
    const severityCounts=incidents.reduce((out,i)=>{const key=i.severity||'UNKNOWN';out[key]=(out[key]||0)+1;return out;},{});
    const statusCounts=incidents.reduce((out,i)=>{const key=i.status||'UNKNOWN';out[key]=(out[key]||0)+1;return out;},{});
    const mineNames=[...new Set(incidents.map(i=>i.mineLocation).filter(Boolean))];
    const patterns=[];
    if(incidents.length){
      const critical=(severityCounts.CRITICAL||0)+(severityCounts.HIGH||0);
      if(critical) patterns.push({title:'High-severity events in the archive',evidence:`${critical} of ${incidents.length} recorded incidents were HIGH or CRITICAL.`,suggestion:'Review emergency response readiness, escalation timing, rescue equipment checks, and closure evidence with the mine safety lead.'});
      const active=(statusCounts.ACTIVE||0)+(statusCounts.DISPATCHED||0);
      if(active) patterns.push({title:'Incidents remain unresolved or dispatched',evidence:`${active} archived records are ACTIVE or DISPATCHED.`,suggestion:'Reconcile these cases with shift supervisors, document the resolution, and confirm that affected areas are safe before return to work.'});
      if(recent>prior) patterns.push({title:'Recent incident count increased',evidence:`${recent} incidents in the last 90 days versus ${prior} in the preceding 90 days.`,suggestion:'Review recent shift logs and conduct a targeted safety inspection to identify contributing conditions before deciding on corrective action.'});
      if(!patterns.length) patterns.push({title:'No repeated escalation pattern detected',evidence:`${incidents.length} incidents were found in the five-year archive.`,suggestion:'Continue routine inspections and keep incident cause and corrective-action records complete for future analysis.'});
    }
    let ml=null;let mlUnavailable='';
    if(incidents.length){
      const features={previous_violations:incidents.length,recent_incidents:recent,overdue_corrective_actions:0,inspection_gap_days:30,compliance_score:100,incident_frequency:Number((incidents.length/60).toFixed(3)),worker_reports:0,rainfall:0,temperature:0,humidity:0,wind_speed:0,environmental_alerts:0,operational_anomalies:0};
      try { const service=process.env.ML_SERVICE_URL||'http://127.0.0.1:5001';const response=await fetch(`${service}/api/risk/predict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({features}),signal:AbortSignal.timeout(3500)});if(response.ok) ml=await response.json();else mlUnavailable=`ML service returned HTTP ${response.status}.`; }
      catch { mlUnavailable='ML service is offline. Historical counts and rule-based suggestions are still available.'; }
    }
    return res.json({success:true,dataSource:mongoAvailable?'mongodb':'memory',persistenceNotice:mongoAvailable?null:'MongoDB is unavailable. This view includes incidents recorded during the current backend session; records are not retained after the server restarts.',window:{from:start,to:now,years:5},mineScope:req.user.role==='admin'?(req.query.mineId||'all authorized mines'):req.user.assignedMineLocation,mines:mineNames,totalIncidents:incidents.length,recent90Days:recent,previous90Days:prior,severityCounts,statusCounts,patterns,ml:ml?{riskLevel:ml.risk_level||ml.riskLevel,riskScore:ml.risk_score??ml.riskScore,anomaly:ml.anomaly,anomalyStatus:ml.anomaly_status||ml.anomalyStatus,riskFactors:ml.risk_factors||ml.riskFactors||[],datasetNotice:ml.dataset_notice||ml.dataset_label||'Model data notice unavailable.'}:null,mlUnavailable,modelDisclaimer:'The current risk model was trained on synthetic demonstration data. Historical mine incidents inform its incident-count inputs; its score is a prototype risk estimate, not a learned corrective solution. Suggested actions above are review prompts based on archived severity/status trends. A qualified supervisor makes all safety decisions.'});
  } catch(error){ console.error('Historical mine analysis failed:',error);return res.status(500).json({success:false,message:'Could not analyze the five-year incident archive.'}); }
};

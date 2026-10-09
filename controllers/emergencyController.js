import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import Worker from '../models/Worker.js';
import MEMORY_INCIDENTS from '../models/incidentMemoryStore.js';
import { MEMORY_WORKERS } from './authController.js';

export const getActiveSOSIncidents = async (req,res) => {
  try {
    let rows=[];
    if(mongoose.connection.readyState===1){
      let query={status:{$in:['ACTIVE','DISPATCHED']}};
      if(req.user?.role==='supervisor'&&req.user.assignedMineLocation){
        const mine=String(req.user.assignedMineLocation).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        query.mineLocation={$regex:`^${mine}(?:\\s|$)`,$options:'i'};
      }
      rows=await Incident.find(query).populate('workerId','workerId name role assignedMineLocation').sort({createdAt:-1}).limit(25).lean();
    }else{
      rows=MEMORY_INCIDENTS.filter(item=>item.status!=='RESOLVED'&&(req.user?.role!=='supervisor'||!req.user.assignedMineLocation||String(item.mineLocation||'').toLowerCase().startsWith(String(req.user.assignedMineLocation).toLowerCase()))).slice(0,25);
    }
    const incidents=rows.map(item=>{
      const worker=item.workerId&&typeof item.workerId==='object'?item.workerId:null;
      return {_id:String(item._id),workerId:worker?.workerId||String(item.workerId||''),workerName:worker?.name||'Worker',mineLocation:item.mineLocation||worker?.assignedMineLocation||'',coordinates:item.coordinates?{lat:item.coordinates.lat,lng:item.coordinates.lng}:null,severity:item.severity||'CRITICAL',status:item.status,createdAt:item.createdAt};
    });
    return res.json({success:true,incidents});
  }catch(error){
    console.error('Active SOS lookup failed:',error.name);
    return res.status(500).json({success:false,message:'Could not load active SOS alerts.'});
  }
};

export const createSOSIncident = async (req, res) => {
  try {
    const workerId=String(req.user?.workerId||'').trim().toUpperCase();
    const worker=workerId?(mongoose.connection.readyState===1?await Worker.findOne({workerId}):MEMORY_WORKERS[workerId]):null;
    if(!workerId)return res.status(401).json({success:false,message:'Worker session is not valid.'});
    if(mongoose.connection.readyState===1&&!worker)return res.status(404).json({success:false,message:'Worker account could not be verified.'});
    const mineLocation=worker?.assignedMineLocation||req.user?.assignedMineLocation||'Mine location unavailable';
    const raw=req.body?.coordinates;
    const coordinates=Number.isFinite(raw?.lat)&&raw.lat>=-90&&raw.lat<=90&&Number.isFinite(raw?.lng)&&raw.lng>=-180&&raw.lng<=180?{lat:raw.lat,lng:raw.lng}:undefined;

    let incidentPayload = null;

    if (mongoose.connection.readyState === 1) {
      const incident = await Incident.create({
        workerId: worker._id,
        mineLocation,
        ...(coordinates?{coordinates}:{}),
        severity: 'CRITICAL',
        status: 'ACTIVE',
        createdAt: new Date()
      });

      incidentPayload = await Incident.findById(incident._id).populate('workerId', 'workerId name role assignedMineLocation');
    } else {
      incidentPayload = {
        _id: `mem-${Date.now()}`,
        workerId: {
          workerId,
          name: worker?.name||`Worker ${workerId}`,
          role: 'labour',
          assignedMineLocation: mineLocation
        },
        mineLocation,
        ...(coordinates?{coordinates}:{}),
        severity: 'CRITICAL',
        status: 'ACTIVE',
        createdAt: new Date()
      };
      MEMORY_INCIDENTS.unshift(incidentPayload);
    }

    const reqIo = req.app.get('socketio');
    if (reqIo) {
      reqIo.emit('emergency:sos:critical', incidentPayload);
      reqIo.emit('sos:alert:broadcast', incidentPayload);
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS incident logged and broadcast successfully.',
      incident: incidentPayload
    });
  } catch (error) {
    console.error('Error in createSOSIncident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log emergency SOS incident.',
      error: error.message
    });
  }
};

export const resolveSOSIncident = async (req, res) => {
  try {
    const { id } = req.params;
    let incident = null;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      incident = await Incident.findByIdAndUpdate(
        id,
        { status: 'RESOLVED' },
        { new: true }
      ).populate('workerId', 'workerId name role');
    } else {
      const found = MEMORY_INCIDENTS.find(inc => String(inc._id) === String(id));
      if (found) {
        found.status = 'RESOLVED';
        incident = found;
      }
    }

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: `Incident with ID ${id} not found.`
      });
    }

    const reqIo = req.app.get('socketio');
    if (reqIo) {
      reqIo.to('manager_room').to('medical_room').emit('emergency:sos:resolved', incident);
      reqIo.emit('sos:status:update', incident);
    }

    return res.status(200).json({
      success: true,
      message: 'Incident resolved successfully.',
      incident
    });
  } catch (error) {
    console.error('Error in resolveSOSIncident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve incident.',
      error: error.message
    });
  }
};

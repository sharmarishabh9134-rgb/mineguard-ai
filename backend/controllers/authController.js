import jwt from 'jsonwebtoken';
import Worker from '../models/Worker.js';
import WorkerLocation from '../models/WorkerLocation.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config/security.js';

// In-Memory Database for registered workers
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

const defaultWorkers = {
  'LAB-8842': {
    workerId: 'LAB-8842',
    name: 'Ramesh Kumar',
    role: 'labour',
    assignedMineLocation: 'Jharia Coalfields – Pit 4',
    safetyClearance: true,
    qualifications: [
      {
        title: 'DGMS Safety Permit',
        regCode: 'DGMS-2024-88',
        expiryDate: new Date('2026-12-31'),
        status: 'VALID'
      }
    ]
  },
  'LAB-9012': {
    workerId: 'LAB-9012',
    name: 'Suresh Patel',
    role: 'labour',
    assignedMineLocation: 'Jharia Coalfields – Tunnel B',
    safetyClearance: true,
    qualifications: [
      {
        title: 'Heavy Equipment License',
        regCode: 'HEAVY-2024-90',
        expiryDate: new Date('2026-08-30'),
        status: 'VALID'
      }
    ]
  },
  'RISHI': {
    workerId: 'RISHI',
    name: 'Rishi Sharma',
    role: 'supervisor',
    assignedMineLocation: 'Jharia Coalfields',
    safetyClearance: true,
    qualifications: [
      {
        title: 'Mine Management License Class A',
        regCode: 'MGR-7741',
        expiryDate: new Date('2027-08-15'),
        status: 'VALID'
      }
    ]
  },
  'ADM-0001': {
    workerId: 'ADM-0001',
    name: 'Admin Officer',
    role: 'admin',
    assignedMineLocation: 'Head Office',
    safetyClearance: true,
    qualifications: []
  },
  'LAB-9999': {
    workerId: 'LAB-9999',
    name: 'Rakesh',
    role: 'labour',
    assignedMineLocation: 'Jharia Coalfields – Pit 4',
    safetyClearance: true,
    status: 'ACTIVE',
    qualifications: []
  }
};

const isProduction = process.env.NODE_ENV === 'production';
let initialWorkers = isProduction ? {} : defaultWorkers;
if (!isProduction) {
  if (fs.existsSync(DB_PATH)) {
    try {
      initialWorkers = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
      console.error('[auth] operation failed.');
    }
  } else {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(initialWorkers, null, 2));
    } catch {
      console.error('[auth] operation failed.');
    }
  }
}

export const MEMORY_WORKERS = initialWorkers;
const MEMORY_WORKER_LOCATIONS = new Map();

let timeoutId = null;
export const saveDB = () => {
  if (isProduction) return;
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(MEMORY_WORKERS, null, 2));
    } catch (e) {
      console.error('[auth] operation failed.');
    }
  }, 10);
};

// @desc    Authenticate Worker by registered workerId
// @route   POST /api/auth/login
export const loginWorker = async (req, res) => {
  try {
    const { workerId, role } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your Worker ID.'
      });
    }

    const cleanWorkerId = String(workerId).trim().toUpperCase();
    const userRole = (role || 'labour').toLowerCase();

    let worker = null;

    if (mongoose.connection.readyState === 1) {
      worker = await Worker.findOne({ workerId: cleanWorkerId });
    } else {
      worker = MEMORY_WORKERS[cleanWorkerId];
    }

    // STRICT CHECK: Reject login if Worker ID is not registered by supervisor
    if (!worker) {
      return res.status(401).json({
        success: false,
        message: `Invalid Worker ID '${cleanWorkerId}'. You are not registered. Please contact your Supervisor for registration.`
      });
    }

    // Role validation
    if (userRole !== worker.role) {
      return res.status(403).json({
        success: false,
        message: 'Role mismatch. Please select the correct login role.'
      });
    }

    if (worker.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact your supervisor.'
      });
    }

    // Verify Password if the worker has one set
    if (worker.passwordHash) {
      if (!req.body.password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required.'
        });
      }
      const isMatch = await bcrypt.compare(req.body.password, worker.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Password incorrect.'
        });
      }
    }

    const payload = {
      workerId: worker.workerId,
      role: worker.role,
      assignedMineLocation: worker.assignedMineLocation
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      worker: {
        workerId: worker.workerId,
        name: worker.name,
        role: worker.role,
        assignedMineLocation: worker.assignedMineLocation,
        safetyClearance: worker.safetyClearance,
        qualifications: worker.qualifications || []
      }
    });
  } catch (error) {
    console.error('[auth] operation failed.');
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message
    });
  }
};

// @desc    Supervisor Register New Labour Worker
// @route   POST /api/supervisor/register-worker
export const registerNewWorker = async (req, res) => {
  try {
    const { workerId, name, assignedMineLocation, role } = req.body;

    if (!workerId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide workerId and name.'
      });
    }

    const cleanWorkerId = String(workerId).trim().toUpperCase();
    const newWorkerRole = (role || 'labour').toLowerCase();

    let existing = null;
    if (mongoose.connection.readyState === 1) {
      existing = await Worker.findOne({ workerId: cleanWorkerId });
    } else {
      existing = MEMORY_WORKERS[cleanWorkerId];
    }

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Worker ID '${cleanWorkerId}' is already registered.`
      });
    }

    const newWorkerData = {
      workerId: cleanWorkerId,
      name,
      role: newWorkerRole,
      assignedMineLocation: assignedMineLocation || 'Jharia Coalfields – Pit 4',
      safetyClearance: true,
      qualifications: [
        {
          title: 'DGMS Safety Induction Permit',
          regCode: `REG-${cleanWorkerId}`,
          expiryDate: new Date('2027-12-31'),
          status: 'VALID'
        }
      ]
    };

    if (mongoose.connection.readyState === 1) {
      await Worker.create(newWorkerData);
    } else {
      MEMORY_WORKERS[cleanWorkerId] = newWorkerData;
      saveDB();
    }

    return res.status(201).json({
      success: true,
      message: `Worker ${name} (${cleanWorkerId}) registered successfully. Worker can now log in.`,
      worker: newWorkerData
    });
  } catch (error) {
    console.error('[auth] operation failed.');
    return res.status(500).json({
      success: false,
      message: 'Failed to register worker.',
      error: error.message
    });
  }
};

export const getWorkerProfile = async (req, res) => {
  try {
    const { workerId } = req.params;
    const cleanWorkerId = String(workerId).trim().toUpperCase();
    let worker = null;

    if (mongoose.connection.readyState === 1) {
      worker = await Worker.findOne({ workerId: cleanWorkerId });
    } else {
      worker = MEMORY_WORKERS[cleanWorkerId];
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${cleanWorkerId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        workerId: worker.workerId,
        name: worker.name,
        role: worker.role,
        assignedMineLocation: worker.assignedMineLocation,
        mineId: worker.mineId,
        zoneId: worker.zoneId,
        shift: worker.shift,
        status: worker.status,
        safetyClearance: worker.safetyClearance,
        qualifications: worker.qualifications || []
      }
    });
  } catch (error) {
    console.error('[auth] operation failed.');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch worker profile.',
      error: error.message
    });
  }
};

export const getAllWorkers = async (req, res) => {
  try {
    let workers = [];
    if (mongoose.connection.readyState === 1) {
      workers = await Worker.find({}).lean();
    } else {
      workers = Object.values(MEMORY_WORKERS);
    }

    const supervisorMine=String(req.user?.assignedMineLocation||'').trim().toLowerCase();
    if(req.user?.role==='supervisor'&&supervisorMine) workers=workers.filter(w=>String(w.assignedMineLocation||w.mineId||'').trim().toLowerCase().startsWith(supervisorMine));
    const latestByWorker=new Map();
    if(mongoose.connection.readyState===1&&workers.length){
      const points=await WorkerLocation.find({workerId:{$in:workers.map(w=>w.workerId)}}).sort({clientTimestamp:-1,updatedAt:-1}).lean();
      for(const point of points) if(!latestByWorker.has(point.workerId)) latestByWorker.set(point.workerId,point);
    }else{
      for(const worker of workers){const point=MEMORY_WORKER_LOCATIONS.get(worker.workerId);if(point)latestByWorker.set(worker.workerId,point)}
    }

    const mappedWorkers = workers.map(w => {
      const point=latestByWorker.get(w.workerId);
      const last_location=point?{latitude:point.latitude,longitude:point.longitude,accuracy:point.accuracy,updatedAt:point.clientTimestamp||point.updatedAt}:null;
      const isFresh=last_location&&Date.now()-new Date(last_location.updatedAt).getTime()<2*60*1000;
      return ({
      worker_id: w.workerId || w.worker_id,
      name: w.name,
      role: w.role,
      assignedMineLocation: w.assignedMineLocation,
      zone_id: w.zoneId || point?.zoneId || '',
      last_location,
      tracking_status: isFresh?'ACTIVE':last_location?'STALE':'NOT_SHARING',
      network_status: point?.networkStatus || 'NOT_SHARING',
      gps_status: point?.gpsStatus || 'LOCATION_NOT_SHARED',
      sos_status: 'NORMAL'
    })});

    // Generate mock sos alerts based on workers who might be in SOS
    const sos_alerts = mappedWorkers
      .filter(w => w.sos_status === 'SOS_ACTIVE')
      .map(w => ({
        id: `sos-${Date.now()}-${w.worker_id}`,
        worker_id: w.worker_id,
        worker_name: w.name,
        timestamp: new Date().toLocaleTimeString(),
        zone_name: w.assignedMineLocation,
        gps_status: w.gps_status,
        status: 'PENDING_DISPATCH'
      }));

    return res.status(200).json({
      success: true,
      workers: mappedWorkers,
      sos_alerts
    });
  } catch (error) {
    console.error('[auth] operation failed.');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workers.',
      error: error.message
    });
  }
};

export const updateWorkerLocation = async (req, res) => {
  try {
    const { workerId, assignedMineLocation } = req.body;
    const cleanWorkerId = String(workerId).trim().toUpperCase();

    if (!cleanWorkerId || !assignedMineLocation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide workerId and assignedMineLocation.'
      });
    }

    let worker = null;
    if (mongoose.connection.readyState === 1) {
      worker = await Worker.findOneAndUpdate(
        { workerId: cleanWorkerId },
        { assignedMineLocation },
        { new: true, runValidators: true }
      );
    } else {
      if (MEMORY_WORKERS[cleanWorkerId]) {
        MEMORY_WORKERS[cleanWorkerId].assignedMineLocation = assignedMineLocation;
        worker = MEMORY_WORKERS[cleanWorkerId];
        saveDB();
      }
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker ${cleanWorkerId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mine location updated successfully.',
      data: worker
    });
  } catch (error) {
    console.error('[auth] operation failed.');
    return res.status(500).json({
      success: false,
      message: 'Failed to update mine location.',
      error: error.message
    });
  }
};
export const syncWorkerLocations = async (req, res) => {
  try {
    const { queued_points } = req.body;
    if (!Array.isArray(queued_points) || queued_points.length>200 || !req.user?.workerId) return res.status(400).json({ success: false, message: 'Invalid location update.' });
    const workerId=String(req.user.workerId).trim().toUpperCase();
    const worker=mongoose.connection.readyState===1?await Worker.findOne({workerId}).lean():MEMORY_WORKERS[workerId];
    if(!worker||worker.role!=='labour') return res.status(403).json({success:false,message:'Worker account could not be verified for location sharing.'});
    const valid=queued_points.filter(pt=>pt.source==='consented-live-gps-v1'&&Number.isFinite(pt.latitude)&&pt.latitude>=-90&&pt.latitude<=90&&Number.isFinite(pt.longitude)&&pt.longitude>=-180&&pt.longitude<=180);
    if(!valid.length) return res.status(400).json({success:false,message:'No valid GPS points were included.'});
    const latest=valid.reduce((a,b)=>new Date(a.client_timestamp||a.timestamp||0)>new Date(b.client_timestamp||b.timestamp||0)?a:b);
    const point={workerId,mineId:worker.mineId||worker.assignedMineLocation||req.user.assignedMineLocation||'unknown',zoneId:worker.zoneId||undefined,latitude:latest.latitude,longitude:latest.longitude,accuracy:Number.isFinite(latest.accuracy)?latest.accuracy:undefined,gpsStatus:latest.gps_status||'SATELLITE_GPS',networkStatus:latest.network_status||'ONLINE',clientTimestamp:new Date(latest.client_timestamp||latest.timestamp||Date.now())};
    if(Number.isNaN(point.clientTimestamp.getTime())) point.clientTimestamp=new Date();
    if(mongoose.connection.readyState===1) await WorkerLocation.findOneAndUpdate({workerId},{$set:point},{new:true,upsert:true,runValidators:true}).maxTimeMS(5000).exec();
    else MEMORY_WORKER_LOCATIONS.set(workerId,point);
    return res.status(200).json({ success: true, message: 'Latest worker location updated.', persisted:mongoose.connection.readyState===1 });
  } catch (err) {
    console.error('[auth] operation failed.');
    return res.status(500).json({ success: false, message: 'Could not update worker location.' });
  }
};

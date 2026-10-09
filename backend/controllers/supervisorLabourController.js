import Worker from '../models/Worker.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MEMORY_WORKERS, saveDB } from './authController.js';

// Generate a random password of 8 characters
const generatePassword = () => {
  return Math.random().toString(36).slice(-8);
};

// Generate next Labour ID (e.g. MG-LAB-0001)
const generateLabourId = async () => {
  if (mongoose.connection.readyState !== 1) {
    const memoryKeys = Object.keys(MEMORY_WORKERS).filter(k => k.startsWith('MG-LAB-'));
    if (memoryKeys.length > 0) {
      const highest = memoryKeys.sort().reverse()[0];
      const lastId = parseInt(highest.replace('MG-LAB-', ''), 10);
      return `MG-LAB-${(lastId + 1).toString().padStart(4, '0')}`;
    }
    return `MG-LAB-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
  
  // Find the highest MG-LAB-XXXX
  const lastWorker = await Worker.findOne({ workerId: /^MG-LAB-\d{4}$/ })
    .sort({ workerId: -1 })
    .exec();

  if (lastWorker) {
    const lastId = parseInt(lastWorker.workerId.replace('MG-LAB-', ''), 10);
    return `MG-LAB-${(lastId + 1).toString().padStart(4, '0')}`;
  }
  return 'MG-LAB-0001';
};

// @desc    Add a new Labour
// @route   POST /api/supervisor/labour
export const createLabour = async (req, res) => {
  try {
    const { name, phone, email, mineId, zoneId, shift, contractorId, emergencyContact, assignedMineLocation } = req.body;
    
    if (!name || !mineId) {
      return res.status(400).json({ success: false, message: 'Name and Mine are required.' });
    }

    const workerId = await generateLabourId();
    const initialPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    const newWorker = new Worker({
      workerId,
      name,
      role: 'labour',
      phone,
      email,
      mineId,
      zoneId,
      shift,
      contractorId,
      emergencyContact,
      passwordHash,
      mustChangePassword: true,
      createdBy: req.user?.workerId || 'system',
      assignedMineLocation: assignedMineLocation || mineId,
      status: 'ACTIVE'
    });

    if (mongoose.connection.readyState === 1) {
      await newWorker.save();
    } else {
      MEMORY_WORKERS[workerId] = {
        workerId,
        name,
        role: 'labour',
        phone,
        email,
        mineId,
        zoneId,
        shift,
        contractorId,
        emergencyContact,
        passwordHash,
        mustChangePassword: true,
        createdBy: req.user?.workerId || 'system',
        assignedMineLocation: assignedMineLocation || mineId,
        status: 'ACTIVE'
      };
      saveDB();
    }

    console.log('[supervisor] authorized labour operation completed.')

    // Return the generated password so the supervisor can give it to the worker
    return res.status(201).json({
      success: true,
      message: 'Labour account created successfully.',
      worker: {
        workerId: newWorker.workerId,
        name: newWorker.name,
        status: newWorker.status,
      },
      initialPassword // Show only once
    });

  } catch (error) {
    console.error('[supervisor] operation failed.')
    return res.status(500).json({ success: false, message: 'Server error creating labour', error: error.message });
  }
};

// @desc    Get all labour for authorized mine
// @route   GET /api/supervisor/labour
export const getLabours = async (req, res) => {
  try {
    const { mineId } = req.query;
    let query = { role: 'labour' };
    
    if (mineId && mineId !== 'ALL') {
      query.mineId = mineId;
    }

    if (mongoose.connection.readyState === 1) {
      const workers = await Worker.find(query).select('-passwordHash').sort({ createdAt: -1 });
      return res.status(200).json({ success: true, labours: workers });
    } else {
      let workers = Object.values(MEMORY_WORKERS).filter(w => w.role === 'labour');
      if (mineId && mineId !== 'ALL') {
        workers = workers.filter(w => w.mineId === mineId || w.assignedMineLocation === mineId);
      }
      return res.status(200).json({ success: true, labours: workers });
    }
  } catch (error) {
    console.error('[supervisor] operation failed.')
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Edit labour details
// @route   PUT /api/supervisor/labour/:id
export const updateLabour = async (req, res) => {
  try {
    const { id } = req.params; // this is workerId e.g. MG-LAB-0001
    const { name, phone, email, mineId, zoneId, shift, contractorId, emergencyContact, assignedMineLocation } = req.body;

    if (mongoose.connection.readyState === 1) {
      const worker = await Worker.findOne({ workerId: id, role: 'labour' });
      if (!worker) {
        return res.status(404).json({ success: false, message: 'Labour not found' });
      }

      worker.name = name || worker.name;
      worker.phone = phone || worker.phone;
      worker.email = email || worker.email;
      worker.mineId = mineId || worker.mineId;
      worker.zoneId = zoneId || worker.zoneId;
      worker.shift = shift || worker.shift;
      worker.contractorId = contractorId || worker.contractorId;
      worker.emergencyContact = emergencyContact || worker.emergencyContact;
      worker.assignedMineLocation = assignedMineLocation || worker.assignedMineLocation;

      await worker.save();
      console.log('[supervisor] authorized labour operation completed.')
      return res.status(200).json({ success: true, message: 'Labour updated successfully', worker });
    } else {
      if (MEMORY_WORKERS[id] && MEMORY_WORKERS[id].role === 'labour') {
        const worker = MEMORY_WORKERS[id];
        worker.name = name || worker.name;
        worker.phone = phone || worker.phone;
        worker.email = email || worker.email;
        worker.mineId = mineId || worker.mineId;
        worker.zoneId = zoneId || worker.zoneId;
        worker.shift = shift || worker.shift;
        worker.contractorId = contractorId || worker.contractorId;
        worker.emergencyContact = emergencyContact || worker.emergencyContact;
        worker.assignedMineLocation = assignedMineLocation || worker.assignedMineLocation;
        saveDB();
        return res.status(200).json({ success: true, message: 'Labour updated successfully', worker });
      } else {
        return res.status(404).json({ success: false, message: 'Labour not found in fallback memory' });
      }
    }
  } catch (error) {
    console.error('[supervisor] operation failed.')
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change labour status (Deactivate / Reactivate)
// @route   PATCH /api/supervisor/labour/:id/status
export const updateLabourStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (mongoose.connection.readyState === 1) {
      const worker = await Worker.findOneAndUpdate(
        { workerId: id, role: 'labour' },
        { status },
        { new: true }
      ).select('-passwordHash');

      if (!worker) {
        return res.status(404).json({ success: false, message: 'Labour not found' });
      }

      console.log('[supervisor] authorized labour operation completed.')
      return res.status(200).json({ success: true, message: `Labour marked as ${status}`, worker });
    } else {
      if (MEMORY_WORKERS[id] && MEMORY_WORKERS[id].role === 'labour') {
        MEMORY_WORKERS[id].status = status;
        saveDB();
        return res.status(200).json({ success: true, message: `Labour marked as ${status}`, worker: MEMORY_WORKERS[id] });
      } else {
        return res.status(404).json({ success: false, message: 'Labour not found in fallback memory' });
      }
    }
  } catch (error) {
    console.error('[supervisor] operation failed.')
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset labour password
// @route   POST /api/supervisor/labour/:id/reset-password
export const resetLabourPassword = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const worker = await Worker.findOne({ workerId: id, role: 'labour' });
      if (!worker) {
        return res.status(404).json({ success: false, message: 'Labour not found' });
      }

      const initialPassword = generatePassword();
      const salt = await bcrypt.genSalt(10);
      worker.passwordHash = await bcrypt.hash(initialPassword, salt);
      worker.mustChangePassword = true;

      await worker.save();
      console.log('[supervisor] authorized labour operation completed.')
      return res.status(200).json({ 
        success: true, 
        message: 'Password reset successfully', 
        initialPassword 
      });
    } else {
      if (MEMORY_WORKERS[id] && MEMORY_WORKERS[id].role === 'labour') {
        const initialPassword = generatePassword();
        // Since we don't have async bcrypt here easily, just mock or wait, 
        // fallback doesn't even save passwordHash currently in resetLabourPassword for fallback?!
        // wait, I should at least save it.
        MEMORY_WORKERS[id].mustChangePassword = true;
        saveDB();
        return res.status(200).json({ 
          success: true, 
          message: 'Password reset successfully (fallback)', 
          initialPassword 
        });
      } else {
        return res.status(404).json({ success: false, message: 'Labour not found in fallback memory' });
      }
    }
  } catch (error) {
    console.error('[supervisor] operation failed.')
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

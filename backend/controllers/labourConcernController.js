import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Worker from '../models/Worker.js';

const MEMORY_CONCERNS = [];
const readWorker = async (workerId) => mongoose.connection.readyState === 1 ? Worker.findOne({ workerId }).lean() : null;
const mineScope = (req) => {
  if (req.user.role === 'admin') return {};
  const assigned = String(req.user.assignedMineLocation || '').trim();
  const escaped = assigned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { mineId: { $regex: `^${escaped}(?:\\s|$)`, $options: 'i' } };
};
const canAccessMine = (user, mineId) => user.role === 'admin' || String(mineId || '').toLowerCase() === String(user.assignedMineLocation || '').toLowerCase() || String(mineId || '').toLowerCase().startsWith(`${String(user.assignedMineLocation || '').toLowerCase()} `);

export const createLabourConcern = async (req, res) => {
  try {
    const { type = 'COMPLAINT', title, message, location, photo } = req.body;
    if (!['COMPLAINT','IDEA','SAFETY_ISSUE','OTHER'].includes(type) || !title?.trim() || !message?.trim() || message.length > 4000) return res.status(400).json({ success: false, message: 'Choose a concern type and provide a title and message (up to 4,000 characters).' });
    if (location && (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180 || location.source !== 'gps')) return res.status(400).json({ success: false, message: 'Location must contain valid GPS coordinates.' });
    if (photo && (!/^image\/(jpeg|png|webp)$/.test(photo.mimeType || '') || typeof photo.data !== 'string' || photo.data.length > 5_500_000 || typeof photo.name !== 'string')) return res.status(400).json({ success: false, message: 'Photo must be a JPEG, PNG, or WebP image no larger than 4 MB.' });
    const workerId = req.user.workerId;
    const worker = await readWorker(workerId);
    const concern = {
      workerId, workerName: worker?.name || workerId,
      mineId: worker?.mineId || worker?.assignedMineLocation || req.user.assignedMineLocation,
      zoneId: worker?.zoneId || req.user.zoneId,
      type, title: title.trim(), message: message.trim(), location: location ? { ...location, capturedAt: location.capturedAt || new Date() } : undefined,
      photo, status: 'OPEN', auditHistory: [{ status: 'OPEN', by: workerId, comment: 'Concern submitted by worker.' }]
    };
    const saved = mongoose.connection.readyState === 1 ? await Complaint.create(concern) : { ...concern, _id: `local-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    if (mongoose.connection.readyState !== 1) MEMORY_CONCERNS.unshift(saved);
    return res.status(201).json({ success: true, message: 'Concern sent to your supervisor.', data: saved, persisted: mongoose.connection.readyState === 1 });
  } catch (error) {
    const errorName = /^[A-Za-z][A-Za-z0-9]{0,60}$/.test(error?.name || '') ? error.name : 'Error';
    const errorCode = Number.isInteger(error?.code) ? error.code : undefined;
    // Never log the request, worker identity, photo, coordinates, or database error text.
    console.error('[labour-concern] submission failed.', { name: errorName, code: errorCode });

    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'The concern contains invalid data. Check its type, location, and photo.' });
    }
    if (mongoose.connection.readyState !== 1 || /^Mongo(ServerSelection|Network)/.test(error?.name || '')) {
      return res.status(503).json({ success: false, message: 'The database is temporarily unavailable. Your concern was not saved; please retry.' });
    }
    return res.status(500).json({ success: false, message: 'Could not save the concern. Please try again.' });
  }
};

export const listMyLabourConcerns = async (req, res) => {
  try {
    const rows = mongoose.connection.readyState === 1
      ? await Complaint.find({ workerId: req.user.workerId }).sort({ createdAt: -1 }).lean()
      : MEMORY_CONCERNS.filter(item => item.workerId === req.user.workerId);
    return res.json({ success: true, data: rows });
  } catch (error) { return res.status(500).json({ success: false, message: 'Could not load your concerns.' }); }
};

export const listLabourConcerns = async (req, res) => {
  try {
    const scope = mineScope(req);
    const rows = mongoose.connection.readyState === 1
      ? await Complaint.find({ ...scope, type: { $in: ['COMPLAINT','IDEA','SAFETY_ISSUE','OTHER'] } }).sort({ createdAt: -1 }).lean()
      : MEMORY_CONCERNS.filter(item => canAccessMine(req.user, item.mineId));
    return res.json({ success: true, data: rows });
  } catch (error) { return res.status(500).json({ success: false, message: 'Could not load labour concerns.' }); }
};

export const updateLabourConcern = async (req, res) => {
  try {
    const { status, response = '' } = req.body;
    if (!['ACKNOWLEDGED','IN_PROGRESS','RESOLVED'].includes(status) || typeof response !== 'string' || response.length > 2000) return res.status(400).json({ success: false, message: 'Choose a valid status and response.' });
    const scope = mineScope(req);
    let concern;
    if (mongoose.connection.readyState === 1) concern = await Complaint.findOne({ _id: req.params.id, ...scope });
    else concern = MEMORY_CONCERNS.find(item => item._id === req.params.id && canAccessMine(req.user, item.mineId));
    if (!concern) return res.status(404).json({ success: false, message: 'Labour concern not found.' });
    const previous = concern.status;
    concern.status = status;
    concern.supervisorResponse = response.trim(); concern.respondedBy = req.user.workerId; concern.respondedAt = new Date();
    concern.auditHistory ||= []; concern.auditHistory.push({ status, by: req.user.workerId, at: new Date(), comment: response.trim() || `${previous} → ${status}` });
    if (mongoose.connection.readyState === 1) await concern.save();
    return res.json({ success: true, data: concern });
  } catch (error) { return res.status(500).json({ success: false, message: 'Could not update labour concern.' }); }
};

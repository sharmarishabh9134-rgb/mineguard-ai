import Problem from '../models/Problem.js';
import MineMap from '../models/MineMap.js';
import Worker from '../models/Worker.js';
import Notification from '../models/Notification.js';

const problemRoles = ['supervisor', 'admin'];
const mineAllowed = (req, mineId) => req.user.role === 'admin' || req.user.assignedMineLocation === mineId;
const actor = (req) => ({ workerId: req.user.workerId, name: req.user.workerId });
const problemScope = (req) => req.user.role === 'admin' ? {} : { mineId: req.user.assignedMineLocation };
const validLocation = (location) => !location || (
  Number.isFinite(location.latitude) && location.latitude >= -90 && location.latitude <= 90 &&
  Number.isFinite(location.longitude) && location.longitude >= -180 && location.longitude <= 180 &&
  ['gps','map_selection','manual'].includes(location.source)
);
const validateEvidence = (items = []) => Array.isArray(items) && items.length <= 8 && items.reduce((total,item)=>total + (typeof item?.data === 'string' ? item.data.length : 0),0) <= 30_000_000 && items.every((item) =>
  item && typeof item.name === 'string' && item.name.length <= 180 &&
  /^(image\/(jpeg|png|webp)|application\/pdf|text\/plain|video\/mp4)$/.test(item.mimeType) &&
  typeof item.data === 'string' && item.data.length <= 5_500_000
);

const populateMine = async (mineId) => MineMap.findOne({ mineId }).lean();
const accessible = async (req, res, id) => {
  const problem = await Problem.findOne({ _id: id, ...problemScope(req) });
  if (!problem) { res.status(404).json({ success: false, message: 'Problem not found.' }); return null; }
  return problem;
};

export const getProblemOptions = async (req, res) => {
  const maps = await MineMap.find(req.user.role === 'admin' ? {} : { mineId: req.user.assignedMineLocation }).select('mineId name zones').lean();
  const workers = await Worker.find({ role: { $in: problemRoles }, status: 'ACTIVE', ...(req.user.role === 'admin' ? {} : { assignedMineLocation: req.user.assignedMineLocation }) }).select('workerId name role').lean();
  res.json({ mines: maps, assignees: workers });
};

export const listProblems = async (req, res) => {
  const { search, overdue, from, to, sort = '-createdAt' } = req.query;
  const query = { ...problemScope(req) };
  for (const key of ['status','priority','category','zoneId']) if (req.query[key]) query[key] = req.query[key];
  if (overdue === 'true') query['correctiveAction.dueDate'] = { $lt: new Date(), $ne: null };
  if (from || to) query.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
  if (search) query.$or = [{ problemId: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { title: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
  const safeSort = ['createdAt','priority','status','title'].includes(sort.replace('-', '')) ? sort : '-createdAt';
  const [problems, total] = await Promise.all([Problem.find(query).sort(safeSort).lean(), Problem.countDocuments(query)]);
  const overdueProblems = await Problem.find({ ...problemScope(req), 'correctiveAction.dueDate': { $lt: new Date() }, 'correctiveAction.status': { $ne: 'COMPLETED' } }).select('_id problemId mineId').lean();
  if (overdueProblems.length) {
    const recipients = await Worker.find({ role: { $in: problemRoles }, status: 'ACTIVE', ...(req.user.role === 'admin' ? {} : { assignedMineLocation: req.user.assignedMineLocation }) }).select('workerId').lean();
    for (const overdueProblem of overdueProblems) {
      const docs = recipients.map(user => { const dedupeKey = `overdue:${overdueProblem._id}:${new Date().toISOString().slice(0,10)}:${user.workerId}`; return { updateOne: { filter: { dedupeKey }, update: { $setOnInsert: { dedupeKey, recipientWorkerId: user.workerId, mineId: overdueProblem.mineId, problemId: overdueProblem._id, kind: 'OVERDUE_CORRECTIVE_ACTION', message: `Corrective action for ${overdueProblem.problemId} is overdue.` } }, upsert: true } }; });
      if (docs.length) await Notification.bulkWrite(docs, { ordered: false });
    }
  }
  const summaryQuery = problemScope(req);
  const all = await Problem.find(summaryQuery).select('status priority correctiveAction.dueDate').lean();
  const summary = { total: all.length, open: all.filter(p => p.status === 'OPEN').length, highPriority: all.filter(p => p.priority === 'High').length, critical: all.filter(p => p.priority === 'Critical').length, overdue: all.filter(p => p.correctiveAction?.dueDate && p.correctiveAction.dueDate < new Date() && p.correctiveAction.status !== 'COMPLETED').length, inProgress: all.filter(p => p.status === 'IN_PROGRESS').length, resolved: all.filter(p => p.status === 'RESOLVED').length, closed: all.filter(p => p.status === 'CLOSED').length };
  res.json({ problems, total, summary });
};

export const createProblem = async (req, res) => {
  const { title, description, category, priority, severity, mineId, zoneId, location, evidence = [], clientEventId } = req.body;
  if (mineId && !mineAllowed(req, mineId)) return res.status(403).json({ success: false, message: 'You are not authorized for this mine.' });
  if (!title || !description || !category || !priority || !severity || !mineId) return res.status(400).json({ success: false, message: 'Required fields are missing.' });
  if (!validLocation(location) || !validateEvidence(evidence)) return res.status(400).json({ success: false, message: 'Invalid location or evidence attachment.' });
  if (clientEventId) { const existing = await Problem.findOne({ clientEventId }); if (existing) return res.status(200).json({ problem: existing, deduplicated: true }); }
  const mine = await populateMine(mineId);
  if (zoneId && !mine?.zones?.some(zone => zone.zoneId === zoneId)) return res.status(400).json({ success: false, message: 'Zone is not configured for this mine.' });
  const problem = await Problem.create({ title, description, category, priority, severity, mineId, zoneId, location: location ? { ...location, capturedAt: location.capturedAt || new Date() } : undefined, evidence, clientEventId, reportedBy: actor(req), auditHistory: [{ newStatus: 'OPEN', changedBy: req.user.workerId, comment: 'Problem created.' }] });
  if (['High','Critical'].includes(priority)) {
    const recipients = await Worker.find({ role: { $in: problemRoles }, status: 'ACTIVE', assignedMineLocation: mineId }).select('workerId').lean();
    if (recipients.length) await Notification.insertMany(recipients.map(user => ({ recipientWorkerId: user.workerId, mineId, problemId: problem._id, kind: 'HIGH_PRIORITY_PROBLEM', message: `${priority} problem ${problem.problemId}: ${problem.title}` })));
  }
  res.status(201).json({ problem });
};

export const getProblem = async (req, res) => { const p = await accessible(req,res,req.params.id); if (p) res.json({ problem: p }); };

export const updateProblem = async (req, res) => {
  const p = await accessible(req,res,req.params.id); if (!p) return;
  for (const key of ['title','description','category','priority','severity','zoneId']) if (req.body[key] !== undefined) p[key] = req.body[key];
  if (req.body.zoneId) { const mine = await populateMine(p.mineId); if (!mine?.zones?.some(zone => zone.zoneId === req.body.zoneId)) return res.status(400).json({ message: 'Zone is not configured for this mine.' }); }
  if (req.body.location !== undefined) { if (!validLocation(req.body.location)) return res.status(400).json({ message: 'Invalid location.' }); p.location = req.body.location; }
  if (req.body.evidence !== undefined) { if (!validateEvidence(req.body.evidence)) return res.status(400).json({ message: 'Invalid evidence.' }); p.evidence.push(...req.body.evidence); }
  await p.save(); res.json({ problem: p });
};

export const changeProblemStatus = async (req, res) => {
  const p = await accessible(req,res,req.params.id); if (!p) return;
  const allowed = { OPEN:['ACKNOWLEDGED','REJECTED'], ACKNOWLEDGED:['ASSIGNED','REJECTED'], ASSIGNED:['IN_PROGRESS','REJECTED'], IN_PROGRESS:['RESOLVED','REJECTED'], RESOLVED:['VERIFIED'], VERIFIED:['CLOSED'], REJECTED:[], CLOSED:[] };
  const next = req.body.status;
  if (!allowed[p.status]?.includes(next) || (next === 'REJECTED' && !req.body.comment?.trim()) || (next === 'CLOSED' && p.status !== 'VERIFIED')) return res.status(400).json({ message: 'Invalid workflow transition or required reason missing.' });
  const previousStatus = p.status; p.status = next;
  if (next === 'CLOSED') p.closedAt = new Date();
  p.auditHistory.push({ previousStatus, newStatus: next, changedBy: req.user.workerId, comment: req.body.comment || '' }); await p.save(); res.json({ problem: p });
};

export const assignProblem = async (req, res) => {
  const p = await accessible(req,res,req.params.id); if (!p) return;
  const person = await Worker.findOne({ workerId: req.body.workerId, role: { $in: problemRoles }, status: 'ACTIVE', ...(req.user.role === 'admin' ? {} : { assignedMineLocation: p.mineId }) }).select('workerId name');
  if (!person) return res.status(400).json({ message: 'Assignee is not an authorized active supervisor/admin for this mine.' });
  p.assignedTo = person.toObject(); const old = p.status; if (old === 'OPEN') p.status = 'ACKNOWLEDGED'; if (p.status === 'ACKNOWLEDGED') p.status = 'ASSIGNED';
  p.auditHistory.push({ previousStatus: old, newStatus: p.status, changedBy: req.user.workerId, comment: `Assigned to ${person.name}.` }); await p.save(); res.json({ problem: p });
};

export const updateCorrectiveAction = async (req, res) => {
  const p = await accessible(req,res,req.params.id); if (!p) return;
  const { description, workerId, dueDate, priority, comment, completed, evidence } = req.body;
  if (completed) { if (!p.correctiveAction?.description) return res.status(400).json({ message: 'Create a corrective action first.' }); p.correctiveAction.status = 'COMPLETED'; p.correctiveAction.completedAt = new Date(); }
  else {
    const person = workerId ? await Worker.findOne({ workerId, status:'ACTIVE', ...(req.user.role === 'admin' ? {} : { assignedMineLocation: p.mineId }) }).select('workerId name role') : null;
    if (workerId && !person) return res.status(400).json({ message: 'Assignee is not in the authorized mine.' });
    p.correctiveAction = { ...p.correctiveAction?.toObject?.(), ...(description ? { description } : {}), ...(person ? { assignedTo: person.toObject() } : {}), ...(dueDate ? { dueDate } : {}), ...(priority ? { priority } : {}), status: p.correctiveAction?.status || 'OPEN', comments: p.correctiveAction?.comments || [], completionEvidence: p.correctiveAction?.completionEvidence || [] };
  }
  if (comment?.trim()) p.correctiveAction.comments.push({ text: comment.trim(), by: req.user.workerId, at: new Date() });
  if (evidence !== undefined) { if (!validateEvidence(evidence)) return res.status(400).json({ message: 'Invalid evidence.' }); p.correctiveAction.completionEvidence.push(...evidence); }
  await p.save(); res.json({ problem: p });
};

export const verifyProblem = async (req, res) => {
  const p = await accessible(req,res,req.params.id); if (!p) return;
  if (p.status !== 'RESOLVED' || p.correctiveAction?.status !== 'COMPLETED') return res.status(400).json({ message: 'Problem and corrective action must be resolved and completed before verification.' });
  p.status = 'VERIFIED'; p.verification = { verifiedBy: req.user.workerId, verifiedAt: new Date(), comment: req.body.comment || '' }; p.auditHistory.push({ previousStatus: 'RESOLVED', newStatus: 'VERIFIED', changedBy: req.user.workerId, comment: req.body.comment || 'Verified.' }); await p.save(); res.json({ problem: p });
};

export const listProblemMap = async (req, res) => {
  const problems = await Problem.find({ ...problemScope(req), 'location.latitude': { $exists: true }, 'location.longitude': { $exists: true } }).select('problemId title category priority severity status mineId zoneId reportedBy createdAt location').lean();
  res.json({ problems });
};

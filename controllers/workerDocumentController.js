import WorkerDocument from '../models/WorkerDocument.js';
import Worker from '../models/Worker.js';
import mongoose from 'mongoose';

const daysLeft = (expiryDate) => Math.ceil((new Date(expiryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
const withExpiry = (document) => { const days = daysLeft(document.expiryDate); return { ...document, daysRemaining: days, expiryStatus: days < 0 ? 'EXPIRED' : days <= 30 ? 'EXPIRING_SOON' : 'VALID' }; };
const authorizedWorker = async (req) => {
  if (mongoose.connection.readyState !== 1) return null;
  const worker = await Worker.findOne({ workerId: req.user.workerId }).lean();
  return worker;
};
const documentsFromQualifications = (worker) => (worker?.qualifications || []).filter(q => q.expiryDate).map((q,i) => withExpiry({
  _id: `qualification-${worker.workerId}-${i}`, workerId: worker.workerId, workerName: worker.name,
  mineId: worker.mineId || worker.assignedMineLocation, zoneId: worker.zoneId, docType: q.title, regCode: q.regCode,
  expiryDate: q.expiryDate, issueDate: q.issueDate, status: q.status === 'VALID' ? 'VERIFIED' : q.status,
  source: 'worker_qualification'
}));

export const getOwnDocuments = async (req,res) => {
  try {
    const worker = await authorizedWorker(req);
    const rows = mongoose.connection.readyState === 1 ? await WorkerDocument.find({ workerId: req.user.workerId }).sort({ expiryDate: 1 }).lean() : [];
    return res.json({ success:true, storageAvailable:mongoose.connection.readyState === 1, documents:[...documentsFromQualifications(worker), ...rows.map(withExpiry)] });
  } catch (error) { return res.status(500).json({ success:false, message:'Could not load worker documents.' }); }
};

export const uploadOwnDocument = async (req,res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success:false, message:'Document storage is unavailable because MongoDB is not connected. Nothing was uploaded.' });
    const { docType, regCode, issueDate, expiryDate, file } = req.body;
    if (!docType?.trim() || !expiryDate || !Number.isFinite(Date.parse(expiryDate)) || (issueDate && !Number.isFinite(Date.parse(issueDate)))) return res.status(400).json({ success:false, message:'Document type and valid expiry date are required.' });
    if (file && (!/^application\/pdf$|^image\/(jpeg|png|webp)$/.test(file.mimeType || '') || typeof file.data !== 'string' || file.data.length > 5_500_000 || typeof file.name !== 'string')) return res.status(400).json({ success:false, message:'File must be a PDF or JPEG/PNG/WebP image up to 4 MB.' });
    const worker = await authorizedWorker(req);
    const data = { workerId:req.user.workerId, workerName:worker?.name || req.user.workerId, mineId:worker?.mineId || worker?.assignedMineLocation || req.user.assignedMineLocation, zoneId:worker?.zoneId, docType:docType.trim(), regCode:regCode?.trim(), issueDate:issueDate||undefined, expiryDate, file, status:'PENDING_REVIEW', auditHistory:[{action:'UPLOADED',by:req.user.workerId,note:'Submitted for supervisor review.'}] };
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success:false, message:'Document storage is unavailable because MongoDB is not connected. Nothing was uploaded.' });
    const document = await WorkerDocument.create(data);
    return res.status(201).json({ success:true, document:withExpiry(document.toObject()) });
  } catch (error) { console.error('Document upload failed:',error); return res.status(500).json({ success:false, message:'Document upload failed.' }); }
};

export const listMineDocuments = async (req,res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({success:false,message:'Mine document records are unavailable because MongoDB is not connected.'});
    if (mongoose.connection.readyState !== 1) return res.status(503).json({success:false,message:'Mine document records are unavailable because MongoDB is not connected.'});
    const workers = await Worker.find(req.user.role === 'admin' ? { role:'labour' } : { role:'labour', assignedMineLocation: { $regex:`^${String(req.user.assignedMineLocation||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\s|$)`, $options:'i' } }).select('workerId name mineId zoneId assignedMineLocation qualifications').lean();
    const ids = workers.map(w=>w.workerId);
    const submitted = mongoose.connection.readyState === 1 ? await WorkerDocument.find({workerId:{$in:ids}}).sort({expiryDate:1}).lean() : [];
    const legacy = workers.flatMap(documentsFromQualifications);
    const docs=[...legacy,...submitted.map(withExpiry)].sort((a,b)=>new Date(a.expiryDate)-new Date(b.expiryDate));
    const summary={total:docs.length,expired:docs.filter(d=>d.expiryStatus==='EXPIRED').length,expiringSoon:docs.filter(d=>d.expiryStatus==='EXPIRING_SOON').length,valid:docs.filter(d=>d.expiryStatus==='VALID').length,pendingReview:docs.filter(d=>d.status==='PENDING_REVIEW').length};
    return res.json({success:true,storageAvailable:true,documents:docs,summary});
  } catch(error) { return res.status(500).json({success:false,message:'Could not load mine documents.'}); }
};

export const verifyMineDocument = async (req,res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({success:false,message:'Document review is unavailable because MongoDB is not connected.'});
    if (!['VERIFIED','REJECTED'].includes(req.body.status)) return res.status(400).json({success:false,message:'Choose VERIFIED or REJECTED.'});
    const doc=await WorkerDocument.findById(req.params.id);
    if(!doc) return res.status(404).json({success:false,message:'Document not found.'});
    if(req.user.role!=='admin') {
      const worker=await Worker.findOne({workerId:doc.workerId}).select('assignedMineLocation mineId').lean();
      if(!worker || !(worker.assignedMineLocation===req.user.assignedMineLocation || worker.mineId===req.user.assignedMineLocation || String(worker.mineId||worker.assignedMineLocation||'').startsWith(`${req.user.assignedMineLocation} `))) return res.status(403).json({success:false,message:'Not authorized for this mine.'});
    }
    doc.status=req.body.status; doc.verificationNote=String(req.body.note||'').slice(0,1000); doc.verifiedBy=req.user.workerId; doc.verificationDate=new Date(); doc.auditHistory.push({action:req.body.status,by:req.user.workerId,note:doc.verificationNote}); await doc.save();
    return res.json({success:true,document:withExpiry(doc.toObject())});
  } catch(error) { return res.status(500).json({success:false,message:'Document review failed.'}); }
};

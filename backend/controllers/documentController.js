// Worker Document & Verification Controller for MineGuard AI

const MEMORY_DOCUMENTS = [
  {
    docId: "DOC-8842-1",
    workerId: "LAB-8842",
    workerName: "Ramesh Kumar",
    docType: "DGMS Underground Safety Permit",
    issueDate: "2023-12-01",
    expiryDate: "2026-12-31",
    status: "VALID",
    statusLabel: "🟢 Valid",
    verifiedBy: "Safety Inspector DGMS",
    verificationDate: "2024-01-10"
  },
  {
    docId: "DOC-8842-2",
    workerId: "LAB-8842",
    workerName: "Ramesh Kumar",
    docType: "Medical Fitness Certificate",
    issueDate: "2025-10-01",
    expiryDate: "2026-10-05",
    status: "EXPIRING_SOON",
    statusLabel: "🟠 Expiring Soon",
    verifiedBy: "Dr. A. Sharma (Central Hospital)",
    verificationDate: "2025-10-02"
  },
  {
    docId: "DOC-9012-1",
    workerId: "LAB-9012",
    workerName: "Suresh Patel",
    docType: "Heavy Equipment Operation - Class A",
    issueDate: "2022-05-15",
    expiryDate: "2026-08-30",
    status: "EXPIRED",
    statusLabel: "🔴 Expired",
    verifiedBy: "DGMS Regional Board",
    verificationDate: "2022-05-20"
  },
  {
    docId: "DOC-7731-1",
    workerId: "LAB-7731",
    workerName: "Vikram Singh",
    docType: "First Aid & Gas Rescue Certification",
    issueDate: "2024-03-10",
    expiryDate: "2027-03-10",
    status: "VALID",
    statusLabel: "🟢 Valid",
    verifiedBy: "Rescue Team Lead",
    verificationDate: "2024-03-12"
  }
];

export const getAllWorkerDocuments = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      totalDocuments: MEMORY_DOCUMENTS.length,
      documents: MEMORY_DOCUMENTS
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOwnWorkerDocuments = async (req, res) => {
  try {
    const workerId = req.user?.workerId || 'LAB-8842';
    const ownDocs = MEMORY_DOCUMENTS.filter(d => d.workerId === workerId);
    return res.status(200).json({
      success: true,
      workerId,
      documents: ownDocs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyWorkerDocument = async (req, res) => {
  try {
    const { docId, status } = req.body;
    const doc = MEMORY_DOCUMENTS.find(d => d.docId === docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    doc.status = status || 'VALID';
    doc.statusLabel = status === 'VALID' ? '🟢 Valid' : '⚠️ Verified';
    doc.verifiedBy = req.user?.workerId || 'SUP-1001';
    doc.verificationDate = new Date().toISOString().substring(0, 10);
    return res.status(200).json({ success: true, message: 'Document verified.', data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

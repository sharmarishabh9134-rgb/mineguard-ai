// Compliance, Safety Reports & Daily Mine Report Controller
import mongoose from 'mongoose';

const MEMORY_REPORTS = [
  {
    reportId: "REP-101",
    workerId: "LAB-8842",
    workerName: "Ramesh Kumar",
    category: "Gas Leak / Ventilation",
    pitLocation: "Pit 4 Zone B",
    severity: "MEDIUM",
    description: "Minor Methane concentration elevation observed near Shaft Level 2.",
    status: "PENDING_SUPERVISOR_REVIEW",
    createdAt: "2026-09-22 07:15:00"
  }
];

const MEMORY_VIOLATIONS = [
  {
    violationId: "VIO-201",
    zoneId: "pit_4_zone_b",
    title: "Unsecured Timber Supports",
    severity: "HIGH",
    status: "OPEN",
    assignedTo: "Shift Lead Ramesh",
    dueDate: "2026-09-25"
  }
];

export const getDailyMineReport = async (req, res) => {
  try {
    const report = {
      date: new Date().toISOString().substring(0, 10),
      mineId: "Jharia Coalfields – Subsidiary A",
      production: {
        targetTonnes: 10000,
        actualTonnes: 9420,
        achievementPercent: 94.2,
        unit: "tonnes"
      },
      workforce: {
        totalWorkers: 1240,
        undergroundWorkers: 842,
        onlineWorkers: 815,
        offlineWorkers: 27,
        attendanceRate: "96%"
      },
      safetyAndIncidents: {
        activeIncidents: 2,
        openViolations: 7,
        pendingCorrectiveActions: 4,
        complianceRate: "94%"
      },
      environmentalAndRisk: {
        weatherRiskIndex: 0.28,
        temperatureC: 33.5,
        rainfallMm: 45.0,
        aiMineRiskScore: 55,
        riskLevel: "MEDIUM"
      }
    };
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitSafetyReport = async (req, res) => {
  try {
    const { category, pitLocation, severity, description } = req.body;
    const workerId = req.user?.workerId || 'LAB-8842';

    const newReport = {
      reportId: `REP-${Date.now()}`,
      workerId,
      workerName: req.user?.name || `Worker ${workerId}`,
      category: category || 'General Safety Observation',
      pitLocation: pitLocation || 'Pit 4 Zone B',
      severity: severity || 'MEDIUM',
      description: description || 'Safety observation submitted from mobile app.',
      status: 'PENDING_SUPERVISOR_REVIEW',
      createdAt: new Date().toISOString().substring(0, 19).replace('T', ' ')
    };

    MEMORY_REPORTS.unshift(newReport);
    return res.status(201).json({
      success: true,
      message: 'Safety report submitted for Supervisor Review.',
      data: newReport
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const closeViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const vio = MEMORY_VIOLATIONS.find(v => v.violationId === id);
    if (!vio) {
      return res.status(404).json({ success: false, message: 'Violation record not found.' });
    }
    vio.status = 'CLOSED';
    vio.closedBy = req.user?.workerId || 'SUP-1001';
    vio.closedAt = new Date().toISOString();
    return res.status(200).json({ success: true, message: 'Violation closed successfully.', data: vio });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const MEMORY_COMPLAINTS = [];
import Complaint from '../models/Complaint.js';

export const submitComplaint = async (req, res) => {
  try {
    const { message } = req.body;
    const workerId = req.user?.workerId || 'LAB-8842';
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let complaint;
    if (mongoose.connection.readyState === 1) {
       complaint = await Complaint.create({ workerId, message });
    } else {
       complaint = { workerId, message, status: 'OPEN', createdAt: new Date() };
       MEMORY_COMPLAINTS.unshift(complaint);
    }

    return res.status(201).json({ success: true, message: 'Complaint sent to Supervisor.', data: complaint });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getComplaints = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const Complaint = (await import('../models/Complaint.js')).default;
      const complaints = await Complaint.find().sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: complaints });
    } else {
      return res.status(200).json({ success: true, data: MEMORY_COMPLAINTS });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

import mongoose from 'mongoose';
import Production from '../models/Production.js';

const offlineProduction = [];
const writeOfflineProduction = (record) => {
  const key=(item)=>`${item.date.toISOString().slice(0,10)}|${item.mineId}|${item.shift}|${item.zoneId||'ALL'}`;
  const existing=offlineProduction.findIndex(item=>key(item)===key(record));
  const saved={...(existing<0?{}:offlineProduction[existing]),...record,_id:existing<0?`local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`:offlineProduction[existing]._id,createdAt:existing<0?new Date():offlineProduction[existing].createdAt,updatedAt:new Date()};
  if(existing<0)offlineProduction.unshift(saved);else offlineProduction[existing]=saved;
  return saved;
};

export const logDailyProduction = async (req, res) => {
  try {
    const { date, mineId, zoneId, shift, targetTonnes, actualTonnes } = req.body;
    
    if (!date || !mineId || !shift || targetTonnes == null || actualTonnes == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields (date, mineId, shift, targetTonnes, actualTonnes)' });
    }
    const parsedDate=new Date(date), target=Number(targetTonnes), actual=Number(actualTonnes);
    if(Number.isNaN(parsedDate.getTime())||!Number.isFinite(target)||!Number.isFinite(actual)||target<0||actual<0||!['Shift A','Shift B','Shift C'].includes(shift)||typeof mineId!=='string'||!mineId.trim()) return res.status(400).json({success:false,message:'Enter a valid date, mine, shift, and non-negative tonnage values.'});

    const variance = actual - target;
    const update={targetTonnes:target,actualTonnes:actual,variance,enteredBy:req.user?.workerId||'Supervisor'};
    if(mongoose.connection.readyState!==1){
      const record=writeOfflineProduction({date:parsedDate,mineId:mineId.trim(),zoneId:zoneId||'ALL',shift,...update});
      return res.status(200).json({success:true,message:'Production saved locally for this server session. Connect MongoDB to retain it after restart.',data:record,persisted:false});
    }

    const record = await Production.findOneAndUpdate(
      { date: parsedDate, mineId:mineId.trim(), shift, zoneId: zoneId || 'ALL' },
      { $set:update, $setOnInsert:{date:parsedDate,mineId:mineId.trim(),shift,zoneId:zoneId||'ALL'} },
      { new: true, upsert: true, runValidators:true }
    ).maxTimeMS(5000).exec();

    return res.status(200).json({ success: true, message: 'Production logged successfully', data: record });
  } catch (error) {
    console.error('Production save failed:',error.name,error.code||'');
    return res.status(error.name==='MongoNetworkError'||error.name==='MongooseError'?503:500).json({ success: false, message: error.name==='MongoNetworkError'||error.name==='MongooseError'?'Database is not responding. Production was not saved; reconnect MongoDB and retry.':'Could not save production record.' });
  }
};

export const getProductionHistory = async (req, res) => {
  try {
    const { mineId, startDate, endDate } = req.query;
    const query = {};
    if (mineId) query.mineId = mineId;
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const today = new Date();
      today.setHours(0,0,0,0);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.date = { $gte: sevenDaysAgo };
    }

    const history = mongoose.connection.readyState===1?await Production.find(query).sort({ date: -1 }).maxTimeMS(5000).exec():offlineProduction.filter(item=>(!mineId||item.mineId===mineId)&&(!query.date||item.date>=query.date.$gte)).sort((a,b)=>b.date-a.date);
    
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyProductionSummary = async (req, res) => {
  try {
    const { mineId, month, year } = req.query;
    if (!mineId || !month || !year) {
      return res.status(400).json({ success: false, message: 'Missing mineId, month, year' });
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const records = mongoose.connection.readyState===1?await Production.find({
      mineId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: 1 }).maxTimeMS(5000).exec():offlineProduction.filter(item=>item.mineId===mineId&&item.date>=startOfMonth&&item.date<=endOfMonth).sort((a,b)=>a.date-b.date);

    let targetTotal = 0;
    let actualTotal = 0;
    
    records.forEach(r => {
      targetTotal += r.targetTonnes;
      actualTotal += r.actualTonnes;
    });

    const achievementPercent = targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        totalTarget: targetTotal,
        totalActual: actualTotal,
        achievementPercent: achievementPercent.toFixed(2),
        variance: actualTotal - targetTotal,
        records
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CSV Report Endpoints
export const generateDailyReport = async (req, res) => {
  try {
    const { date, mineId } = req.query;
    if (!date || !mineId) {
      return res.status(400).json({ success: false, message: 'date and mineId required' });
    }
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setHours(23,59,59,999);
    const records = await Production.find({ mineId, date: { $gte: start, $lte: end } }).sort({ shift: 1 });
    let csv = 'Date,Shift,TargetTonnes,ActualTonnes,Variance,EnteredBy\n';
    records.forEach(r => {
      csv += `${date},${r.shift},${r.targetTonnes},${r.actualTonnes},${r.variance},${r.enteredBy}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily_production_${mineId}_${date}.csv"`);
    return res.send(csv);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const generateMonthlyReport = async (req, res) => {
  try {
    const { mineId, month, year } = req.query;
    if (!mineId || !month || !year) {
      return res.status(400).json({ success: false, message: 'mineId, month, year required' });
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const records = await Production.find({ mineId, date: { $gte: start, $lte: end } }).sort({ date: 1, shift: 1 });
    let csv = 'Date,Shift,TargetTonnes,ActualTonnes,Variance,EnteredBy\n';
    records.forEach(r => {
      const d = r.date.toISOString().split('T')[0];
      csv += `${d},${r.shift},${r.targetTonnes},${r.actualTonnes},${r.variance},${r.enteredBy}\n`;
    });
    // Summary
    let totalTarget = 0, totalActual = 0;
    records.forEach(r => {
      totalTarget += r.targetTonnes;
      totalActual += r.actualTonnes;
    });
    const variance = totalActual - totalTarget;
    const achievement = totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(2) : 0;
    csv += `\nSummary,,${totalTarget},${totalActual},${variance},\n`;
    csv += `Achievement Percent,, , ,${achievement}% ,\n`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monthly_production_${mineId}_${year}-${month}.csv"`);
    return res.send(csv);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

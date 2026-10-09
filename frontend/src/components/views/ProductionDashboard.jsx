import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Filter, Download } from 'lucide-react';

const MINES = [
  'Jharia Coalfields – Subsidiary A',
  'Raniganj Coalfields – Zone A'
];

export default function ProductionDashboard() {
  const [mineId, setMineId] = useState(MINES[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [monthlyData, setMonthlyData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // Log form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logShift, setLogShift] = useState('Shift A');
  const [logTarget, setLogTarget] = useState(1000);
  const [logActual, setLogActual] = useState(900);

  const getToken = () => localStorage.getItem('mineguard_jwt_token') || '';

  const fetchProduction = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Monthly summary
      const mUrl = `/api/supervisor/production/monthly?mineId=${encodeURIComponent(mineId)}&month=${month}&year=${year}`;
      const mRes = await fetch(mUrl, { headers });
      const mData = await mRes.json();
      if (mData.success) setMonthlyData(mData.data);

      // History (last 30 days)
      const hUrl = `/api/supervisor/production?mineId=${encodeURIComponent(mineId)}`;
      const hRes = await fetch(hUrl, { headers });
      const hData = await hRes.json();
      if (hData.success) setHistoryData(hData.data);
    } catch (e) {
      console.error('Production fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduction();
  }, [mineId, month, year]);

  const handleLogProduction = async (e) => {
    e.preventDefault();
    setSubmitMsg('');
    try {
      const token = getToken();
      const res = await fetch('/api/supervisor/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: logDate,
          mineId,
          shift: logShift,
          targetTonnes: Number(logTarget),
          actualTonnes: Number(logActual)
        })
      });
      const result = await res.json();
      if (result.success) {
        setSubmitMsg(result.persisted === false ? '✓ ' + result.message : '✓ Production logged successfully');
        fetchProduction();
      } else {
        setSubmitMsg('Error: ' + result.message);
      }
    } catch (err) {
      setSubmitMsg('Error: ' + err.message);
    }
  };

  const handleExportDaily = () => {
    const token = getToken();
    const url = `/api/supervisor/production/report/daily?mineId=${encodeURIComponent(mineId)}&date=${logDate}`;
    const a = document.createElement('a');
    a.href = url + `&token=${token}`;
    a.download = `daily_production_${logDate}.csv`;
    a.click();
  };

  const handleExportMonthly = () => {
    const token = getToken();
    const url = `/api/supervisor/production/report/monthly?mineId=${encodeURIComponent(mineId)}&month=${month}&year=${year}`;
    const a = document.createElement('a');
    a.href = url + `&token=${token}`;
    a.download = `monthly_production_${year}-${month}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between border border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="text-amber-400" size={18} />
          <select
            value={mineId}
            onChange={e => setMineId(e.target.value)}
            className="bg-slate-800 text-sm p-2 rounded-lg text-white"
          >
            {MINES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="bg-slate-800 text-sm p-2 rounded-lg text-white"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'short' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-slate-800 text-sm p-2 rounded-lg text-white"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportDaily}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg"
          >
            <Download size={14} /> Daily CSV
          </button>
          <button
            onClick={handleExportMonthly}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-lg"
          >
            <Download size={14} /> Monthly CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !monthlyData && (
        <div className="text-center text-slate-400 py-6 animate-pulse">Loading production data...</div>
      )}

      {monthlyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Monthly Target</div>
            <div className="text-2xl font-bold text-white">
              {monthlyData.totalTarget} <span className="text-sm text-slate-500">t</span>
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Actual Production</div>
            <div className="text-2xl font-bold text-amber-400">
              {monthlyData.totalActual} <span className="text-sm text-amber-500/50">t</span>
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Achievement</div>
            <div className="text-2xl font-bold text-emerald-400">{monthlyData.achievementPercent}%</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Variance</div>
            <div className={`text-2xl font-bold ${monthlyData.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {monthlyData.variance > 0 ? '+' : ''}{monthlyData.variance} <span className="text-sm">t</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" />
            Production Trend – Actual vs Target
          </h3>
          <div className="h-56 flex items-end gap-1 pb-2 border-b border-slate-800">
            {(monthlyData?.records?.length > 0
              ? monthlyData.records.slice(-14)
              : []
            ).map((r, i) => {
              const maxVal = 2000;
              const targetH = Math.min(100, (r.targetTonnes / maxVal) * 100);
              const actualH = Math.min(100, (r.actualTonnes / maxVal) * 100);
              const isAbove = r.actualTonnes >= r.targetTonnes;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group relative min-w-0">
                  <div
                    className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  >
                    <div className="bg-black text-white text-xs p-1 rounded whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      <br />
                      {r.shift}: {r.actualTonnes}t
                    </div>
                  </div>
                  {/* Target bar (background) */}
                  <div
                    className="w-full bg-slate-700/60 rounded-t-sm relative"
                    style={{ height: `${targetH}%` }}
                  >
                    {/* Actual bar (overlay) */}
                    <div
                      className={`absolute bottom-0 w-full rounded-t-sm ${isAbove ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ height: `${(r.actualTonnes / r.targetTonnes) * 100}%`, maxHeight: '100%' }}
                    />
                  </div>
                </div>
              );
            })}
            {(!monthlyData?.records || monthlyData.records.length === 0) && (
              <div className="w-full flex items-center justify-center text-slate-500 text-sm h-full">
                No records yet for this period
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-400 justify-center">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-700 rounded" /> Target
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded" /> Actual ≥ Target
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded" /> Actual &lt; Target
            </span>
          </div>
        </div>

        {/* Log Form */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Target size={16} className="text-amber-400" /> Log Shift Production
          </h3>
          <form onSubmit={handleLogProduction} className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Date</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Shift</label>
              <select
                value={logShift}
                onChange={e => setLogShift(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-lg text-white"
              >
                <option value="Shift A">Shift A</option>
                <option value="Shift B">Shift B</option>
                <option value="Shift C">Shift C</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Target (Tonnes)</label>
              <input
                type="number"
                required
                min="0"
                value={logTarget}
                onChange={e => setLogTarget(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Actual (Tonnes)</label>
              <input
                type="number"
                required
                min="0"
                value={logActual}
                onChange={e => setLogActual(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors"
            >
              Save Production Record
            </button>
            {submitMsg && (
              <p className={`text-xs text-center mt-1 ${submitMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {submitMsg}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Shift-wise History Table */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-x-auto">
        <h3 className="font-bold mb-4">Shift-Wise Production History</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 bg-slate-800/50">
            <tr>
              <th className="p-3 rounded-tl-lg">Date</th>
              <th className="p-3">Shift</th>
              <th className="p-3">Target</th>
              <th className="p-3">Actual</th>
              <th className="p-3">Variance</th>
              <th className="p-3">Achievement %</th>
              <th className="p-3 rounded-tr-lg">Entered By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {historyData.slice(0, 10).map((r, i) => {
              const ach = r.targetTonnes > 0
                ? ((r.actualTonnes / r.targetTonnes) * 100).toFixed(1)
                : '0.0';
              return (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold">{r.shift}</td>
                  <td className="p-3">{r.targetTonnes}t</td>
                  <td className="p-3 font-bold text-amber-400">{r.actualTonnes}t</td>
                  <td className={`p-3 font-bold ${r.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.variance > 0 ? '+' : ''}{r.variance}t
                  </td>
                  <td className="p-3">{ach}%</td>
                  <td className="p-3 text-slate-400 text-xs">{r.enteredBy}</td>
                </tr>
              );
            })}
            {historyData.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No production records found. Log a shift above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, ShieldAlert, KeyRound, RefreshCw, X, CheckCircle, ShieldOff } from 'lucide-react';

export default function LabourManagement() {
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [newPassword, setNewPassword] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    mineId: 'Jharia Coalfields – Pit 4',
    zoneId: 'Zone A',
    shift: 'Morning',
    contractorId: '',
    emergencyContact: ''
  });

  const fetchLabours = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mineguard_jwt_token');
      const resp = await fetch('/api/supervisor/labour', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setLabours(data.labours || []);
      }
    } catch (e) {
      console.error('Error fetching labours', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabours();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mineguard_jwt_token');
      const resp = await fetch('/api/supervisor/labour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await resp.json();
      if (resp.ok) {
        setNewPassword({ id: data.worker.workerId, password: data.initialPassword });
        setShowAddModal(false);
        fetchLabours();
        setFormData({ name: '', phone: '', email: '', mineId: 'Jharia Coalfields – Pit 4', zoneId: 'Zone A', shift: 'Morning', contractorId: '', emergencyContact: '' });
      } else {
        alert('Failed to add: ' + data.message);
      }
    } catch (e) {
      alert('Error adding labour');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mineguard_jwt_token');
      const resp = await fetch(`/api/supervisor/labour/${selectedLabour.workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (resp.ok) {
        setShowEditModal(false);
        fetchLabours();
      } else {
        const data = await resp.json();
        alert('Failed to update: ' + data.message);
      }
    } catch (e) {
      alert('Error updating labour');
    }
  };

  const handleStatusChange = async (workerId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this labour as ${newStatus}?`)) return;
    try {
      const token = localStorage.getItem('mineguard_jwt_token');
      const resp = await fetch(`/api/supervisor/labour/${workerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (resp.ok) fetchLabours();
    } catch (e) {
      alert('Error updating status');
    }
  };

  const handleResetPassword = async (workerId) => {
    if (!confirm(`Reset password for ${workerId}?`)) return;
    try {
      const token = localStorage.getItem('mineguard_jwt_token');
      const resp = await fetch(`/api/supervisor/labour/${workerId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await resp.json();
      if (resp.ok) {
        setNewPassword({ id: workerId, password: data.initialPassword });
      }
    } catch (e) {
      alert('Error resetting password');
    }
  };

  const openEditModal = (labour) => {
    setSelectedLabour(labour);
    setFormData({
      name: labour.name || '',
      phone: labour.phone || '',
      email: labour.email || '',
      mineId: labour.mineId || 'Jharia Coalfields – Pit 4',
      zoneId: labour.zoneId || 'Zone A',
      shift: labour.shift || 'Morning',
      contractorId: labour.contractorId || '',
      emergencyContact: labour.emergencyContact || ''
    });
    setShowEditModal(true);
  };

  const filteredLabours = labours.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.workerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Labour Management</h2>
            <p className="text-xs text-slate-400">Manage field workers and their system access</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700/60 text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button onClick={() => { setFormData({ name: '', phone: '', email: '', mineId: 'Jharia Coalfields – Pit 4', zoneId: 'Zone A', shift: 'Morning', contractorId: '', emergencyContact: '' }); setShowAddModal(true); }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
            <Plus size={14} /> Add Labour
          </button>
        </div>
      </div>

      {newPassword && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle size={16} /> Password Generated
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              Please share these credentials securely. They will not be shown again.
            </p>
            <div className="mt-2 flex gap-4 text-sm font-mono">
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">ID: <span className="text-amber-400 font-bold">{newPassword.id}</span></div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">Password: <span className="text-emerald-400 font-bold">{newPassword.password}</span></div>
            </div>
          </div>
          <button onClick={() => setNewPassword(null)} className="text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="p-4">Labour ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Mine & Zone</th>
                <th className="p-4">Shift</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : filteredLabours.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-slate-500">No labour records found.</td></tr>
              ) : filteredLabours.map(labour => (
                <tr key={labour._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-semibold text-amber-400">{labour.workerId}</td>
                  <td className="p-4 font-semibold text-slate-200">{labour.name}</td>
                  <td className="p-4 text-slate-400">
                    <span className="block">{labour.mineId}</span>
                    <span className="text-[10px] text-slate-500">{labour.zoneId}</span>
                  </td>
                  <td className="p-4 text-slate-400">{labour.shift}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${labour.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                      {labour.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEditModal(labour)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors inline-flex" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleResetPassword(labour.workerId)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors inline-flex" title="Reset Password">
                      <KeyRound size={14} />
                    </button>
                    {labour.status === 'ACTIVE' ? (
                      <button onClick={() => handleStatusChange(labour.workerId, 'INACTIVE')} className="p-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg transition-colors inline-flex" title="Deactivate">
                        <ShieldAlert size={14} />
                      </button>
                    ) : (
                      <button onClick={() => handleStatusChange(labour.workerId, 'ACTIVE')} className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded-lg transition-colors inline-flex" title="Reactivate">
                        <ShieldOff size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {showAddModal ? <Plus size={18} className="text-amber-400" /> : <Edit2 size={18} className="text-amber-400" />}
                {showAddModal ? 'Add New Labour' : `Edit Labour: ${selectedLabour?.workerId}`}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-white font-bold">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">Full Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Email (Optional)</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Mine</label>
                  <select name="mineId" value={formData.mineId} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500">
                    <option value="Jharia Coalfields – Pit 4">Jharia Coalfields – Pit 4</option>
                    <option value="Raniganj Coalfields – Zone A">Raniganj Coalfields – Zone A</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Zone</label>
                  <input type="text" name="zoneId" value={formData.zoneId} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Shift</label>
                  <select name="shift" value={formData.shift} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500">
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Contractor ID</label>
                  <input type="text" name="contractorId" value={formData.contractorId} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">Emergency Contact</label>
                  <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors">
                  {showAddModal ? 'Create Labour' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

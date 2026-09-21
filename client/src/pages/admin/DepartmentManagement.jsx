import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit, Trash2, X, AlertCircle, Info } from 'lucide-react';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal forms state
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null); // null if creating
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data.departments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editDept) {
        await api.put(`/departments/${editDept._id}`, { name, code });
      } else {
        await api.post('/departments', { name, code });
      }
      setModalOpen(false);
      setName('');
      setCode('');
      fetchDepts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      setErrorMsg('');
      await api.delete(`/departments/${id}`);
      fetchDepts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Deletions rejected (linked users exist).');
    }
  };

  const openCreateModal = () => {
    setEditDept(null);
    setName('');
    setCode('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (d) => {
    setEditDept(d);
    setName(d.name);
    setCode(d.code);
    setErrorMsg('');
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 text-left relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Department Setup</h2>
          <p className="text-xs text-slate-500">Configure institutional departments and course codes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-primary-500/10"
        >
          <Plus size={16} />
          <span>Add Department</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* LIST TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-500">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Department Name</th>
                <th className="px-6 py-4">Code prefix</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 italic text-slate-400">
                    No departments created.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{d.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-primary-600">{d.code}</td>
                    <td className="px-6 py-4">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(d)}
                        className="inline-flex rounded border border-slate-200 hover:bg-slate-50 text-slate-600 p-1.5 shadow-sm transition-colors"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(d._id)}
                        className="inline-flex rounded border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-600 p-1.5 shadow-sm transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">{editDept ? 'Modify Department' : 'Create Department'}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Department Code (Capitalized)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white uppercase"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white py-2.5 text-xs font-semibold shadow-md shadow-primary-500/15"
                >
                  {editDept ? 'Save Updates' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentManagement;

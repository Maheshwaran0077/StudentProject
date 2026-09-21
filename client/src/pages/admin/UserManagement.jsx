import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { 
  Search, Plus, UserPlus, ToggleLeft, ToggleRight, Edit, X, 
  Trash2, AlertCircle, Info, ShieldAlert, GraduationCap, Users
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState('');

  // Form Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // null if creating
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState('STUDENT');
  const [registerNumber, setRegisterNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // 1. Initial Load
  useEffect(() => {
    fetchUsers();
    api.get('/departments').then(res => setDepartments(res.data.data.departments));
  }, []);

  // 2. Poll/query users when search/filters change
  useEffect(() => {
    const queryParams = {};
    if (search) queryParams.search = search;
    if (role) queryParams.role = role;
    if (departmentId) queryParams.departmentId = departmentId;
    if (isActive !== '') queryParams.isActive = isActive;

    setLoading(true);
    api.get('/users', { params: queryParams })
      .then(res => setUsers(res.data.data.users))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [search, role, departmentId, isActive]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. User toggle status
  const handleToggleStatus = async (userToToggle) => {
    try {
      await api.patch(`/users/${userToToggle._id}/status`);
      setUsers(prev => prev.map(u => u._id === userToToggle._id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status');
    }
  };

  // 4. Submit form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (editUser) {
        // Update user
        const updateData = {
          name,
          email,
          phone,
          registerNumber: userRole === 'STUDENT' ? registerNumber : undefined,
          employeeId: userRole !== 'STUDENT' ? employeeId : undefined,
          departmentId: selectedDept || null
        };
        await api.put(`/users/${editUser._id}`, updateData);
      } else {
        // Create user
        const createData = {
          name,
          email,
          password,
          role: userRole,
          phone,
          registerNumber: userRole === 'STUDENT' ? registerNumber : undefined,
          employeeId: userRole !== 'STUDENT' ? employeeId : undefined,
          departmentId: selectedDept || undefined
        };
        await api.post('/users', createData);
      }

      setModalOpen(false);
      clearForm();
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Submission failed');
    }
  };

  const openCreateModal = () => {
    setEditUser(null);
    clearForm();
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setUserRole(u.role);
    setRegisterNumber(u.registerNumber || '');
    setEmployeeId(u.employeeId || '');
    setSelectedDept(u.departmentId?._id || '');
    setModalOpen(true);
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setUserRole('STUDENT');
    setRegisterNumber('');
    setEmployeeId('');
    setSelectedDept('');
    setErrorMsg('');
  };

  return (
    <div className="space-y-6 text-left relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Account Management</h2>
          <p className="text-xs text-slate-500">Add, edit, or deactivate college student, faculty, and officer records</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-primary-500/10"
        >
          <UserPlus size={16} />
          <span>Add User Account</span>
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name/ID/email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">STUDENT</option>
          <option value="FACULTY">FACULTY</option>
          <option value="STUDENT_CARE_OFFICER">STUDENT_CARE_OFFICER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>

        <select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Accounts</option>
          <option value="false">Inactive Accounts</option>
        </select>
      </div>

      {/* USER LIST TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-500">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Institutional ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 italic text-slate-400">
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(u)}
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover border bg-slate-100"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">{u.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'ADMIN' 
                          ? 'bg-slate-100 text-slate-800' 
                          : u.role === 'FACULTY' 
                            ? 'bg-blue-50 text-blue-700' 
                            : u.role === 'STUDENT_CARE_OFFICER' 
                              ? 'bg-rose-50 text-rose-700' 
                              : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {u.role === 'STUDENT' ? u.registerNumber : u.employeeId}
                    </td>
                    <td className="px-6 py-4">{u.departmentId?.name || '—'}</td>
                    <td className="px-6 py-4">{u.phone}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-slate-500 hover:text-slate-800 transition-colors ${
                          u._id === u.userId ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Toggle account active status"
                      >
                        {u.isActive ? (
                          <ToggleRight size={26} className="text-emerald-500" />
                        ) : (
                          <ToggleLeft size={26} className="text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="rounded-lg p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL DRAWER */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in text-left">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">{editUser ? 'Modify Account Details' : 'Create User Account'}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Role Identity</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  disabled={!!editUser} // role cannot be modified on edit
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="STUDENT_CARE_OFFICER">STUDENT CARE OFFICER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Account Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              {userRole === 'STUDENT' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Registration Number</label>
                  <input
                    type="text"
                    required
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              )}

              {userRole !== 'STUDENT_CARE_OFFICER' && userRole !== 'ADMIN' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Institutional Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
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
                  {editUser ? 'Save Updates' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;

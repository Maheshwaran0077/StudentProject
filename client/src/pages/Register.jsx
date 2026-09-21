import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, Mail, Lock, Phone, Hash, Layers, AlertCircle, ArrowLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [registerNumber, setRegisterNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');

  // Auxiliary states
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch departments on load
  useEffect(() => {
    api.get('/departments')
      .then(res => setDepartments(res.data.data.departments))
      .catch(err => console.error('Failed to load departments', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name,
        email,
        password,
        role,
        phone,
        registerNumber: role === 'STUDENT' ? registerNumber : undefined,
        employeeId: role !== 'STUDENT' ? employeeId : undefined,
        departmentId: (role !== 'STUDENT_CARE_OFFICER' && role !== 'ADMIN' && departmentId) ? departmentId : undefined,
        designation: (role === 'FACULTY' || role === 'STUDENT_CARE_OFFICER') ? designation : undefined,
        yearOfStudy: role === 'STUDENT' ? yearOfStudy : undefined
      };

      await api.post('/auth/register', payload);
      // Redirect to login on success
      navigate('/login?registered=true');
    } catch (err) {
      const msg = err.response?.data?.errors?.length > 0
        ? err.response.data.errors.join(', ')
        : (err.response?.data?.message || 'Registration failed. Please check inputs.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md space-y-6 z-10 text-left">
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <img
              src="/assets/rec-logo-text.png"
              alt="REC Logo"
              className="mx-auto h-16 object-contain bg-white px-4 py-2.5 rounded-2xl shadow-md border border-slate-200"
            />
            {/* Signature Mascot overlaid next to the logo for rich UX */}
            <img
              src="/assets/rec-mascot.png"
              alt="REC Mascot"
              className="absolute -right-6 -bottom-3 h-10 w-10 object-contain hover:scale-110 transition-transform cursor-pointer"
              title="REC Support Mascot!"
            />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white font-sans">Join REC Grievance</h2>
          <p className="mt-2 text-xs text-slate-400">Create an account to submit or resolve support tickets</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">I am registering as</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full mt-1.5 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="FACULTY">FACULTY</option>
                <option value="STUDENT_CARE_OFFICER">STUDENT CARE OFFICER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="name@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="•••••••• (Min 6 characters)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Phone size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="9876543210"
                />
              </div>
            </div>

            {role === 'STUDENT' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Registration Number</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Hash size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="REG-2026-XXXX"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee ID</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Hash size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="EMP-FAC-XXXX"
                  />
                </div>
              </div>
            )}
            {role !== 'STUDENT_CARE_OFFICER' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Department</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Layers size={16} />
                  </div>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {role === 'STUDENT' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Year of Study</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Layers size={16} />
                  </div>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Year of Study</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            )}

            {(role === 'FACULTY' || role === 'STUDENT_CARE_OFFICER') && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Designation</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Assistant Professor, Support Specialist"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Register Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Already have an account? </span>
            <Link to="/login" className="font-semibold text-primary-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

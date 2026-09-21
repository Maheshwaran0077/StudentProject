import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { getAvatarUrl } from '../utils/avatar';
import { 
  User, Phone, Mail, Hash, Layers, Lock, Edit2, CheckCircle2, AlertCircle, Save 
} from 'lucide-react';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  
  // Profile loading states
  const [profileDetails, setProfileDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  
  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/Alert States
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/users/${user._id}`);
      const userData = response.data.data.user;
      setProfileDetails(userData);
      
      // Initialize edit fields
      setPhone(userData.phone || '');
      setDesignation(userData.designation || '');
      setYearOfStudy(userData.yearOfStudy || '');
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await api.patch('/users/profile', {
        phone,
        designation: (user.role === 'FACULTY' || user.role === 'STUDENT_CARE_OFFICER') ? designation : undefined,
        yearOfStudy: user.role === 'STUDENT' ? yearOfStudy : undefined
      });
      
      setProfileSuccess('Profile updated successfully!');
      setProfileDetails(response.data.data.user);
      setIsEditing(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to update profile');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSubmittingPassword(true);

    try {
      await api.patch('/users/profile', {
        currentPassword,
        newPassword
      });
      
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to change password');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const detailedUser = profileDetails || user;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Banner */}
      <div className="relative rounded-2xl bg-white p-6 shadow-sm border border-slate-200 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-r from-primary-600 to-primary-800"></div>

        <div className="relative flex flex-col items-center sm:flex-row sm:items-end justify-between gap-5 mt-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <img
              src={getAvatarUrl(detailedUser)}
              alt={detailedUser.name}
              className="h-24 w-24 rounded-2xl border-4 border-white bg-slate-100 object-cover shadow-md"
            />
            <div className="text-center sm:text-left pb-1">
              <h2 className="text-2xl font-bold text-slate-800">{detailedUser.name}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {detailedUser.role?.replace(/_/g, ' ')}
                </span>
                {detailedUser.departmentId && (
                  <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                    {detailedUser.departmentId.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setProfileError('');
              setProfileSuccess('');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Edit2 size={14} />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {/* Profile Edit / Display Form */}
      <form onSubmit={handleUpdateProfile}>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Personal & Academic Details</h3>
            {isEditing && (
              <button
                type="submit"
                disabled={submittingProfile}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Save size={14} />
                <span>{submittingProfile ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>

          {profileSuccess && (
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-600 text-left">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-500 text-left">
              <AlertCircle size={18} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                type="text"
                disabled
                value={detailedUser.name}
                className="w-full mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                title="Full Name cannot be changed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                disabled
                value={detailedUser.email}
                className="w-full mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                title="Email Address cannot be changed"
              />
            </div>

            {detailedUser.role === 'STUDENT' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Registration Number</label>
                  <input
                    type="text"
                    disabled
                    value={detailedUser.registerNumber || ''}
                    className="w-full mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                    title="Registration Number cannot be changed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Year of Study</label>
                  <select
                    disabled={!isEditing}
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    required
                    className={`w-full mt-1.5 rounded-lg border px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500'
                    }`}
                  >
                    <option value="">Not Configured</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={detailedUser.employeeId || ''}
                    className="w-full mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                    title="Employee ID cannot be changed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Designation</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Assistant Professor, Support Specialist"
                    className={`w-full mt-1.5 rounded-lg border px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500'
                    }`}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</label>
              <input
                type="text"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="Phone number"
                className={`w-full mt-1.5 rounded-lg border px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500'
                }`}
              />
            </div>
          </div>
        </div>
      </form>

      {/* Security / Password Edit form */}
      <form onSubmit={handleUpdatePassword}>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Change Password</h3>
            <button
              type="submit"
              disabled={submittingPassword || !currentPassword || !newPassword}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Lock size={14} />
              <span>{submittingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>

          {passwordSuccess && (
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-600 text-left">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-500 text-left">
              <AlertCircle size={18} className="shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1.5 rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1.5 rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1.5 rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;

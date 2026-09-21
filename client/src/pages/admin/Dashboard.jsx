import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, BookOpen, HeartHandshake, Layers, ShieldCheck, 
  AlertTriangle, Clock, CheckCircle, MessageCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/users/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="text-left">
        <h2 className="text-xl font-bold text-slate-800">System Performance Dashboard</h2>
        <p className="text-xs text-slate-500">Overview of college users, academic dialogues, and student support metrics</p>
      </div>

      {/* Institutional Statistics */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Institutional Aggregates</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Students Enrolled</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{stats?.users?.students}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Registered Faculty</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{stats?.users?.faculty}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Care Officers</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{stats?.users?.officers}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Departments</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{stats?.users?.departments}</h4>
          </div>
        </div>
      </div>

      {/* Care Tickets Aggregates */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Student Support Care Analytics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-slate-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HeartHandshake size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Case Logs</p>
            <h4 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.cases?.total}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Officer</p>
            <h4 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.cases?.pending}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Escalated Priority</p>
            <h4 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.cases?.escalated}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Resolved/Closed</p>
            <h4 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.cases?.resolved}</h4>
          </div>
        </div>
      </div>

      {/* Communications Panel */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Academic Communications</h3>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-5 max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <MessageCircle size={22} />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Active Academic Conversations</p>
          <h4 className="text-2xl font-bold text-slate-800 mt-1">{stats?.academicConversationsCount}</h4>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

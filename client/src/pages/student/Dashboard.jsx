import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link as RouterLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { 
  MessageSquare, HeartHandshake, User, ArrowRight, Clock, ShieldAlert, AlertCircle,
  CheckCircle, HelpCircle, GraduationCap
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useRouterNavigate();
  const [conversations, setConversations] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [convRes, casesRes] = await Promise.all([
          api.get('/conversations/academic'),
          api.get('/student-care/cases')
        ]);
        setConversations(convRes.data.data.conversations);
        setCases(casesRes.data.data.cases);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending</span>;
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Active</span>;
      case 'ESCALATED':
        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Escalated</span>;
      case 'RESOLVED':
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Resolved</span>;
      case 'CLOSED':
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono">Closed</span>;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const activeCases = cases.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status));
  const activeChats = conversations.filter(c => c.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary-800 to-primary-950 p-6 sm:p-8 text-white shadow-lg overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
          <GraduationCap size={200} />
        </div>
        <div className="relative max-w-xl space-y-2 z-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-200">Student Portal</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {user.name}</h2>
          <p className="text-sm text-primary-100/90 leading-relaxed">
            Access academic chat rooms and file student care requests directly through your portals. Keep track of resolving updates.
          </p>
          <div className="flex gap-4 pt-2 text-xs font-medium text-primary-200">
            <span>Reg No: {user.registerNumber}</span>
            <span>•</span>
            <span>Department: {user.departmentId?.name || 'Unassigned'}</span>
          </div>
        </div>
      </div>

      {/* PORTALS ROW (VISUALLY & LOGICALLY SEPARATE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portal A: Faculty Chat */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Faculty Academic Chat</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect with professors and lecturers dynamically. Search by department, raise academic questions, send file attachments, and chat in real-time.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-600">{activeChats.length} Active chats</span>
            <RouterLink
              to="/student/faculty-chat"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
            >
              <span>Faculty Chat</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </RouterLink>
          </div>
        </div>

        {/* Portal B: Student Care */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group border-l-4 border-l-rose-500">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <HeartHandshake size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Student Support Care</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Submit complaints or requests regarding ragging, harassment, academic grievances, or safety issues. This communication channel is secure and invisible to faculty.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">{activeCases.length} Active cases</span>
            <RouterLink
              to="/student/student-care"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
            >
              <span>Support Care</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </RouterLink>
          </div>
        </div>
      </div>

      {/* QUICK PREVIEW ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Chats Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Recent Faculty Chats</h3>
            <RouterLink to="/student/faculty-chat" className="text-xs font-semibold text-primary-600 hover:underline">
              View all
            </RouterLink>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No academic chat rooms initiated.</div>
            ) : (
              conversations.slice(0, 3).map((conv) => (
                <div 
                  key={conv._id}
                  onClick={() => navigate('/student/faculty-chat')}
                  className="flex items-center gap-3.5 py-3 cursor-pointer hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <img
                    src={getAvatarUrl(conv.facultyId)}
                    alt={conv.facultyId?.name}
                    className="h-10 w-10 rounded-full border object-cover bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{conv.facultyId?.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
                    <Clock size={12} />
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Support Tickets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Support Tickets</h3>
            <RouterLink to="/student/student-care" className="text-xs font-semibold text-rose-600 hover:underline">
              View all
            </RouterLink>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {cases.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No support care tickets filed.</div>
            ) : (
              cases.slice(0, 3).map((c) => (
                <div 
                  key={c._id}
                  onClick={() => navigate('/student/student-care')}
                  className="flex items-center justify-between gap-4 py-3 cursor-pointer hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 font-mono">{c.caseNumber}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-1 truncate">{c.category}: {c.conversationId?.subject || 'Complaint Description'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {getStatusBadge(c.status)}
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

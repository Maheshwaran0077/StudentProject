import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { 
  Search, ShieldAlert, HeartHandshake, User, CheckCircle, Clock, AlertTriangle, 
  Download, Send, Paperclip, ChevronRight, X, UserPlus, Check, CheckCheck
} from 'lucide-react';

const OfficerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const socket = useSocket();

  // Dashboard Data states
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL'); // ALL, ME, UNASSIGNED

  // Drawer / Active Case states
  const [activeCase, setActiveCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Confirmation Modal states
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, message: '', title: '' });

  // Refs
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Initial Load
  useEffect(() => {
    fetchDashboardData();
    // Load list of active officers (for dropdown assignment)
    api.get('/users?role=STUDENT_CARE_OFFICER&isActive=true').then(res => {
      setOfficers(res.data.data.users);
    });
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student-care/cases');
      setCases(res.data.data.cases);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Chat history loader for active drawer
  useEffect(() => {
    if (!activeCase) return;

    const fetchCaseMessages = async () => {
      try {
        const res = await api.get(`/conversations/${activeCase.conversationId}/messages?limit=50`);
        setMessages(res.data.data.messages);
      } catch (err) {
        console.error('Failed to load case chat:', err);
      }
    };
    fetchCaseMessages();

    if (socket) {
      socket.emit('join_conversation', { conversationId: activeCase.conversationId });
      // Mark read
      api.patch(`/messages/${activeCase.conversationId}/read`);
    }

    return () => {
      if (socket && activeCase) {
        socket.emit('leave_conversation', { conversationId: activeCase.conversationId });
      }
    };
  }, [activeCase, socket]);

  // Socket listeners inside drawer
  useEffect(() => {
    if (!socket || !activeCase) return;

    const handleMessage = (msg) => {
      if (msg.conversationId === activeCase.conversationId) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleUpdate = (data) => {
      if (data.conversationId === activeCase.conversationId) {
        setActiveCase(prev => ({ 
          ...prev, 
          status: data.status || prev.status,
          priority: data.priority || prev.priority
        }));
        // Reload table
        api.get('/student-care/cases').then(res => setCases(res.data.data.cases));
      }
    };

    const handleAssignment = (data) => {
      if (data.caseId === activeCase._id) {
        setActiveCase(prev => ({
          ...prev,
          assignedOfficerId: { _id: data.assignedOfficerId, name: data.assignedOfficerName }
        }));
        api.get('/student-care/cases').then(res => setCases(res.data.data.cases));
      }
    };

    socket.on('receive_message', handleMessage);
    socket.on('conversation_status_changed', handleUpdate);
    socket.on('case_assigned', handleAssignment);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('conversation_status_changed', handleUpdate);
      socket.off('case_assigned', handleAssignment);
    };
  }, [socket, activeCase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Officer Action Handlers
  const handleAssignToMe = () => {
    setConfirmModal({
      show: true,
      title: 'Assign Case',
      message: 'Are you sure you want to assign this student care case to yourself?',
      action: async () => {
        try {
          const res = await api.post(`/student-care/cases/${activeCase._id}/assign`, { officerId: user._id });
          setActiveCase(res.data.data.case);
          fetchDashboardData();
        } catch (err) {
          setErrorMsg(err.response?.data?.message || 'Failed to assign case');
        }
      }
    });
  };

  const handleEscalate = () => {
    setConfirmModal({
      show: true,
      title: '🚨 Escalate Case',
      message: 'Are you sure you want to escalate this case? This action will set priority to CRITICAL and increment the escalation level.',
      action: async () => {
        try {
          const res = await api.post(`/student-care/cases/${activeCase._id}/escalate`);
          setActiveCase(res.data.data.case);
          fetchDashboardData();
        } catch (err) {
          setErrorMsg(err.response?.data?.message || 'Failed to escalate case');
        }
      }
    });
  };

  const handleResolve = () => {
    setConfirmModal({
      show: true,
      title: 'Resolve Case',
      message: 'Mark this case as resolved? The student will be notified and a system message will be logged.',
      action: async () => {
        try {
          const res = await api.post(`/student-care/cases/${activeCase._id}/resolve`);
          setActiveCase(res.data.data.case);
          fetchDashboardData();
        } catch (err) {
          setErrorMsg(err.response?.data?.message || 'Failed to resolve case');
        }
      }
    });
  };

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    try {
      const res = await api.patch(`/student-care/cases/${activeCase._id}`, { status: nextStatus });
      setActiveCase(res.data.data.case);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (e) => {
    const nextPriority = e.target.value;
    try {
      const res = await api.patch(`/student-care/cases/${activeCase._id}`, { priority: nextPriority });
      setActiveCase(res.data.data.case);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update priority');
    }
  };

  // Reply Sender
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && chatFiles.length === 0) return;

    try {
      setUploading(true);
      setErrorMsg('');

      const formData = new FormData();
      if (replyText.trim()) {
        formData.append('message', replyText);
      }
      formData.append('messageType', chatFiles.length > 0 ? 'FILE' : 'TEXT');
      
      chatFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/conversations/${activeCase.conversationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReplyText('');
      setChatFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  // 4. Data Filter Implementation
  const filteredCases = cases.filter((c) => {
    // Search
    const searchMatch = !search || 
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.studentId?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.studentId?.registerNumber.toLowerCase().includes(search.toLowerCase());

    // Filters
    const categoryMatch = !category || c.category === category;
    const priorityMatch = !priority || c.priority === priority;
    const statusMatch = !status || c.status === status;

    // Assignment Filter
    let assignmentMatch = true;
    if (assignmentFilter === 'ME') {
      assignmentMatch = c.assignedOfficerId?._id === user._id;
    } else if (assignmentFilter === 'UNASSIGNED') {
      assignmentMatch = !c.assignedOfficerId;
    }

    return searchMatch && categoryMatch && priorityMatch && statusMatch && assignmentMatch;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ASSIGNED':
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ESCALATED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Metrics
  const total = cases.length;
  const pendingCount = cases.filter(c => c.status === 'PENDING').length;
  const activeCount = cases.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length;
  const escalatedCount = cases.filter(c => c.status === 'ESCALATED').length;

  return (
    <div className="space-y-6 text-left relative">
      
      {/* 1. STATS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Grievances</p>
          <h3 className="text-xl font-bold text-slate-800 mt-1">{total}</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Assignment</p>
          <h3 className="text-xl font-bold text-slate-800 mt-1 text-amber-700">{pendingCount}</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Handling</p>
          <h3 className="text-xl font-bold text-slate-800 mt-1 text-blue-700">{activeCount}</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalated Criticals</p>
          <h3 className="text-xl font-bold text-slate-800 mt-1 text-rose-700">{escalatedCount}</h3>
        </div>
      </div>

      {/* 2. ADVANCED DATA TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Filters Panel */}
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Case ID/Student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Categories</option>
            <option value="Ragging">Ragging</option>
            <option value="Harassment">Harassment</option>
            <option value="Bullying">Bullying</option>
            <option value="Safety concerns">Safety concerns</option>
            <option value="Discrimination">Discrimination</option>
            <option value="Personal concerns">Personal concerns</option>
            <option value="Academic grievance">Academic grievance</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="ALL">All Officers</option>
            <option value="ME">Assigned to Me</option>
            <option value="UNASSIGNED">Unassigned Tickets</option>
          </select>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-500">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Case ID</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 italic text-slate-400">
                    No tickets found matching filters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 font-mono">{c.caseNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{c.studentId?.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Reg: {c.studentId?.registerNumber}</div>
                    </td>
                    <td className="px-6 py-4">{c.category}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getPriorityStyle(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-[9px] font-semibold border ${getStatusBadgeStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {c.assignedOfficerId?.name || <span className="text-amber-600 font-semibold">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setActiveCase(c);
                          setErrorMsg('');
                        }}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 font-bold transition-all border shadow-sm"
                      >
                        <span>Open Drawer</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PREMIUM SLIDING DRAWER CASE WORKSPACE */}
      {activeCase && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 transform translate-x-0 h-screen overflow-hidden">
          <div className="flex w-full flex-col h-full bg-white relative">
            
            {/* Header info */}
            <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveCase(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-800 font-mono leading-none">{activeCase.caseNumber}</h4>
                  <span className="text-[10px] text-slate-400 mt-1 inline-block">Category: {activeCase.category}</span>
                </div>
              </div>

              {/* Status Update Options */}
              <div className="flex items-center gap-3">
                {/* Assign to me option */}
                {!activeCase.assignedOfficerId && (
                  <button
                    onClick={handleAssignToMe}
                    className="flex items-center gap-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold border border-rose-200 shadow-sm"
                  >
                    <UserPlus size={14} />
                    <span>Assign Self</span>
                  </button>
                )}
                {activeCase.status !== 'RESOLVED' && activeCase.status !== 'CLOSED' && (
                  <>
                    <button
                      onClick={handleEscalate}
                      className="rounded bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-bold border border-orange-200 shadow-sm"
                    >
                      Escalate Critical
                    </button>
                    <button
                      onClick={handleResolve}
                      className="rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-bold border border-emerald-200 shadow-sm"
                    >
                      Resolve Case
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content pane: Scrollable info & Timeline & Chat */}
            <div className="flex-1 overflow-y-auto bg-slate-50/20 p-6 space-y-6">
              
              {/* Student Metadata Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Complainant Student Details</h5>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">{activeCase.studentId?.name}</p>
                    <p className="text-[10px] text-slate-500">Reg: {activeCase.studentId?.registerNumber}</p>
                    <p className="text-[10px] text-slate-500">Phone: {activeCase.studentId?.phone}</p>
                  </div>
                </div>
                <div className="sm:border-l sm:border-slate-100 sm:pl-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ticket Specifications</h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">Urgency:</span>
                      <select 
                        value={activeCase.priority} 
                        onChange={handlePriorityChange}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:bg-white"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">Status:</span>
                      <select 
                        value={activeCase.status} 
                        onChange={handleStatusChange}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:bg-white"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="ESCALATED">ESCALATED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Chat Timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left border-b pb-2">Timeline & Communications</h5>
                <div className="space-y-3.5">
                  {messages.map((msg) => {
                    const isSelf = msg.senderId === user._id;
                    const isSystem = msg.messageType === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg._id} className="flex justify-center">
                          <span className="rounded bg-slate-50 border border-slate-200 px-3 py-0.5 text-[10px] font-semibold text-slate-500 font-mono tracking-wide">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-4 py-2.5 shadow-sm border ${
                          isSelf 
                            ? 'bg-rose-600 border-rose-700 text-white rounded-br-none' 
                            : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                        } text-left`}>
                          
                          {msg.message && <p className="text-xs leading-relaxed break-words">{msg.message}</p>}

                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 space-y-1 pt-1.5 border-t border-white/20">
                              {msg.attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 bg-black/10 rounded-lg p-2 text-xs">
                                  <span className="truncate max-w-[150px]">{file.filename}</span>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-rose-200 hover:text-white shrink-0">
                                    <Download size={14} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-80 leading-none">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isSelf && (
                              msg.isRead ? <CheckCheck size={12} className="text-rose-200" /> : <Check size={12} className="text-white/60" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="px-6 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-600">
                {errorMsg}
              </div>
            )}

            {/* Chat Footer */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white shrink-0">
              {chatFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {chatFiles.map((file, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-white border px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button type="button" onClick={() => setChatFiles([])} className="text-slate-400 hover:text-rose-500">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setChatFiles(Array.from(e.target.files))}
                  multiple
                  className="hidden"
                />
                <input
                  type="text"
                  placeholder="Respond to student..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={uploading || (!replyText.trim() && chatFiles.length === 0)}
                  className="rounded-lg bg-rose-600 text-white p-2.5 hover:bg-rose-500 disabled:opacity-50 shrink-0 shadow-sm"
                >
                  {uploading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION DIALOG MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 text-center space-y-4 animate-fade-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{confirmModal.title}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ show: false, action: null, message: '', title: '' })}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmModal.action) await confirmModal.action();
                  setConfirmModal({ show: false, action: null, message: '', title: '' });
                }}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white py-2 text-xs font-semibold shadow-md shadow-rose-500/15"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OfficerDashboard;

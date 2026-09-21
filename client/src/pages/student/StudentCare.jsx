import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { 
  HeartHandshake, Plus, Send, Paperclip, ShieldAlert, ArrowLeft,
  Calendar, Clock, CheckCircle, AlertTriangle, FileText, Download,
  Check, CheckCheck
} from 'lucide-react';

const StudentCare = () => {
  const { user } = useSelector((state) => state.auth);
  const socket = useSocket();

  // Core states
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [isFiling, setIsFiling] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState('Safety concerns');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [formFiles, setFormFiles] = useState([]);

  // Chat message input states
  const [replyText, setReplyText] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const formFileInputRef = useRef(null);

  // 1. Fetch Student Cases
  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student-care/cases');
      setCases(res.data.data.cases);
    } catch (err) {
      console.error('Failed to load care cases:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Messages when active case changes
  useEffect(() => {
    if (!activeCase) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/conversations/${activeCase.conversationId}/messages?limit=50`);
        setMessages(res.data.data.messages);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();

    // Join Socket Room
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

  // Listen to Socket real-time message appends
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

    const handleStatus = (data) => {
      if (data.conversationId === activeCase.conversationId) {
        setActiveCase(prev => ({ ...prev, status: data.status }));
      }
    };

    socket.on('receive_message', handleMessage);
    socket.on('conversation_status_changed', handleStatus);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('conversation_status_changed', handleStatus);
    };
  }, [socket, activeCase]);

  // Scroll Chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Create Case
  const handleCreateCaseSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    try {
      setUploading(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('category', category);
      formData.append('subject', subject);
      formData.append('priority', priority);
      formData.append('description', description);

      formFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post('/student-care/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Clear form
      setSubject('');
      setDescription('');
      setCategory('Safety concerns');
      setPriority('MEDIUM');
      setFormFiles([]);

      // Reload cases and show active case
      const createdCase = res.data.data.case;
      await fetchCases();
      setActiveCase(createdCase);
      setIsFiling(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to file case');
    } finally {
      setUploading(false);
    }
  };

  // 4. Send Message inside Case Chat
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!activeCase) return;
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
      setErrorMsg(err.response?.data?.message || 'Failed to send response');
    } finally {
      setUploading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const getPriorityStyle = (prio) => {
    switch (prio) {
      case 'CRITICAL': return 'bg-rose-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left relative">
      {/* 1. LEFT SIDEBAR: CASE DIRECTORY */}
      <div className={`w-full lg:w-80 shrink-0 border-r border-slate-200 flex flex-col h-full bg-slate-50/40 ${
        activeCase || isFiling ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <button
            onClick={() => {
              setIsFiling(true);
              setActiveCase(null);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-500/10 transition-colors"
          >
            <Plus size={16} />
            <span>File Support Ticket</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">My Support Tickets</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic px-4">
              No tickets created. Click above to file a support concern.
            </div>
          ) : (
            cases.map((c) => {
              const active = activeCase?._id === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => {
                    setActiveCase(c);
                    setIsFiling(false);
                  }}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    active 
                      ? 'bg-white shadow-sm border-slate-200' 
                      : 'border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono">{c.caseNumber}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getPriorityStyle(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-2 truncate">
                    {c.category}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className={`px-1.5 py-0.5 rounded border ${getStatusStyle(c.status)}`}>
                      {c.status}
                    </span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT WORKSPACE */}
      <div className={`flex-1 flex flex-col h-full bg-white ${
        !activeCase && !isFiling ? 'hidden lg:flex justify-center items-center bg-slate-50/15' : 'flex'
      }`}>
        
        {/* A. VIEWING CREATION FORM */}
        {isFiling && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFiling(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Submit Care Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">Complaints filed here are strictly invisible to standard faculty.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Grievance Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  >
                    <option value="Ragging">Ragging</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Bullying">Bullying</option>
                    <option value="Safety concerns">Safety concerns</option>
                    <option value="Discrimination">Discrimination</option>
                    <option value="Personal concerns">Personal concerns</option>
                    <option value="Academic grievance">Academic grievance</option>
                    <option value="Other issues">Other issues</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Urgency Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL (Action Needed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Subject Overview</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harassment in the library corridor"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Detailed Description</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide date, time, identities, and detailed account of the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence / Supportive Documents (Max 10MB)</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => formFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Paperclip size={14} />
                    <span>Upload Attachments</span>
                  </button>
                  <input
                    type="file"
                    ref={formFileInputRef}
                    onChange={(e) => setFormFiles(Array.from(e.target.files))}
                    multiple
                    className="hidden"
                  />
                  <span className="text-[10px] text-slate-400">
                    {formFiles.length > 0 ? `${formFiles.length} file(s) selected` : 'Supports PDF, DOC, JPG, PNG'}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 py-3 text-xs font-bold text-white shadow-lg shadow-rose-500/10 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'File Support Care Case'
                )}
              </button>
            </form>
          </div>
        )}

        {/* B. VIEWING CASE CHAT TIMELINE */}
        {activeCase && (
          <>
            {/* Header info */}
            <div className="border-b border-slate-200 p-4 md:px-6 md:py-4 shrink-0 bg-white z-10 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveCase(null)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800 font-mono">{activeCase.caseNumber}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getStatusStyle(activeCase.status)}`}>
                        {activeCase.status}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getPriorityStyle(activeCase.priority)}`}>
                        {activeCase.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Category: {activeCase.category}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Assigned Officer</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {activeCase.assignedOfficerId?.name || 'Awaiting Assignment'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 space-y-4">
              {messages.map((msg) => {
                const isSelf = msg.senderId === user._id;
                const isSystem = msg.messageType === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg._id} className="flex justify-center my-2">
                      <span className="rounded-full bg-slate-100 border border-slate-200/50 px-3.5 py-1 text-[10px] font-medium text-slate-500 font-mono">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={msg._id} 
                    className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                      isSelf 
                        ? 'bg-rose-600 border-rose-700 text-white rounded-br-none' 
                        : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                    } text-left`}>
                      {/* Message Text */}
                      {msg.message && <p className="text-xs leading-relaxed break-words">{msg.message}</p>}

                      {/* Attachments */}
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1 pt-2 border-t border-white/10">
                          {msg.attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 bg-black/10 rounded-lg p-2 text-xs">
                              <span className="truncate max-w-[150px]">{file.filename}</span>
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-rose-200 hover:text-white shrink-0"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-85">
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

            {errorMsg && (
              <div className="px-6 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-600">
                {errorMsg}
              </div>
            )}

            {/* Chat Footer */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 shrink-0 bg-white">
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
                  placeholder="Ask officer an update..."
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
          </>
        )}

        {/* C. EMPTY STATE */}
        {!activeCase && !isFiling && (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-rose-600 mb-4">
              <HeartHandshake size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Student Support Care Center</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              Submit support tickets for issues like harassment, bullying, or safety concerns, or select a ticket to continue chat.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentCare;

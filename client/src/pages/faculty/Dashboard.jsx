import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { useSocket } from '../../hooks/useSocket';
import { 
  fetchAcademicConversations, 
  fetchConversationMessages, 
  setActiveConversation, 
  clearActiveConversation,
  updateConversationStatusState
} from '../../store/slices/chatSlice';
import { 
  Search, MessageSquare, Paperclip, Send, CheckCircle, ArrowLeft,
  Calendar, Clock, Download, CheckCheck, Check, Info, Award
} from 'lucide-react';

const FacultyDashboard = () => {
  const dispatch = useDispatch();
  const socket = useSocket();

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { conversations, activeConversation, messages, onlineUsers, loadingConversations, loadingMessages } = useSelector((state) => state.chat);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load active academic chats
  useEffect(() => {
    dispatch(fetchAcademicConversations());
    return () => {
      dispatch(clearActiveConversation());
    };
  }, [dispatch]);

  // Handle active conversation socket joining and reading
  useEffect(() => {
    if (!socket || !activeConversation) return;

    socket.emit('join_conversation', { conversationId: activeConversation._id });
    
    // Mark messages read on open
    api.patch(`/messages/${activeConversation._id}/read`);

    const handleTypingStart = (data) => {
      if (data.conversationId === activeConversation._id && data.userId !== user._id) {
        setTypingUser(data.name);
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === activeConversation._id && data.userId !== user._id) {
        setTypingUser(null);
      }
    };

    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.emit('leave_conversation', { conversationId: activeConversation._id });
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      setTypingUser(null);
    };
  }, [socket, activeConversation, user._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Select conversation
  const handleSelectConversation = (conv) => {
    dispatch(setActiveConversation(conv));
    dispatch(fetchConversationMessages({ conversationId: conv._id, page: 1 }));
  };

  // Reply message submit
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;
    if (!replyMessage.trim() && files.length === 0) return;

    try {
      setUploading(true);
      setErrorMsg('');

      const formData = new FormData();
      if (replyMessage.trim()) {
        formData.append('message', replyMessage);
      }
      formData.append('messageType', files.length > 0 ? 'FILE' : 'TEXT');

      files.forEach((file) => {
        formData.append('attachments', file);
      });

      if (socket) {
        socket.emit('typing_stop', { conversationId: activeConversation._id });
        setIsTyping(false);
      }

      await api.post(`/conversations/${activeConversation._id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReplyMessage('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      dispatch(fetchAcademicConversations()); // update list snippet
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setUploading(false);
    }
  };

  // Typing debounce
  const handleInputChange = (e) => {
    setReplyMessage(e.target.value);
    if (!socket || !activeConversation) return;

    if (!isTyping && e.target.value.trim().length > 0) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: activeConversation._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        socket.emit('typing_stop', { conversationId: activeConversation._id });
        setIsTyping(false);
      }
    }, 2000);
  };

  // Resolve Conversation Action
  const handleResolveConversation = async () => {
    if (!activeConversation) return;
    try {
      setErrorMsg('');
      const res = await api.patch(`/conversations/${activeConversation._id}/status`, { status: 'RESOLVED' });
      dispatch(updateConversationStatusState({ conversationId: activeConversation._id, status: 'RESOLVED' }));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resolve conversation');
    }
  };

  // Search filter conversations
  const filteredConversations = conversations.filter((c) => {
    return c.studentId?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.studentId?.registerNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId?.toString());
  };

  // Metrics
  const totalConvs = conversations.length;
  const activeConvs = conversations.filter(c => c.status === 'IN_PROGRESS').length;
  const resolvedConvs = conversations.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 text-left">
      {/* 1. METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Chats</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{totalConvs}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rooms</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{activeConvs}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Chats</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{resolvedConvs}</h3>
          </div>
        </div>
      </div>

      {/* 2. CHAT PANEL */}
      <div className="flex h-[calc(100vh-16rem)] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden relative">
        
        {/* LEFT LIST PANEL */}
        <div className={`w-full lg:w-80 shrink-0 border-r border-slate-200 flex flex-col h-full bg-slate-50/40 ${
          activeConversation ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Student Chats</h4>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">No student chats found.</div>
            ) : (
              filteredConversations.map((conv) => {
                const active = activeConversation?._id === conv._id;
                const online = isUserOnline(conv.studentId?._id);
                return (
                  <button
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full flex items-start gap-3 rounded-xl p-3 text-left border transition-all ${
                      active 
                        ? 'bg-white shadow-sm border-slate-200' 
                        : 'border-transparent hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={getAvatarUrl(conv.studentId)}
                        alt={conv.studentId?.name}
                        className="h-10 w-10 rounded-full border object-cover bg-slate-100"
                      />
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                        online ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800 truncate">{conv.studentId?.name}</p>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] text-slate-400">Reg: {conv.studentId?.registerNumber}</span>
                        {conv.status === 'RESOLVED' && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Resolved</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE */}
        <div className={`flex-1 flex flex-col h-full bg-white relative ${
          !activeConversation ? 'hidden lg:flex justify-center items-center bg-slate-50/15' : 'flex'
        }`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white z-10">
                <div className="flex items-center gap-3 text-left">
                  <button
                    onClick={() => dispatch(clearActiveConversation())}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="relative">
                    <img
                      src={getAvatarUrl(activeConversation.studentId)}
                      alt={activeConversation.studentId?.name}
                      className="h-10 w-10 rounded-full object-cover border bg-slate-100"
                    />
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                      isUserOnline(activeConversation.studentId?._id) ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-none">{activeConversation.studentId?.name}</h4>
                    <span className="text-[10px] text-slate-400 mt-1 inline-block">
                      Registration: {activeConversation.studentId?.registerNumber || 'Student ID'}
                    </span>
                  </div>
                </div>

                {activeConversation.status === 'IN_PROGRESS' && (
                  <button
                    onClick={handleResolveConversation}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle size={14} />
                    <span>Resolve Room</span>
                  </button>
                )}
              </div>

              {/* Message history */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 space-y-4">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  </div>
                ) : (
                  messages.map((msg) => {
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
                            ? 'bg-primary-600 border-primary-700 text-white rounded-br-none' 
                            : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                        } text-left`}>
                          
                          {msg.message && <p className="text-xs leading-relaxed break-words">{msg.message}</p>}

                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 space-y-1.5 border-t border-white/20 pt-2">
                              {msg.attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 bg-black/5 p-2 text-xs">
                                  <span className="truncate max-w-[150px]">{file.filename}</span>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary-200 hover:text-white shrink-0">
                                    <Download size={14} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-80 leading-none">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isSelf && (
                              msg.isRead ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} className="text-white/60" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {typingUser && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-slate-100 border px-4 py-2 text-[10px] text-slate-500 font-medium">
                      {typingUser} is typing...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {errorMsg && (
                <div className="px-6 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white shrink-0">
                {files.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    {files.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded bg-white border px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => setFiles([])} className="text-slate-400 hover:text-rose-500">×</button>
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
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    multiple
                    className="hidden"
                  />
                  <input
                    type="text"
                    placeholder="Type feedback here..."
                    value={replyMessage}
                    onChange={handleInputChange}
                    className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={uploading || (!replyMessage.trim() && files.length === 0)}
                    className="rounded-lg bg-primary-600 text-white p-2.5 hover:bg-primary-500 disabled:opacity-50 shrink-0 shadow-sm"
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
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-primary-100 rounded-full blur-xl opacity-40 scale-125"></div>
                <img 
                  src="/assets/rec-mascot.png" 
                  alt="REC Mascot" 
                  className="relative h-28 w-28 object-contain hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Professor Academic Console</h3>
              <p className="text-xs text-slate-450 mt-1.5 max-w-xs leading-relaxed">
                Select a student conversation room from the left sidebar to respond to academic questions.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FacultyDashboard;

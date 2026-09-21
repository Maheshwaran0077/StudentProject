import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { useSocket } from '../../hooks/useSocket';
import { 
  fetchAcademicConversations, 
  fetchConversationMessages, 
  setActiveConversation, 
  clearActiveConversation 
} from '../../store/slices/chatSlice';
import { 
  Search, MessageSquare, Paperclip, Send, User, BookOpen, Clock, 
  Layers, ArrowLeft, Eye, Download, Info, Check, CheckCheck
} from 'lucide-react';

const FacultyChat = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  
  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { conversations, activeConversation, messages, onlineUsers, loadingConversations, loadingMessages, messagesPage, hasMoreMessages } = useSelector((state) => state.chat);

  // Local state
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Fetch departments and faculty list on load
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [deptRes, facRes] = await Promise.all([
          api.get('/departments'),
          api.get('/faculty')
        ]);
        setDepartments(deptRes.data.data.departments);
        setFacultyList(facRes.data.data.faculty);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchInitData();
    dispatch(fetchAcademicConversations());

    return () => {
      dispatch(clearActiveConversation());
    };
  }, [dispatch]);

  // 2. Poll/query faculty when search filters change
  useEffect(() => {
    const filterFaculty = async () => {
      try {
        const params = {};
        if (selectedDeptId) params.departmentId = selectedDeptId;
        if (searchQuery) params.search = searchQuery;
        const res = await api.get('/faculty', { params });
        setFacultyList(res.data.data.faculty);
      } catch (err) {
        console.error('Failed to filter faculty:', err);
      }
    };
    filterFaculty();
  }, [selectedDeptId, searchQuery]);

  // 3. Socket joining/leaving rooms & typing indicators
  useEffect(() => {
    if (!socket || !activeConversation) return;

    socket.emit('join_conversation', { conversationId: activeConversation._id });
    
    // Mark conversation messages read
    api.patch(`/conversations/${activeConversation._id}/status`, { status: 'IN_PROGRESS' }); // ensures status is active
    api.get(`/conversations/${activeConversation._id}/messages`).then(() => {
      // Mark read in database
      api.patch(`/messages/${activeConversation._id}/read`); // Custom call in message controller
    });

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

  // 4. Scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // 5. Initial message load on conversation selection
  const handleSelectFaculty = async (fac) => {
    try {
      setErrorMsg('');
      const res = await api.post('/conversations/academic', { facultyId: fac.userId._id });
      const conv = res.data.data.conversation;
      dispatch(setActiveConversation(conv));
      dispatch(fetchConversationMessages({ conversationId: conv._id, page: 1 }));
      dispatch(fetchAcademicConversations()); // refresh list
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to open conversation');
    }
  };

  const handleSelectConversation = (conv) => {
    dispatch(setActiveConversation(conv));
    dispatch(fetchConversationMessages({ conversationId: conv._id, page: 1 }));
  };

  // 6. Pagination (Load Older Messages)
  const handleLoadOlderMessages = () => {
    if (hasMoreMessages && activeConversation) {
      dispatch(fetchConversationMessages({ 
        conversationId: activeConversation._id, 
        page: messagesPage + 1 
      }));
    }
  };

  // 7. Handle sending text and files
  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setErrorMsg('');

      const formData = new FormData();
      if (inputMessage.trim()) {
        formData.append('message', inputMessage);
      }
      formData.append('messageType', selectedFiles.length > 0 ? 'FILE' : 'TEXT');

      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      // Stop typing
      if (socket) {
        socket.emit('typing_stop', { conversationId: activeConversation._id });
        setIsTyping(false);
      }

      await api.post(`/conversations/${activeConversation._id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInputMessage('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      dispatch(fetchAcademicConversations()); // update last message
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  // Typing emitter
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Size check (10MB limit)
    const tooLarge = files.some(f => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setErrorMsg('One or more files exceed the 10MB limit.');
      return;
    }
    
    setSelectedFiles(files);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId?.toString());
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden relative">
      {/* 1. LEFT COLUMN: CHAT SIDEBAR */}
      <div className={`w-full lg:w-80 shrink-0 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 ${
        activeConversation ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <h3 className="text-sm font-bold text-slate-800 text-left">Academic Directory</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
            />
          </div>

          <div className="relative">
            <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory / Conversations Selector */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {searchQuery || selectedDeptId ? (
            // Render Directory Search results
            facultyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No faculty match filters.</div>
            ) : (
              facultyList.map((fac) => (
                <button
                  key={fac._id}
                  onClick={() => handleSelectFaculty(fac)}
                  className="w-full flex items-start gap-3 rounded-xl p-3 text-left hover:bg-white hover:shadow-sm border border-transparent transition-all"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl(fac.userId)}
                      alt={fac.userId.name}
                      className="h-10 w-10 rounded-full border object-cover bg-slate-100"
                    />
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                      isUserOnline(fac.userId._id) ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{fac.userId.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fac.designation} • {fac.departmentId?.code}</p>
                    <span className="inline-block text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded mt-1 truncate">
                      {fac.subjects?.[0] || 'Academic Inquiry'}
                    </span>
                  </div>
                </button>
              ))
            )
          ) : (
            // Render active conversations list
            conversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic px-4">
                No active conversations. Search above to start a chat with a professor.
              </div>
            ) : (
              conversations.map((conv) => {
                const active = activeConversation?._id === conv._id;
                const online = isUserOnline(conv.facultyId?._id);
                return (
                  <button
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all border ${
                      active 
                        ? 'bg-white shadow-sm border-slate-200' 
                        : 'border-transparent hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={getAvatarUrl(conv.facultyId)}
                        alt={conv.facultyId?.name}
                        className="h-10 w-10 rounded-full border object-cover bg-slate-100"
                      />
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                        online ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800 truncate">{conv.facultyId?.name}</p>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-normal">{conv.lastMessage}</p>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: CHAT WINDOW */}
      <div className={`flex-1 flex flex-col h-full bg-white relative ${
        !activeConversation ? 'hidden lg:flex justify-center items-center p-8 bg-slate-50/20' : 'flex'
      }`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
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
                    src={getAvatarUrl(activeConversation.facultyId)}
                    alt={activeConversation.facultyId?.name}
                    className="h-10 w-10 rounded-full object-cover border bg-slate-100"
                  />
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                    isUserOnline(activeConversation.facultyId?._id) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}></span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-none">{activeConversation.facultyId?.name}</h4>
                  <span className="text-[10px] text-slate-400 mt-1 inline-block">
                    {activeConversation.facultyId?.employeeId || 'Faculty Profile'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 space-y-4">
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <button 
                    onClick={handleLoadOlderMessages}
                    className="rounded bg-white border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Load older messages
                  </button>
                </div>
              )}

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
                        <span className="rounded-full bg-slate-100 border border-slate-200/50 px-3.5 py-1 text-[10px] font-medium text-slate-500 tracking-wide font-mono">
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
                        {/* Message body */}
                        {msg.message && <p className="text-xs leading-relaxed break-words">{msg.message}</p>}

                        {/* Attachments list */}
                        {msg.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-t border-white/20 pt-2">
                            {msg.attachments.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-black/5 p-2 text-xs">
                                <span className="font-medium truncate max-w-[150px]">{file.filename}</span>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-200 hover:text-white shrink-0"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Meta and Status checks */}
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

              {/* Typing box */}
              {typingUser && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-slate-100 border px-4 py-2 text-[10px] text-slate-500 font-medium tracking-wide">
                    {typingUser} is typing...
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Error logs */}
            {errorMsg && (
              <div className="px-6 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-600 flex items-center gap-2">
                <Info size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Chat Footer */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 shrink-0 bg-white">
              {selectedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {selectedFiles.map((file, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-white border px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedFiles([])} 
                        className="text-slate-400 hover:text-rose-500"
                      >
                        ×
                      </button>
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
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <input
                  type="text"
                  placeholder="Type message here..."
                  value={inputMessage}
                  onChange={handleInputChange}
                  className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={uploading || (!inputMessage.trim() && selectedFiles.length === 0)}
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
          <div className="flex flex-col items-center justify-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <MessageSquare size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Academic Conversation Workspace</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              Search the directory or select an active conversation from the sidebar to chat with faculty members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyChat;

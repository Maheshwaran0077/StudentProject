import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../store/slices/notificationSlice';
import { Bell, Check, MessageSquare, AlertTriangle, Info, Calendar } from 'lucide-react';

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, loading } = useSelector((state) => state.notifications);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleNotificationClick = (noti) => {
    dispatch(markNotificationRead(noti._id));
    if (noti.conversationId) {
      if (user.role === 'STUDENT') {
        navigate(noti.caseId ? `/student/student-care` : `/student/faculty-chat`);
      } else if (user.role === 'FACULTY') {
        navigate('/faculty/dashboard');
      } else if (user.role === 'STUDENT_CARE_OFFICER') {
        navigate('/officer/dashboard');
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'CHAT_MESSAGE':
        return <MessageSquare size={18} className="text-primary-500" />;
      case 'CASE_ASSIGNMENT':
      case 'CASE_UPDATE':
        return <AlertTriangle size={18} className="text-rose-500" />;
      default:
        return <Info size={18} className="text-slate-500" />;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
          <p className="text-xs text-slate-500">Track and respond to real-time updates</p>
        </div>
        {notifications.filter(n => !n.isRead).length > 0 && (
          <button
            onClick={() => dispatch(markAllNotificationsRead())}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <Bell size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-500">No Notifications</p>
            <p className="text-xs text-slate-400 mt-1">We'll alert you when there's institutional update</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((noti) => (
              <div
                key={noti._id}
                onClick={() => handleNotificationClick(noti)}
                className={`flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50/80 transition-colors text-left ${
                  !noti.isRead ? 'bg-blue-50/20' : ''
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  {getNotificationIcon(noti.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className={`text-sm ${!noti.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {noti.title}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 mt-0.5">
                      <Calendar size={12} />
                      {new Date(noti.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{noti.message}</p>
                </div>
                {!noti.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(markNotificationRead(noti._id));
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 shrink-0"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

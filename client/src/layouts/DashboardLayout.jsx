import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { logoutUser } from '../store/slices/authSlice';
import { getAvatarUrl } from '../utils/avatar';
import { fetchNotifications, markAllNotificationsRead } from '../store/slices/notificationSlice';
import { 
  Menu, X, Home, MessageSquare, HeartHandshake, Bell, User, LogOut, 
  Users, BookOpen, ShieldAlert, Layers, ChevronRight
} from 'lucide-react';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { notifications, unreadCount } = useSelector((state) => state.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const getNavigationLinks = () => {
    switch (user?.role) {
      case 'STUDENT':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: Home },
          { name: 'Faculty Chat', path: '/student/faculty-chat', icon: MessageSquare, badge: 'Academic' },
          { name: 'Student Care', path: '/student/student-care', icon: HeartHandshake, badge: 'Care', isCare: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, count: unreadCount },
          { name: 'My Profile', path: '/profile', icon: User }
        ];
      case 'FACULTY':
        return [
          { name: 'Faculty Dashboard', path: '/faculty/dashboard', icon: Home },
          { name: 'Notifications', path: '/notifications', icon: Bell, count: unreadCount },
          { name: 'Profile', path: '/profile', icon: User }
        ];
      case 'STUDENT_CARE_OFFICER':
        return [
          { name: 'Officer Dashboard', path: '/officer/dashboard', icon: Home },
          { name: 'Notifications', path: '/notifications', icon: Bell, count: unreadCount },
          { name: 'Profile', path: '/profile', icon: User }
        ];
      case 'ADMIN':
        return [
          { name: 'Admin Dashboard', path: '/admin/dashboard', icon: Home },
          { name: 'Manage Users', path: '/admin/users', icon: Users },
          { name: 'Manage Departments', path: '/admin/departments', icon: Layers },
          { name: 'System Audit Logs', path: '/admin/audit', icon: ShieldAlert },
          { name: 'Profile', path: '/profile', icon: User }
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavigationLinks();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LOGO AREA */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-800 tracking-tight text-base font-sans">
              REC Grievance
            </span>
          </div>
          <button 
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive 
                    ? link.isCare 
                      ? 'bg-rose-50 text-rose-700' 
                      : 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={18} 
                    className={isActive 
                      ? link.isCare ? 'text-rose-600' : 'text-primary-600' 
                      : 'text-slate-400 group-hover:text-slate-500'
                    } 
                  />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                    link.isCare ? 'bg-rose-100 text-rose-700' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {link.badge}
                  </span>
                )}
                {link.count > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {link.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* MASCOT DECORATION */}
        <div className="mx-4 my-3 p-3 bg-primary-50 rounded-xl border border-primary-100/30 flex items-center gap-2.5">
          <img 
            src="/assets/rec-mascot.png" 
            alt="REC Mascot" 
            className="h-10 w-10 object-contain shrink-0"
          />
          <div>
            <p className="text-[10px] font-bold text-primary-800 uppercase tracking-wider leading-none">REC Mascot</p>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-none">Support Guard</p>
          </div>
        </div>

        {/* LOGOUT AREA */}
        <div className="border-t border-slate-200 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER PANEL */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          {/* HAMBURGER TRIGGER */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="hidden text-lg font-semibold text-slate-800 sm:block">
              {navLinks.find((l) => location.pathname.startsWith(l.path))?.name || 'Portal'}
            </h1>
          </div>

          {/* USER ACTIONS */}
          <div className="flex items-center gap-4">
            {/* NOTIFICATION BADGE TRIGGER */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}
              {notificationOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotificationOpen(false)} />
                  <div className="absolute right-0 mt-2 z-20 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            dispatch(markAllNotificationsRead());
                            setNotificationOpen(false);
                          }}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-400">
                          No notifications
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((noti) => (
                          <div 
                            key={noti._id} 
                            onClick={() => {
                              setNotificationOpen(false);
                              if (noti.conversationId) {
                                if (user.role === 'STUDENT') {
                                  navigate(noti.caseId ? `/student/student-care` : `/student/faculty-chat`);
                                } else if (user.role === 'FACULTY') {
                                  navigate('/faculty/dashboard');
                                } else if (user.role === 'STUDENT_CARE_OFFICER') {
                                  navigate('/officer/dashboard');
                                }
                              }
                            }}
                            className={`cursor-pointer px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                              !noti.isRead ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            <p className="text-xs font-semibold text-slate-800">{noti.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{noti.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setNotificationOpen(false)}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* DIVIDER */}
            <div className="h-6 w-px bg-slate-200"></div>

            {/* PROFILE META */}
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-90">
              <img
                src={getAvatarUrl(user)}
                alt={user?.name}
                className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm bg-slate-100"
              />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.name}</p>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  user?.role === 'ADMIN' 
                    ? 'bg-slate-100 text-slate-800' 
                    : user?.role === 'FACULTY' 
                      ? 'bg-blue-100 text-blue-800' 
                      : user?.role === 'STUDENT_CARE_OFFICER' 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* VIEW AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

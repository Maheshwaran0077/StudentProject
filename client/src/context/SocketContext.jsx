import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  addIncomingMessage,
  updateConversationStatusState,
  setOnlineUsersList,
  addUserOnline,
  removeUserOffline
} from '../store/slices/chatSlice';
import { addIncomingNotification } from '../store/slices/notificationSlice';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.DEV
      ? 'http://localhost:5000'
      : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    const token = localStorage.getItem('token');
    
    // Connect to Socket.IO server
    const newSocket = io(socketUrl, {
      withCredentials: true,
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // Register Global Socket Listeners
    newSocket.on('connect', () => {
      console.log('Socket.IO Connected:', newSocket.id);
    });

    newSocket.on('online_users_list', (users) => {
      dispatch(setOnlineUsersList(users));
    });

    newSocket.on('user_online', ({ userId }) => {
      dispatch(addUserOnline({ userId }));
    });

    newSocket.on('user_offline', ({ userId }) => {
      dispatch(removeUserOffline({ userId }));
    });

    newSocket.on('receive_message', (message) => {
      dispatch(addIncomingMessage(message));
    });

    newSocket.on('conversation_status_changed', (data) => {
      dispatch(updateConversationStatusState(data));
    });

    newSocket.on('new_notification', (notification) => {
      dispatch(addIncomingNotification(notification));
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message
        });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

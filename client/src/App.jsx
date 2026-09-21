import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import { fetchCurrentUser } from './store/slices/authSlice';
import { SocketProvider } from './context/SocketContext';
import AppRoutes from './routes/AppRoutes';

// Inner component to access dispatch
const AppContent = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Attempt session restoration from HttpOnly cookie
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 font-sans">Connecting to portal...</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
};

function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppContent />
        </BrowserRouter>
      </SocketProvider>
    </Provider>
  );
}

export default App;

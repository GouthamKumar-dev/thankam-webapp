import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useRef } from 'react';
import { router } from './routes/router';
import { store } from './store';
import { useAppDispatch } from './hooks/store';
import { initializeAuthThunk } from './store/slices/auth.slice';
import './index.css';

function AppBootstrap() {
  const dispatch = useAppDispatch();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void dispatch(initializeAuthThunk());
  }, [dispatch]);

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppBootstrap />
      <Toaster richColors position="top-right" />
    </Provider>
  </React.StrictMode>,
);

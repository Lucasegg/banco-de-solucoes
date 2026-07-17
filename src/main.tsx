import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { PersistenceProvider } from './integrations/supabase/PersistenceProvider';
import { NotificationsProvider } from './context/NotificationsContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistenceProvider>
      <AuthProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </AuthProvider>
    </PersistenceProvider>
  </React.StrictMode>,
);

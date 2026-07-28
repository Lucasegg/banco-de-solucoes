import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { PersistenceProvider } from './integrations/supabase/PersistenceProvider';
import { NotificationsProvider } from './context/NotificationsContext';
import './styles.css';
import { I18nProvider } from './i18n/I18nProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider><PersistenceProvider>
      <AuthProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </AuthProvider>
    </PersistenceProvider></I18nProvider>
  </React.StrictMode>,
);

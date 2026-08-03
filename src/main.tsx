import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { PersistenceProvider } from './integrations/supabase/PersistenceProvider';
import { NotificationsProvider } from './context/NotificationsContext';
import './styles.css';
import { I18nProvider } from './i18n/I18nProvider';
import { LegalConsentProvider } from './context/LegalConsentContext';

const useE2EFixtures = import.meta.env.VITE_E2E_FIXTURES === 'true';

const productionApp = <PersistenceProvider><AuthProvider><LegalConsentProvider><NotificationsProvider><App /></NotificationsProvider></LegalConsentProvider></AuthProvider></PersistenceProvider>;

async function render() {
  const application = useE2EFixtures
    ? await import('../e2e/E2EHarness').then(({ E2EHarness }) => <E2EHarness><App /></E2EHarness>)
    : productionApp;
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><I18nProvider>{application}</I18nProvider></React.StrictMode>);
}

void render();

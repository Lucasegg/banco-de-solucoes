import { LegalPage, type LegalSection } from './LegalPage';
const sections: LegalSection[] = [
  { title: 'privacy.data.title', body: 'privacy.data.body' }, { title: 'privacy.purposes.title', body: 'privacy.purposes.body' },
  { title: 'privacy.auth.title', body: 'privacy.auth.body' }, { title: 'privacy.content.title', body: 'privacy.content.body' },
  { title: 'privacy.contact.title', body: 'privacy.contact.body', contact: true }, { title: 'privacy.providers.title', body: 'privacy.providers.body' },
  { title: 'privacy.storage.title', body: 'privacy.storage.body' }, { title: 'privacy.retention.title', body: 'privacy.retention.body' },
  { title: 'privacy.sharing.title', body: 'privacy.sharing.body' }, { title: 'privacy.rights.title', body: 'privacy.rights.body' },
  { title: 'privacy.requests.title', body: 'privacy.requests.body', contact: true },
];
export function Privacy({ onNavigate }: { onNavigate: (page: string) => void }) { return <LegalPage title="privacy.title" intro="privacy.intro" sections={sections} onNavigate={onNavigate} />; }

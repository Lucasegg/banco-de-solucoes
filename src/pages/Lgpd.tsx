import { LegalPage, type LegalSection } from './LegalPage';
const sections: LegalSection[] = [
  { title: 'lgpd.rights.title', body: 'lgpd.rights.body' }, { title: 'lgpd.request.title', body: 'lgpd.request.body', contact: true },
  { title: 'lgpd.analysis.title', body: 'lgpd.analysis.body' }, { title: 'lgpd.anpd.title', body: 'lgpd.anpd.body' },
];
export function Lgpd({ onNavigate }: { onNavigate: (page: string) => void }) { return <LegalPage title="lgpd.title" intro="lgpd.intro" sections={sections} onNavigate={onNavigate} />; }

import { LegalPage, type LegalSection } from './LegalPage';
const sections: LegalSection[] = [
  { title: 'terms.purpose.title', body: 'terms.purpose.body' }, { title: 'terms.responsibilities.title', body: 'terms.responsibilities.body' },
  { title: 'terms.publishing.title', body: 'terms.publishing.body' }, { title: 'terms.prohibited.title', body: 'terms.prohibited.body' },
  { title: 'terms.ip.title', body: 'terms.ip.body' }, { title: 'terms.moderation.title', body: 'terms.moderation.body', contact: true },
  { title: 'terms.availability.title', body: 'terms.availability.body' }, { title: 'terms.liability.title', body: 'terms.liability.body' },
  { title: 'terms.changes.title', body: 'terms.changes.body' }, { title: 'terms.contact.title', body: 'terms.contact.body', contact: true },
];
export function Terms() { return <LegalPage title="terms.title" intro="terms.intro" sections={sections} />; }

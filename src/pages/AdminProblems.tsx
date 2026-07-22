import { AdminContentPage } from './AdminContentPage';
export function AdminProblems({ onBack }: { onBack: () => void }) { return <AdminContentPage kind="problem" onBack={onBack} />; }

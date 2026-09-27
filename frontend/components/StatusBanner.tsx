import { AlertTriangle, CheckCircle2 } from 'lucide-react';
export function StatusBanner({ state, title, message }: { state: string; title: string; message: string }) {
  const isNormal = state === 'normal' || state === 'low';
  return <div className={`status-banner status-banner-${state}`}>{isNormal ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}<div><strong>{title}</strong><p>{message}</p></div></div>;
}

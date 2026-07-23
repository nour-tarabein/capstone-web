import { useSyncExternalStore } from 'react';
import { mdiCheckCircle } from '@mdi/js';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * Fire-and-forget feedback for actions whose result isn't visible where the
 * tap happened — "added to your schedule" while the schedule tab is elsewhere.
 * Deliberately tiny: a queue of at most two, each auto-dismissing.
 */
type Toast = { id: number; text: string; leaving: boolean };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  toasts = [...toasts];
  listeners.forEach((l) => l());
}

export function toast(text: string) {
  const id = nextId++;
  toasts.push({ id, text, leaving: false });
  if (toasts.length > 2) toasts.shift();
  emit();
  window.setTimeout(() => {
    const t = toasts.find((t) => t.id === id);
    if (!t) return;
    t.leaving = true;
    emit();
    window.setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    }, 200);
  }, 2100);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts);
  if (list.length === 0) return null;
  return (
    <div className="toaster" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={t.leaving ? 'toast toast-leaving' : 'toast'}>
          <Icon path={mdiCheckCircle} size={16} color={colors.green} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

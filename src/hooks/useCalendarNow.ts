import { useEffect, useState } from 'react';
/** Refresh relative dates while a view remains open across a Paris calendar midnight. */
export function useCalendarNow() {
  const [now,setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date()), timer = window.setInterval(tick,30000);
    window.addEventListener('focus',tick); document.addEventListener('visibilitychange',tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus',tick); document.removeEventListener('visibilitychange',tick); };
  },[]);
  return now;
}

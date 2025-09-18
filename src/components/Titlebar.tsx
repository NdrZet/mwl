import React from 'react';
import { Button } from './ui/button';

export const Titlebar: React.FC = () => {
  const [maximized, setMaximized] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      try {
        const isMax = await (window as any).electronAPI?.isWindowMaximized?.();
        if (typeof isMax === 'boolean') setMaximized(isMax);
      } catch {}
    };
    init();

    const offMax = (window as any).electronAPI?.onWindowMaximized?.(() => setMaximized(true));
    const offUnmax = (window as any).electronAPI?.onWindowUnmaximized?.(() => setMaximized(false));
    return () => {
      try { offMax && offMax(); offUnmax && offUnmax(); } catch {}
    };
  }, []);

  return (
    <div className="h-9 w-full flex items-center justify-between px-2 select-none bg-sidebar" style={{ WebkitAppRegion: 'drag' as any }}>
      <div className="flex-1" />
      <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' as any }}>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => (window as any).electronAPI?.minimizeWindow?.()} aria-label="Minimize">—</Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => (window as any).electronAPI?.toggleMaximizeWindow?.()} aria-label="Maximize">{maximized ? '▭' : '□'}</Button>
        <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => (window as any).electronAPI?.closeWindow?.()} aria-label="Close">×</Button>
      </div>
    </div>
  );
};

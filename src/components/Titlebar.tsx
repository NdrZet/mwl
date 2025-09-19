import React from 'react';

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
    <div className="h-9 w-full flex items-center justify-between px-2 select-none bg-sidebar app-fade-in" style={{ WebkitAppRegion: 'drag' as any }}>
      <div className="flex-1" />
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' as any }}>
        <button
          aria-label="Minimize window"
          onClick={() => (window as any).electronAPI?.minimizeWindow?.()}
          className="h-3.5 w-3.5 rounded-full bg-[#28c840] hover:ring-2 hover:ring-[#28c840]/40 transition-shadow"
          title="Minimize"
        />
        <button
          aria-label="Toggle maximize"
          onClick={() => (window as any).electronAPI?.toggleMaximizeWindow?.()}
          className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:ring-2 hover:ring-[#ffbd2e]/40 transition-shadow"
          title={maximized ? 'Restore' : 'Maximize'}
        />
        <button
          aria-label="Close window"
          onClick={() => (window as any).electronAPI?.closeWindow?.()}
          className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] hover:ring-2 hover:ring-[#ff5f57]/40 transition-shadow"
          title="Close"
        />
      </div>
    </div>
  );
};

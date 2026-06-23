import React, { useEffect, useState } from 'react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>({});
  
  useEffect(() => {
    if (window.electronAPI?.settingsGet) {
      window.electronAPI.settingsGet().then(setSettings);
    }
  }, []);

  const saveSettings = (newSettings: any) => {
    setSettings(newSettings);
    if (window.electronAPI?.settingsSet) {
      window.electronAPI.settingsSet(newSettings);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="vl-view-title text-4xl mb-2">Settings</h1>
        <p className="vl-view-subtitle">Manage your app preferences</p>
      </div>

      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Appearance</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white text-lg">Dark Mode</div>
            <div className="text-sm text-white/50">Enable dark theme across the application</div>
          </div>
          <button 
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.darkMode !== false ? 'bg-primary' : 'bg-white/20'}`}
            onClick={() => saveSettings({ ...settings, darkMode: settings.darkMode === false ? true : false })}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.darkMode !== false ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>
      
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Playback</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white text-lg">Gapless Playback</div>
            <div className="text-sm text-white/50">Eliminate pause between tracks</div>
          </div>
          <button 
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.gapless ? 'bg-primary' : 'bg-white/20'}`}
            onClick={() => saveSettings({ ...settings, gapless: !settings.gapless })}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.gapless ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

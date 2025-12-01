import React, { useState } from 'react';
import { AppTab } from './types';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.IMAGE);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white">
      {/* Header / Nav */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur shrink-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg">G</div>
            <h1 className="font-bold text-lg tracking-tight">Gemini Creative</h1>
        </div>
        
        <nav className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
            <button 
                onClick={() => setActiveTab(AppTab.IMAGE)}
                className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === AppTab.IMAGE ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Image
            </button>
            <button 
                onClick={() => setActiveTab(AppTab.VIDEO)}
                className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === AppTab.VIDEO ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Video
            </button>
        </nav>

        <div className="w-24 flex justify-end">
            <span className="text-xs text-gray-600 font-mono">v3.0-nano</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === AppTab.IMAGE ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ImageGenerator />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === AppTab.VIDEO ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <VideoGenerator />
        </div>
      </main>
    </div>
  );
};

export default App;

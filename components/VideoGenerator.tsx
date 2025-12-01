import React, { useState, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64, getMimeType } from '../utils/helpers';

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [inputImage, setInputImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      const mimeType = getMimeType(file);
      setInputImage({ base64, mimeType });
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setVideoUrl(null);
    setProgressMsg('Initializing Veo...');
    
    // Simulate progress messages since Veo takes a while
    const msgs = ['Analyzing prompt...', 'Dreaming up frames...', 'Compiling video...'];
    let msgIdx = 0;
    const interval = setInterval(() => {
        if(msgIdx < msgs.length) setProgressMsg(msgs[msgIdx++]);
    }, 10000);

    try {
      const url = await generateVideo({
        prompt: prompt || 'Animate this image', // Fallback prompt if just image is provided
        inputImage: inputImage || undefined,
        aspectRatio
      });
      setVideoUrl(url);
    } catch (error) {
      console.error(error);
      alert('Video generation failed. Please check console.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-950 text-gray-200">
      
      {/* Sidebar */}
      <div className="w-full lg:w-96 bg-gray-900 border-r border-gray-800 flex flex-col p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Video Controls (Veo)</h2>
        <p className="text-xs text-gray-500 mb-6">Powered by Veo 3.1. Requires paid Key selection.</p>

        {/* Prompt */}
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">PROMPT</label>
            <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none text-white placeholder-gray-500"
                rows={4}
                placeholder="Describe the motion or video content..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
        </div>

        {/* Input Image */}
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">REFERENCE IMAGE (Optional)</label>
            {!inputImage ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-gray-800 transition"
                >
                    <span className="text-gray-500 text-sm">Upload Image</span>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                    <img src={`data:${inputImage.mimeType};base64,${inputImage.base64}`} alt="input" className="w-full h-auto" />
                    <button 
                        onClick={() => setInputImage(null)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white p-1 rounded-full text-xs"
                    >
                        ✕
                    </button>
                </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {/* Aspect Ratio */}
        <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">ASPECT RATIO</label>
            <div className="flex bg-gray-800 p-1 rounded-lg">
                <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-2 text-sm rounded-md transition-all ${aspectRatio === '16:9' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    16:9
                </button>
                <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-2 text-sm rounded-md transition-all ${aspectRatio === '9:16' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    9:16
                </button>
            </div>
        </div>

        {/* Generate Button */}
        <button 
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-lg shadow-green-900/20'}`}
        >
            {loading ? 'Processing...' : 'Generate Video'}
        </button>
      </div>

      {/* Result Area */}
      <div className="flex-1 bg-black p-8 flex items-center justify-center relative">
          {loading && (
             <div className="text-center z-10">
                 <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                 <h3 className="text-xl font-medium text-white mb-2">Generating Video</h3>
                 <p className="text-green-400 text-sm animate-pulse">{progressMsg}</p>
                 <p className="text-gray-600 text-xs mt-4">This usually takes 1-2 minutes</p>
             </div>
          )}

          {!loading && !videoUrl && (
              <div className="text-center opacity-30">
                  <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <p className="text-xl">Create motion from imagination.</p>
              </div>
          )}

          {videoUrl && (
              <div className="w-full max-w-4xl bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800 animate-fade-in">
                  <video 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full aspect-video bg-black"
                    src={videoUrl}
                  />
                  <div className="p-4 flex justify-between items-center bg-gray-850">
                      <span className="text-sm text-gray-400 truncate max-w-xs">{prompt}</span>
                      <a href={videoUrl} download="gemini-veo.mp4" className="text-green-500 text-sm font-bold hover:text-green-400">Download MP4</a>
                  </div>
              </div>
          )}
      </div>

    </div>
  );
};

export default VideoGenerator;

import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio, ImageResolution, HistoryItem } from '../types';
import { generateImages } from '../services/geminiService';
import { fileToBase64, getMimeType, base64ToBlob, saveToDirectory } from '../utils/helpers';
import CanvasEditor from './CanvasEditor';

const ImageGenerator: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_1K);
  const [outputCount, setOutputCount] = useState(1);
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  
  const [refImages, setRefImages] = useState<{ base64: string; mimeType: string, id: string }[]>([]);
  const [contextImage, setContextImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false); // Mode toggle
  
  const [loading, setLoading] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<HistoryItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');
  
  const [showCanvas, setShowCanvas] = useState(false);
  const [tempContextImgSrc, setTempContextImgSrc] = useState<string>('');
  
  // File System Handle
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [dirName, setDirName] = useState<string>('');

  const refInputRef = useRef<HTMLInputElement>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        if (refImages.length >= 10) return; // Limit 10
        const file = e.target.files[0];
        const base64 = await fileToBase64(file);
        const mimeType = getMimeType(file);
        setRefImages(prev => [...prev, { base64, mimeType, id: Date.now().toString() }]);
    }
  };

  const handleContextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const base64 = await fileToBase64(file);
          const mimeType = getMimeType(file);
          setTempContextImgSrc(`data:${mimeType};base64,${base64}`);
          setContextImage({ base64, mimeType });
      }
  };

  const handleSetFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setDirHandle(handle);
      setDirName(handle.name);
    } catch (e) {
      console.error("Folder selection cancelled or not supported", e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !contextImage) return;
    setLoading(true);
    setCurrentBatch([]);
    setViewMode('current');

    try {
      const base64Images = await generateImages(outputCount, {
        prompt,
        aspectRatio,
        width: customWidth,
        height: customHeight,
        resolution,
        refImages: refImages.map(r => ({ base64: r.base64, mimeType: r.mimeType })),
        contextImage: contextImage || undefined,
        isEditing
      });

      const newItems: HistoryItem[] = [];

      for (const base64Img of base64Images) {
        // Strip prefix if present for storage/blob conversion
        const cleanBase64 = base64Img.replace(/^data:image\/\w+;base64,/, "");
        const mime = base64Img.match(/data:([^;]+);/)?.[1] || 'image/png';
        
        const item: HistoryItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            base64: cleanBase64,
            mimeType: mime,
            prompt,
            timestamp: Date.now(),
            aspectRatio: aspectRatio === AspectRatio.CUSTOM ? `${customWidth}:${customHeight}` : aspectRatio,
            width: aspectRatio === AspectRatio.CUSTOM ? customWidth : undefined,
            height: aspectRatio === AspectRatio.CUSTOM ? customHeight : undefined,
        };
        newItems.push(item);

        // Auto-save to folder if selected
        if (dirHandle) {
            const blob = base64ToBlob(cleanBase64, mime);
            const filename = `gemini_${Date.now()}_${Math.random().toString(36).substr(2,4)}.png`;
            await saveToDirectory(dirHandle, filename, blob);
        }
      }

      setCurrentBatch(newItems);
      setHistory(prev => [...newItems, ...prev]);

    } catch (error) {
      console.error(error);
      alert("Generation failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasSave = (base64: string) => {
      setContextImage({ base64, mimeType: 'image/png' });
      setShowCanvas(false);
  };

  const handleUpscale = (item: HistoryItem) => {
      // Load item into context
      setContextImage({ base64: item.base64, mimeType: item.mimeType });
      setPrompt(item.prompt);
      
      // Set to High Res
      setResolution(ImageResolution.RES_4K);
      
      // Attempt to match aspect ratio settings
      if (item.width && item.height) {
          setAspectRatio(AspectRatio.CUSTOM);
          setCustomWidth(item.width);
          setCustomHeight(item.height);
      } else {
          // Fallback to closest enum or default. 
          // If we stored enum value in item.aspectRatio, use it
          const foundAR = Object.values(AspectRatio).find(ar => ar === item.aspectRatio);
          if (foundAR) {
              setAspectRatio(foundAR as AspectRatio);
          } else {
              setAspectRatio(AspectRatio.SQUARE);
          }
      }

      // Switch to editing mode to imply refinement/upscaling
      setIsEditing(true); 
      setViewMode('current'); // Switch view back so user sees controls
  };

  const handleDelete = (id: string) => {
      setHistory(prev => prev.filter(i => i.id !== id));
      setCurrentBatch(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-950 text-gray-200">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-96 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto p-6 scrollbar-thin z-20 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Image Controls</h2>
        
        {/* Mode Switch */}
        <div className="flex bg-gray-800 p-1 rounded-lg mb-6">
            <button 
                onClick={() => setIsEditing(false)}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${!isEditing ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Generate
            </button>
            <button 
                onClick={() => setIsEditing(true)}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${isEditing ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Edit / Upscale
            </button>
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <label className="block text-xs font-uppercase text-gray-500 mb-2 font-bold tracking-wider">PROMPT</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-white placeholder-gray-500"
            rows={4}
            placeholder={isEditing ? "Describe changes or keep original for upscale..." : "Describe the image you want to generate..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Reference Images */}
        {!isEditing && (
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500 tracking-wider">REFERENCES ({refImages.length}/10)</label>
                    <button onClick={() => refInputRef.current?.click()} className="text-purple-400 text-xs hover:text-purple-300">+ Add</button>
                </div>
                <input type="file" ref={refInputRef} className="hidden" accept="image/*" onChange={handleRefUpload} />
                
                <div className="grid grid-cols-4 gap-2">
                    {refImages.map((img) => (
                        <div key={img.id} className="relative group aspect-square rounded overflow-hidden border border-gray-700">
                            <img src={`data:${img.mimeType};base64,${img.base64}`} alt="ref" className="w-full h-full object-cover" />
                            <button 
                                onClick={() => setRefImages(prev => prev.filter(p => p.id !== img.id))}
                                className="absolute top-0 right-0 bg-red-600/80 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {refImages.length < 10 && (
                         <div onClick={() => refInputRef.current?.click()} className="aspect-square rounded border border-gray-700 border-dashed flex items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-800 transition">
                            <span className="text-gray-600 text-xl">+</span>
                         </div>
                    )}
                </div>
            </div>
        )}

        {/* Context Image */}
        <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
                 <label className="block text-xs font-bold text-gray-500 tracking-wider">
                    {isEditing ? 'CONTEXT (SOURCE/UPSCALE)' : 'CONTEXT (STRUCTURE)'}
                </label>
                {contextImage && isEditing && (
                    <span className="text-[10px] text-green-400">Ready for Edit/Upscale</span>
                )}
            </div>
           
            {!contextImage ? (
                <div 
                    onClick={() => contextInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-800 transition"
                >
                    <span className="text-gray-500 text-sm">Click to upload context</span>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                    <img src={`data:${contextImage.mimeType};base64,${contextImage.base64}`} alt="context" className="w-full h-auto" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 flex gap-2">
                        <button onClick={() => setContextImage(null)} className="flex-1 text-xs bg-red-600/80 hover:bg-red-500 text-white py-1 rounded">Remove</button>
                        {isEditing && (
                             <button onClick={() => setShowCanvas(true)} className="flex-1 text-xs bg-purple-600/80 hover:bg-purple-500 text-white py-1 rounded">Brush</button>
                        )}
                    </div>
                </div>
            )}
            <input type="file" ref={contextInputRef} className="hidden" accept="image/*" onChange={handleContextUpload} />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
             {/* Aspect Ratio */}
             <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">ASPECT RATIO</label>
                <div className="flex gap-2 mb-2">
                     <select 
                        value={aspectRatio} 
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="flex-1 bg-gray-800 text-sm border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                    >
                        <option value={AspectRatio.SQUARE}>1:1 Square</option>
                        <option value={AspectRatio.STANDARD}>4:3 Standard</option>
                        <option value={AspectRatio.LANDSCAPE}>16:9 Landscape</option>
                        <option value={AspectRatio.PORTRAIT}>9:16 Portrait</option>
                        <option value={AspectRatio.CUSTOM}>Custom Dimension</option>
                    </select>
                </div>
                
                {/* Custom Dimensions Inputs */}
                {aspectRatio === AspectRatio.CUSTOM && (
                    <div className="flex gap-2 animate-fade-in">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-0.5 block">WIDTH</label>
                            <input 
                                type="number" 
                                value={customWidth}
                                onChange={(e) => setCustomWidth(Number(e.target.value))}
                                className="w-full bg-gray-800 text-sm border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none" 
                                placeholder="Width"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-0.5 block">HEIGHT</label>
                            <input 
                                type="number" 
                                value={customHeight}
                                onChange={(e) => setCustomHeight(Number(e.target.value))}
                                className="w-full bg-gray-800 text-sm border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none" 
                                placeholder="Height"
                            />
                        </div>
                    </div>
                )}
             </div>

             {/* Count */}
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">COUNT</label>
                <select 
                    value={outputCount}
                    onChange={(e) => setOutputCount(Number(e.target.value))}
                    className="w-full bg-gray-800 text-sm border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                >
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
             </div>

             {/* Resolution / Upscale */}
             <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">RESOLUTION</label>
                 <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as ImageResolution)}
                    className="w-full bg-gray-800 text-sm border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                 >
                     <option value={ImageResolution.RES_1K}>1K (Fast)</option>
                     <option value={ImageResolution.RES_2K}>2K (Upscale)</option>
                     <option value={ImageResolution.RES_4K}>4K (Upscale)</option>
                 </select>
             </div>
        </div>

        {/* Generate Button */}
        <button 
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-900/20'}`}
        >
            {loading ? 'Generating...' : isEditing ? (resolution !== ImageResolution.RES_1K ? 'Generate Upscale' : 'Generate Edit') : 'Generate Images'}
        </button>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-black relative">
          
          {/* Top Bar for Display Controls */}
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur">
             <div className="flex gap-4">
                 <button 
                    onClick={() => setViewMode('current')}
                    className={`text-sm font-medium px-2 py-1 border-b-2 transition-colors ${viewMode === 'current' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                 >
                    Current Results
                 </button>
                 <button 
                    onClick={() => setViewMode('history')}
                    className={`text-sm font-medium px-2 py-1 border-b-2 transition-colors ${viewMode === 'history' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                 >
                    Library History
                 </button>
             </div>

             <div className="flex items-center gap-3">
                 {dirName && (
                     <div className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-900">
                         Saving to: {dirName}
                     </div>
                 )}
                 <button 
                    onClick={handleSetFolder}
                    className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded border border-gray-700 transition"
                    title="Images will automatically be saved to this folder"
                 >
                    <span>📂 Set Output Folder</span>
                 </button>
             </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 p-8 overflow-y-auto scrollbar-thin">
            
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-purple-400 font-medium animate-pulse">
                        {isEditing ? "Upscaling & Editing..." : "Generating New Worlds..."}
                    </p>
                </div>
            )}

            {viewMode === 'current' && (
                <>
                    {currentBatch.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-800">
                            <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="text-xl font-medium opacity-40">Ready to create.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
                        {currentBatch.map((item) => (
                            <ImageCard 
                                key={item.id} 
                                item={item} 
                                onUpscale={() => handleUpscale(item)}
                                onDelete={() => handleDelete(item.id)}
                            />
                        ))}
                    </div>
                </>
            )}

            {viewMode === 'history' && (
                <>
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600">
                            <p>No history yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {history.map((item) => (
                                <ImageCard 
                                    key={item.id} 
                                    item={item} 
                                    onUpscale={() => handleUpscale(item)}
                                    onDelete={() => handleDelete(item.id)}
                                    compact
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

          </div>
      </div>

      {/* Canvas Modal */}
      {showCanvas && tempContextImgSrc && (
          <CanvasEditor 
            imageSrc={tempContextImgSrc} 
            onClose={() => setShowCanvas(false)} 
            onSave={handleCanvasSave} 
          />
      )}
    </div>
  );
};

// Sub-component for displaying image cards to reduce clutter
const ImageCard: React.FC<{
    item: HistoryItem, 
    onUpscale: () => void, 
    onDelete: () => void,
    compact?: boolean
}> = ({ item, onUpscale, onDelete, compact }) => {
    const src = `data:${item.mimeType};base64,${item.base64}`;
    
    return (
        <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg group relative ${compact ? 'text-xs' : ''}`}>
            <img src={src} alt="Generated" className="w-full h-auto" />
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                 <a 
                    href={src} 
                    download={`gemini-${item.id}.png`} 
                    className="bg-white text-black px-4 py-1.5 rounded-full font-bold hover:bg-gray-200 transition w-full text-center"
                 >
                    Download
                 </a>
                 <button 
                    onClick={onUpscale}
                    className="bg-purple-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-purple-500 transition w-full border border-purple-400"
                 >
                    ✨ Upscale 4K
                 </button>
                 <button 
                    onClick={onDelete}
                    className="bg-red-600/80 text-white px-4 py-1.5 rounded-full font-bold hover:bg-red-500 transition w-full mt-2"
                 >
                    Delete
                 </button>
            </div>

            {!compact && (
                <div className="p-3">
                    <p className="text-gray-400 line-clamp-2 text-sm" title={item.prompt}>{item.prompt}</p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{item.aspectRatio}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGenerator;
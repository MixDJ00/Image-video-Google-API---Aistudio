import React, { useRef, useEffect, useState } from 'react';

interface CanvasEditorProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (base64: string) => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ imageSrc, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      // Fit canvas to screen while maintaining aspect ratio
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.6;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
  }, [imageSrc]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if(canvas) {
        ctx = canvas.getContext('2d');
        ctx?.beginPath(); // reset path
    }
  };

  let ctx: CanvasRenderingContext2D | null = null;

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    // Visualizing the "mask" or "focus area" with a semi-transparent highlighter
    // Since we are sending the whole image to Gemini for editing, this is for user intent visualization
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)'; 
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSave = () => {
    if (canvasRef.current) {
        // Return the modified image (simulating in-painting source)
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onSave(base64);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-gray-850 p-4 rounded-lg border border-gray-700 flex flex-col items-center">
        <h3 className="text-white mb-4 text-lg font-semibold">Bôi Brush (Context Editor)</h3>
        
        <div className="relative border border-gray-600 rounded overflow-hidden cursor-crosshair">
            <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onMouseMove={draw}
            className="bg-gray-900"
            />
        </div>

        <div className="flex gap-4 items-center w-full mt-4 justify-between">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Size:</span>
                <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-32 accent-purple-500"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded text-gray-300 hover:text-white">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium">Use Image</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasEditor;

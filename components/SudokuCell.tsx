import React, { useRef, useState, useEffect } from 'react';
import { CellData, Point, DisplayMode, InputMode } from '../types';
import { recognizeDigit } from '../services/recognizer';
import AbacusDisplay from './AbacusDisplay';

interface SudokuCellProps {
  cell: CellData;
  isSelected: boolean;
  isActive: boolean;
  isRelated: boolean;
  mode: InputMode; // 'numpad' | 'note'
  displayMode: DisplayMode;
  onClick: () => void;
  onInput: (val: number, mode: 'value' | 'note') => void;
}

const SudokuCell: React.FC<SudokuCellProps> = ({
  cell,
  isSelected,
  isActive,
  isRelated,
  mode,
  displayMode,
  onClick,
  onInput
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokes = useRef<Point[][]>([]);
  const currentStroke = useRef<Point[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Gesture state refs
  const isInteractionRef = useRef(false);
  const startPosRef = useRef<Point>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Styling logic
  const baseClasses = "relative flex items-center justify-center text-xl sm:text-2xl md:text-3xl cursor-pointer select-none transition-all duration-200 border-r border-b border-slate-300 dark:border-slate-700 overflow-hidden";
  
  let bgClass = "bg-white dark:bg-slate-800";
  if (cell.isError) bgClass = "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  else if (isSelected) bgClass = "bg-indigo-500 text-white shadow-lg scale-105 z-10 rounded-md";
  else if (isActive) bgClass = "bg-indigo-200 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100";
  else if (isRelated) bgClass = "bg-slate-100 dark:bg-slate-700/50";
  
  const textClass = cell.isFixed 
    ? (isSelected ? "font-bold" : "font-bold text-slate-900 dark:text-slate-100") 
    : (isSelected ? "font-medium" : "font-medium text-indigo-600 dark:text-indigo-400");

  // Clear canvas when selection changes or value updates
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isSelected ? '#ffffff' : '#4f46e5'; 
    }
  }, [cell.value, isSelected]);

  // --- Pointer Event Handlers (Unified Touch/Mouse) ---

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore secondary buttons
    if (e.button !== 0) return;
    
    // Allow dragging fixed cells to select, but not write
    if (cell.isFixed) {
        onClick();
        return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    isInteractionRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // PEN OPTIMIZATION: Immediate start
    const isPen = e.pointerType === 'pen';
    hasMovedRef.current = isPen;
    
    if (isPen) {
        setIsDrawing(true);
    }

    // Prepare stroke
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        currentStroke.current = [{
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top
        }];
    }
    
    // Cancel any pending recognition
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isInteractionRef.current || !canvasRef.current) return;

    const x = e.clientX;
    const y = e.clientY;

    // Detection Threshold (Only for touch/mouse, ignored for Pen)
    if (!hasMovedRef.current) {
        const dist = Math.hypot(x - startPosRef.current.x, y - startPosRef.current.y);
        if (dist > 8) { // 8px threshold
            hasMovedRef.current = true;
            setIsDrawing(true);
        }
    }

    if (hasMovedRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const pos = { x: x - rect.left, y: y - rect.top };
        
        currentStroke.current.push(pos);
        
        // Render immediately
        const ctx = canvasRef.current.getContext('2d');
        if (ctx && currentStroke.current.length > 1) {
            ctx.beginPath();
            const prev = currentStroke.current[currentStroke.current.length - 2];
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isInteractionRef.current) return;
    
    isInteractionRef.current = false;
    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    if (!hasMovedRef.current) {
        // Tap detected (Finger/Mouse only)
        onClick();
        // Clear potential single dot
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, 80, 80);
    } else {
        // Gesture finished
        if (currentStroke.current.length > 2) { 
             strokes.current.push([...currentStroke.current]);
             
             // Auto-recognize after delay
             timeoutRef.current = setTimeout(processHandwriting, 600);
        } else {
            setIsDrawing(false);
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.clearRect(0, 0, 80, 80);
        }
    }
  };

  const processHandwriting = () => {
    if (strokes.current.length === 0) return;

    // --- Smart Note Detection ---
    // Analyze if the drawing is "Small" (Note) or "Big" (Value)
    // Only applies if global mode is 'numpad'. If 'note', always note.
    let targetMode: 'value' | 'note' = mode === 'note' ? 'note' : 'value';

    if (mode === 'numpad') {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        strokes.current.flat().forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const canvasSize = 80; // Match width/height in render
        
        // Threshold: If drawing is smaller than 55% of cell area, treat as note
        // This allows writing small numbers in corners/sides to act as notes
        if (width < canvasSize * 0.55 && height < canvasSize * 0.55) {
            targetMode = 'note';
        }
    }

    const digit = recognizeDigit(strokes.current);
    
    if (digit !== null) {
       onInput(digit, targetMode);
    }

    // Reset
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, 80, 80);
    }
    strokes.current = [];
    setIsDrawing(false);
  };

  return (
    <div 
      className={`${baseClasses} ${bgClass}`}
      style={{ 
          aspectRatio: '1/1',
          touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Main Value */}
      {cell.value && (
        displayMode === 'abacus' ? (
          <div className="w-full h-full p-1 sm:p-2 animate-in fade-in zoom-in-90 duration-300 pointer-events-none">
            <AbacusDisplay value={cell.value} />
          </div>
        ) : (
          <span className={`${textClass} text-3xl animate-in fade-in zoom-in-90 duration-200 pointer-events-none`}>{cell.value}</span>
        )
      )}

      {/* Pencil Marks / Notes - Always visible if value is empty */}
      {!cell.value && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5 w-full h-full pointer-events-none opacity-80">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <div key={n} className="flex items-center justify-center text-[9px] sm:text-[11px] font-medium leading-none text-slate-500 dark:text-slate-400">
              {cell.notes.includes(n) ? n : ''}
            </div>
          ))}
        </div>
      )}

      {/* Handwriting Layer */}
      {!cell.isFixed && (
        <canvas 
            ref={canvasRef}
            width={80} 
            height={80}
            className="absolute inset-0 w-full h-full pointer-events-none" 
        />
      )}
    </div>
  );
};

export default React.memo(SudokuCell);
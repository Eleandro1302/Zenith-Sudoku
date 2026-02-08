import React from 'react';
import { Undo, Eraser, Lightbulb, Pencil } from 'lucide-react';
import { InputMode, DisplayMode } from '../types';
import AbacusDisplay from './AbacusDisplay';

interface ControlsProps {
  inputMode: InputMode;
  displayMode: DisplayMode;
  setInputMode: (mode: InputMode) => void;
  onNumberClick: (num: number) => void;
  onUndo: () => void;
  onErase: () => void;
  onHint: () => void;
  canUndo: boolean;
  hintsRemaining: number;
  completedNumbers?: number[]; // Numbers that are done (9 instances)
  remainingCounts?: Record<number, number>; // How many left of each number
}

const Controls: React.FC<ControlsProps> = ({
  inputMode,
  displayMode,
  setInputMode,
  onNumberClick,
  onUndo,
  onErase,
  onHint,
  canUndo,
  hintsRemaining,
  completedNumbers = [],
  remainingCounts = {}
}) => {
  
  const btnClass = "flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl transition-all active:scale-95 select-none";
  const activeClass = "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30";
  const inactiveClass = "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm";

  const numBtnClass = "h-14 sm:h-16 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 active:bg-indigo-200 transition-colors shadow-sm flex flex-col items-center justify-center p-1 disabled:opacity-0 disabled:pointer-events-none";

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 sm:space-y-6 mt-2">
      
      {/* Primary Actions Row */}
      <div className="flex justify-between gap-1 sm:gap-4 px-1 sm:px-2">
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`${btnClass} ${inactiveClass} ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''} flex-1`}
        >
          <Undo size={20} className="mb-1" />
          <span className="text-[10px] sm:text-xs font-medium">Undo</span>
        </button>

        {/* Note Toggle */}
        <button 
          onClick={() => setInputMode(inputMode === 'note' ? 'numpad' : 'note')}
          className={`${btnClass} ${inputMode === 'note' ? activeClass : inactiveClass} flex-1 relative`}
        >
          <Pencil size={20} className="mb-1" />
          <span className="text-[10px] sm:text-xs font-medium">Notes</span>
          {inputMode === 'note' && (
             <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          )}
        </button>

        <button 
          onClick={onErase}
          className={`${btnClass} ${inactiveClass} flex-1`}
        >
          <Eraser size={20} className="mb-1" />
          <span className="text-[10px] sm:text-xs font-medium">Erase</span>
        </button>

        <button 
          onClick={onHint}
          disabled={hintsRemaining <= 0}
          className={`${btnClass} ${inactiveClass} flex-1 relative`}
        >
          <Lightbulb size={20} className={`mb-1 ${hintsRemaining > 0 ? 'text-amber-500' : ''}`} />
          <span className="text-[10px] sm:text-xs font-medium">Hint</span>
          <span className="absolute -top-2 -right-1 sm:-right-2 w-5 h-5 flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900">
            {hintsRemaining}
          </span>
        </button>
      </div>

      {/* Unified Numpad (1-9) - Single Row */}
      <div className="grid grid-cols-9 gap-1 sm:gap-2 px-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isCompleted = completedNumbers.includes(num);
            const count = remainingCounts[num] !== undefined ? remainingCounts[num] : 9;
            
            return (
                <button
                    key={num}
                    onClick={() => onNumberClick(num)}
                    disabled={isCompleted}
                    className={numBtnClass}
                    style={isCompleted ? { opacity: 0, visibility: 'hidden' } : {}}
                >
                    {displayMode === 'abacus' ? (
                        <div className="w-full h-full p-0.5"><AbacusDisplay value={num} /></div>
                    ) : (
                        <>
                            <span className="text-xl sm:text-2xl font-medium leading-none">{num}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">{count}</span>
                        </>
                    )}
                </button>
            );
        })}
      </div>

      {/* Helper Text */}
      <div className="text-center pt-2 pb-4 opacity-50 text-xs text-slate-500 dark:text-slate-400">
         Select a cell and use the numpad, or simply write the number on the grid
      </div>

    </div>
  );
};

export default Controls;
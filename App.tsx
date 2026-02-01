import React, { useState, useEffect, useCallback } from 'react';
import { generateSudoku, createEmptyBoard } from './services/sudokuGenerator';
import { getSmartHint } from './services/geminiService';
import SudokuCell from './components/SudokuCell';
import Controls from './components/Controls';
import { CellData, Difficulty, InputMode, DisplayMode } from './types';
import { Trophy, Settings, Loader2, Play, Pause, Grid3x3, Flame, Sparkles, Brain, ChevronRight, XCircle, Linkedin } from 'lucide-react';

// --- Intro Component ---
const IntroView: React.FC<{ onStart: (diff: Difficulty) => void }> = ({ onStart }) => {
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('Easy');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100">
      
      {/* Logo Area */}
      <div className="relative mb-10 group cursor-default">
        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full" />
        <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-500/10 flex items-center justify-center border border-slate-200 dark:border-slate-800 transform -rotate-6 transition-transform group-hover:rotate-0 duration-500">
          <Grid3x3 size={48} className="text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
      
      {/* Title */}
      <div className="text-center mb-12 space-y-3">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Zenith <span className="text-indigo-600 dark:text-indigo-400">Sudoku</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          Experience the art of logic.
        </p>
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm space-y-8">
        
        {/* Difficulty Selector */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Select Difficulty</div>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDiff(d)}
                className={`
                  py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300
                  ${selectedDiff === d 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-100 ring-1 ring-black/5 dark:ring-white/5' 
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }
                `}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-slate-400 pt-1">
             {selectedDiff === 'Easy' && 'Unlimited mistakes'}
             {selectedDiff === 'Medium' && 'Limit: 20 mistakes'}
             {selectedDiff === 'Hard' && 'Limit: 5 mistakes'}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart(selectedDiff)}
          className="group w-full py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-2xl font-bold text-xl shadow-xl shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl" />
          <span className="relative">Start Game</span>
          <ChevronRight className="relative group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer */}
      <div className="mt-16 flex flex-col items-center gap-4">
        <span className="text-slate-400 text-sm font-medium opacity-60">v1.2.0</span>
        <a 
          href="https://www.linkedin.com/in/eleandro-mangrich?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-300 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50 group"
        >
            <span>Developed by <span className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-semibold transition-colors">Eleandro</span></span>
            <Linkedin size={14} className="stroke-[2.5]" />
        </a>
      </div>
    </div>
  );
};

const getMistakeLimit = (diff: Difficulty): number => {
  switch (diff) {
    case 'Easy': return Infinity;
    case 'Medium': return 20;
    case 'Hard': return 5;
  }
};

const App: React.FC = () => {
  // --- State ---
  const [board, setBoard] = useState<CellData[][]>(createEmptyBoard());
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [inputMode, setInputMode] = useState<InputMode>('numpad');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('arabic'); 
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'won' | 'lost'>('idle');
  const [timer, setTimer] = useState(0);
  const [history, setHistory] = useState<CellData[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mistakes, setMistakes] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [isProcessingHint, setIsProcessingHint] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // --- Timer ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'playing') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // --- Game Logic ---
  const startNewGame = useCallback((diff: Difficulty = difficulty) => {
    setStatus('loading');
    setDifficulty(diff);
    // Small delay to allow UI to show loading state
    setTimeout(() => {
      const newBoard = generateSudoku(diff);
      setBoard(newBoard);
      setHistory([newBoard]);
      setHistoryIndex(0);
      setTimer(0);
      setMistakes(0);
      setHintsRemaining(3);
      setHintMessage(null);
      setStatus('playing');
      setSelectedPos(null);
    }, 500);
  }, [difficulty]);

  const addToHistory = (newBoard: CellData[][]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBoard);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleCellClick = useCallback((r: number, c: number) => {
    if (status !== 'playing') return;
    setSelectedPos({ r, c });
    setHintMessage(null);
  }, [status]);

  const updateCell = (r: number, c: number, value: number | null, isNote: boolean = false) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[r][c];

    if (cell.isFixed) return;

    if (isNote) {
      if (value === null) {
        cell.notes = [];
      } else {
        if (cell.notes.includes(value)) {
          cell.notes = cell.notes.filter(n => n !== value);
        } else {
          cell.notes = [...cell.notes, value].sort();
        }
      }
    } else {
      // Setting Value
      if (cell.value === value) return; // No change

      cell.value = value;
      cell.notes = []; // Clear notes on value set
      
      // Check for error immediately
      if (value !== null) {
        if (value !== cell.solution) {
            cell.isError = true;
            const newMistakes = mistakes + 1;
            setMistakes(newMistakes);

            const limit = getMistakeLimit(difficulty);
            if (limit !== Infinity && newMistakes >= limit) {
                setStatus('lost');
            }
        } else {
            cell.isError = false;
        }
      } else {
        cell.isError = false;
      }
    }

    setBoard(newBoard);
    addToHistory(newBoard);

    // Check Win if not lost
    if (!isNote && value !== null && status !== 'lost') {
        checkWin(newBoard);
    }
  };

  const checkWin = (currentBoard: CellData[][]) => {
    const isComplete = currentBoard.every(row => 
        row.every(cell => cell.value !== null && cell.value === cell.solution)
    );
    if (isComplete) {
        setStatus('won');
    }
  };

  const handleInput = useCallback((num: number, modeType: 'value' | 'note') => {
    if (!selectedPos || status !== 'playing') return;
    const { r, c } = selectedPos;

    // 1. Handle Scratch-out (Erase)
    if (num === -1) {
        updateCell(r, c, null);
        return;
    }

    // 2. Apply
    const isNote = modeType === 'note';
    updateCell(r, c, num, isNote);

  }, [board, selectedPos, status, mistakes, difficulty]); // Added dependencies for accurate mistake checking

  const handleNumberClick = (num: number) => {
    handleInput(num, inputMode === 'note' ? 'note' : 'value');
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
        setHistoryIndex(h => h - 1);
        setBoard(history[historyIndex - 1]);
    }
  };

  const handleErase = () => {
    if (selectedPos) {
        updateCell(selectedPos.r, selectedPos.c, null);
    }
  };

  const handleSmartHint = async () => {
    if (hintsRemaining <= 0 || isProcessingHint) return;
    
    setIsProcessingHint(true);
    setHintsRemaining(h => h - 1);
    
    try {
        const hint = await getSmartHint(board);
        setHintMessage(hint);
    } catch (e) {
        setHintMessage("Focus on the blocks with the most numbers filled.");
    } finally {
        setIsProcessingHint(false);
    }
  };

  const handleBackToMenu = () => {
      setStatus('idle');
  }

  // --- Render Helpers ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const selectedValue = selectedPos ? board[selectedPos.r][selectedPos.c].value : null;
  const mistakeLimit = getMistakeLimit(difficulty);

  // --- RENDER ---

  if (status === 'idle') {
    return <IntroView onStart={startNewGame} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 touch-pan-y animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between max-w-xl mx-auto">
        <button onClick={handleBackToMenu} className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Grid3x3 size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Zenith <span className="text-indigo-600 dark:text-indigo-400">Sudoku</span></h1>
        </button>
        <div className="flex gap-3">
             <button 
                onClick={() => setDisplayMode(m => m === 'arabic' ? 'abacus' : 'arabic')}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Abacus Mode"
             >
                {displayMode === 'arabic' ? <Brain size={20} /> : <span className="font-serif font-bold text-lg">123</span>}
             </button>
            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Info Bar */}
      <div className="px-6 py-2 max-w-xl mx-auto flex justify-between items-center text-sm font-medium text-slate-500 dark:text-slate-400">
        <div className="flex gap-4">
             <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                <DifficultyBadge diff={difficulty} />
             </span>
             <span className="flex items-center gap-1.5" title={mistakeLimit === Infinity ? "Unlimited Mistakes" : `Limit: ${mistakeLimit} mistakes`}>
                <Flame size={16} className={mistakes > (mistakeLimit === Infinity ? 5 : mistakeLimit * 0.8) ? "text-red-500" : "text-slate-400"} />
                {mistakes} / {mistakeLimit === Infinity ? '∞' : mistakeLimit}
             </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
            {status === 'paused' ? <Pause size={14} /> : <Play size={14} />}
            {formatTime(timer)}
        </div>
      </div>

      {/* Hint Banner */}
      {hintMessage && (
        <div className="mx-4 mt-2 max-w-xl md:mx-auto bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
            <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">{hintMessage}</p>
            <button onClick={() => setHintMessage(null)} className="ml-auto text-indigo-400 hover:text-indigo-600">×</button>
        </div>
      )}

      {/* Grid */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-xl aspect-square bg-slate-900 dark:bg-slate-950 rounded-xl shadow-2xl p-1 sm:p-2 border border-slate-200 dark:border-slate-800">
             {/* Board Container */}
             <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-px bg-slate-300 dark:bg-slate-700 border-2 border-slate-800 dark:border-slate-600 rounded-lg overflow-hidden">
                {board.map((row, r) => 
                    row.map((cell, c) => (
                        <div 
                            key={`${r}-${c}`} 
                            className={`
                                relative 
                                ${c % 3 === 2 && c !== 8 ? 'border-r-2 border-slate-800 dark:border-slate-500' : ''}
                                ${r % 3 === 2 && r !== 8 ? 'border-b-2 border-slate-800 dark:border-slate-500' : ''}
                            `}
                            style={{ gridRow: r + 1, gridColumn: c + 1 }}
                        >
                            <SudokuCell 
                                cell={cell}
                                isSelected={selectedPos?.r === r && selectedPos?.c === c}
                                isActive={selectedPos ? (selectedPos.r === r || selectedPos.c === c || (Math.floor(selectedPos.r/3) === Math.floor(r/3) && Math.floor(selectedPos.c/3) === Math.floor(c/3))) : false}
                                isRelated={selectedValue != null && cell.value === selectedValue}
                                mode={inputMode}
                                displayMode={displayMode}
                                onClick={() => handleCellClick(r, c)}
                                onInput={handleInput}
                            />
                        </div>
                    ))
                )}
             </div>

             {/* Loading Overlay */}
             {status === 'loading' && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                </div>
             )}

             {/* Lost Overlay */}
             {status === 'lost' && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-xl text-white p-6 text-center animate-in zoom-in">
                    <XCircle size={64} className="mb-4 text-rose-500 drop-shadow-lg" />
                    <h2 className="text-3xl font-bold mb-2">Game Over</h2>
                    <p className="text-slate-300 mb-6 max-w-xs mx-auto">
                        You've reached the limit of <span className="text-rose-400 font-bold">{mistakeLimit}</span> mistakes for this difficulty level.
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleBackToMenu}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-colors border border-white/20"
                        >
                            Menu
                        </button>
                        <button 
                            onClick={() => startNewGame()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
             )}

             {/* Win Overlay */}
             {status === 'won' && (
                <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-xl text-white p-6 text-center animate-in zoom-in">
                    <Trophy size={64} className="mb-4 text-yellow-300 drop-shadow-lg" />
                    <h2 className="text-3xl font-bold mb-2">Solved!</h2>
                    <p className="text-indigo-100 mb-6">Masterfully done in {formatTime(timer)}.</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleBackToMenu}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-colors border border-white/20"
                        >
                            Menu
                        </button>
                        <button 
                            onClick={() => startNewGame()}
                            className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
             )}
        </div>
      </main>

      {/* Controls */}
      <footer className="pb-8 px-4 flex flex-col items-center gap-6">
        <Controls 
            inputMode={inputMode}
            displayMode={displayMode}
            setInputMode={setInputMode}
            onNumberClick={handleNumberClick}
            onUndo={handleUndo}
            onErase={handleErase}
            onHint={handleSmartHint}
            canUndo={historyIndex > 0 && status !== 'lost'}
            hintsRemaining={hintsRemaining}
        />
        
        {/* Credits */}
        <a 
          href="https://www.linkedin.com/in/eleandro-mangrich?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-300 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50 group"
        >
            <span>Developed by <span className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-semibold transition-colors">Eleandro</span></span>
            <Linkedin size={14} className="stroke-[2.5]" />
        </a>
      </footer>
    </div>
  );
};

const DifficultyBadge = ({ diff }: { diff: Difficulty }) => {
    const colors = {
        Easy: 'text-emerald-500',
        Medium: 'text-amber-500',
        Hard: 'text-rose-500'
    };
    return <span className={`font-bold ${colors[diff]}`}>{diff}</span>;
};

export default App;
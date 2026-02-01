export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface CellData {
  row: number;
  col: number;
  value: number | null;
  solution: number;
  isFixed: boolean; // Was part of the original puzzle
  notes: number[];
  isError: boolean;
}

export interface GameState {
  board: CellData[][];
  difficulty: Difficulty;
  status: 'idle' | 'playing' | 'paused' | 'won' | 'lost';
  timer: number;
  mistakes: number;
  history: CellData[][][]; // Array of board snapshots
  historyIndex: number;
}

export type InputMode = 'numpad' | 'note';

export type DisplayMode = 'arabic' | 'abacus';

export interface Point {
  x: number;
  y: number;
}
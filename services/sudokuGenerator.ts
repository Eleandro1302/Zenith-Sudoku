import { CellData, Difficulty } from '../types';

// Constants
const GRID_SIZE = 9;
const BOX_SIZE = 3;

export const createEmptyBoard = (): CellData[][] => {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => ({
      row,
      col,
      value: null,
      solution: 0,
      isFixed: false,
      notes: [],
      isError: false,
    }))
  );
};

// Check if placing num at board[row][col] is valid
export const isValid = (
  board: (number | null)[][],
  row: number,
  col: number,
  num: number
): boolean => {
  // Check Row
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[row][x] === num && x !== col) return false;
  }

  // Check Col
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[x][col] === num && x !== row) return false;
  }

  // Check Box
  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (
        board[startRow + i][startCol + j] === num &&
        (startRow + i !== row || startCol + j !== col)
      ) {
        return false;
      }
    }
  }

  return true;
};

const solveSudoku = (board: number[][]): boolean => {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board as any, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const fillDiagonal = (board: number[][]) => {
  for (let i = 0; i < GRID_SIZE; i = i + BOX_SIZE) {
    fillBox(board, i, i);
  }
};

const fillBox = (board: number[][], row: number, col: number) => {
  let num: number;
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      do {
        num = Math.floor(Math.random() * 9) + 1;
      } while (!isSafeInBox(board, row, col, num));
      board[row + i][col + j] = num;
    }
  }
};

const isSafeInBox = (board: number[][], rowStart: number, colStart: number, num: number) => {
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (board[rowStart + i][colStart + j] === num) return false;
    }
  }
  return true;
};

const removeDigits = (board: CellData[][], difficulty: Difficulty) => {
  let attempts = difficulty === 'Easy' ? 30 : difficulty === 'Medium' ? 45 : 55;
  while (attempts > 0) {
    let row = Math.floor(Math.random() * GRID_SIZE);
    let col = Math.floor(Math.random() * GRID_SIZE);
    while (board[row][col].value === null) {
      row = Math.floor(Math.random() * GRID_SIZE);
      col = Math.floor(Math.random() * GRID_SIZE);
    }
    board[row][col].value = null;
    board[row][col].isFixed = false;
    attempts--;
  }
};

export const generateSudoku = (difficulty: Difficulty): CellData[][] => {
  // 1. Create a 9x9 number array
  const numBoard: number[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(0)
  );

  // 2. Fill diagonal boxes (independent)
  fillDiagonal(numBoard);

  // 3. Solve the rest
  solveSudoku(numBoard);

  // 4. Convert to CellData
  const board: CellData[][] = numBoard.map((row, r) =>
    row.map((val, c) => ({
      row: r,
      col: c,
      value: val, // Initially full
      solution: val,
      isFixed: true,
      notes: [],
      isError: false,
    }))
  );

  // 5. Remove digits to create puzzle
  removeDigits(board, difficulty);

  return board;
};
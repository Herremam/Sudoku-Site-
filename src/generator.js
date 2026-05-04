// generator.js — Puzzle generator with difficulty targeting

import { solveFull, getCandidates, countSolutions, analyseDifficulty } from './solver.js';

function emptyBoard() {
  return Array.from({length:9}, ()=>Array(9).fill(0));
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function fillBoard(board) {
  for (let r=0;r<9;r++) {
    for (let c=0;c<9;c++) {
      if (board[r][c]!==0) continue;
      const nums=shuffle([1,2,3,4,5,6,7,8,9]);
      for (const n of nums) {
        const used=new Set();
        for(let i=0;i<9;i++){used.add(board[r][i]);used.add(board[i][c]);}
        const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
        for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) used.add(board[br+dr][bc+dc]);
        if (!used.has(n)) {
          board[r][c]=n;
          if (fillBoard(board)) return true;
          board[r][c]=0;
        }
      }
      return false;
    }
  }
  return true;
}

const CLUE_RANGES = {
  easy:   [36, 42],
  medium: [30, 35],
  hard:   [24, 29],
  expert: [17, 23],
};

export function generatePuzzle(difficulty='medium', maxAttempts=50) {
  const [minClues, maxClues] = CLUE_RANGES[difficulty] || CLUE_RANGES.medium;

  for (let attempt=0; attempt<maxAttempts; attempt++) {
    // 1. Generate a complete solved board
    const solution = emptyBoard();
    fillBoard(solution);

    // 2. Remove cells
    const puzzle = solution.map(r=>[...r]);
    const positions = shuffle(Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9]));
    let clues = 81;

    for (const [r,c] of positions) {
      if (clues <= minClues) break;
      const saved = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions(puzzle,2) !== 1) {
        puzzle[r][c] = saved; // restore if ambiguous
      } else {
        clues--;
        if (clues <= maxClues) break;
      }
    }

    if (clues < minClues || clues > maxClues+5) continue;

    // 3. Verify actual difficulty
    const actual = analyseDifficulty(puzzle);

    // Accept same or adjacent difficulties
    const order=['easy','medium','hard','expert'];
    const di=order.indexOf(difficulty), ai=order.indexOf(actual);
    if (Math.abs(di-ai)<=1) {
      return { puzzle, solution, difficulty: actual, clues };
    }
  }

  // Fallback: return whatever we have
  const solution = emptyBoard();
  fillBoard(solution);
  const puzzle = solution.map(r=>[...r]);
  const positions = shuffle(Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9]));
  const target = Math.round((minClues+maxClues)/2);
  let clues=81;
  for (const [r,c] of positions) {
    if (clues<=target) break;
    const saved=puzzle[r][c]; puzzle[r][c]=0;
    if (countSolutions(puzzle,2)!==1) puzzle[r][c]=saved;
    else clues--;
  }
  return { puzzle, solution, difficulty, clues };
}

// Pre-built puzzles for instant load
export const SAMPLE_PUZZLES = {
  easy: [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ],
  medium: [
    [0,0,0,2,6,0,7,0,1],
    [6,8,0,0,7,0,0,9,0],
    [1,9,0,0,0,4,5,0,0],
    [8,2,0,1,0,0,0,4,0],
    [0,0,4,6,0,2,9,0,0],
    [0,5,0,0,0,3,0,2,8],
    [0,0,9,3,0,0,0,7,4],
    [0,4,0,0,5,0,0,3,6],
    [7,0,3,0,1,8,0,0,0]
  ],
  hard: [
    [0,0,0,6,0,0,4,0,0],
    [7,0,0,0,0,3,6,0,0],
    [0,0,0,0,9,1,0,8,0],
    [0,0,0,0,0,0,0,0,0],
    [0,5,0,1,8,0,0,0,3],
    [0,0,0,3,0,6,0,4,5],
    [0,4,0,2,0,0,0,6,0],
    [9,0,3,0,0,0,0,0,0],
    [0,2,0,0,0,0,1,0,0]
  ],
  expert: [
    [0,0,5,3,0,0,0,0,0],
    [8,0,0,0,0,0,0,2,0],
    [0,7,0,0,1,0,5,0,0],
    [4,0,0,0,0,5,3,0,0],
    [0,1,0,0,7,0,0,0,6],
    [0,0,3,2,0,0,0,8,0],
    [0,6,0,5,0,0,0,0,9],
    [0,0,4,0,0,0,0,3,0],
    [0,0,0,0,0,9,7,0,0]
  ]
};// generator.js — Puzzle generator with difficulty targeting

import { solveFull, getCandidates, countSolutions, analyseDifficulty } from './solver.js';

function emptyBoard() {
  return Array.from({length:9}, ()=>Array(9).fill(0));
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function fillBoard(board) {
  for (let r=0;r<9;r++) {
    for (let c=0;c<9;c++) {
      if (board[r][c]!==0) continue;
      const nums=shuffle([1,2,3,4,5,6,7,8,9]);
      for (const n of nums) {
        const used=new Set();
        for(let i=0;i<9;i++){used.add(board[r][i]);used.add(board[i][c]);}
        const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
        for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) used.add(board[br+dr][bc+dc]);
        if (!used.has(n)) {
          board[r][c]=n;
          if (fillBoard(board)) return true;
          board[r][c]=0;
        }
      }
      return false;
    }
  }
  return true;
}

const CLUE_RANGES = {
  easy:   [36, 42],
  medium: [30, 35],
  hard:   [24, 29],
  expert: [17, 23],
};

export function generatePuzzle(difficulty='medium', maxAttempts=50) {
  const [minClues, maxClues] = CLUE_RANGES[difficulty] || CLUE_RANGES.medium;

  for (let attempt=0; attempt<maxAttempts; attempt++) {
    // 1. Generate a complete solved board
    const solution = emptyBoard();
    fillBoard(solution);

    // 2. Remove cells
    const puzzle = solution.map(r=>[...r]);
    const positions = shuffle(Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9]));
    let clues = 81;

    for (const [r,c] of positions) {
      if (clues <= minClues) break;
      const saved = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions(puzzle,2) !== 1) {
        puzzle[r][c] = saved; // restore if ambiguous
      } else {
        clues--;
        if (clues <= maxClues) break;
      }
    }

    if (clues < minClues || clues > maxClues+5) continue;

    // 3. Verify actual difficulty
    const actual = analyseDifficulty(puzzle);

    // Accept same or adjacent difficulties
    const order=['easy','medium','hard','expert'];
    const di=order.indexOf(difficulty), ai=order.indexOf(actual);
    if (Math.abs(di-ai)<=1) {
      return { puzzle, solution, difficulty: actual, clues };
    }
  }

  // Fallback: return whatever we have
  const solution = emptyBoard();
  fillBoard(solution);
  const puzzle = solution.map(r=>[...r]);
  const positions = shuffle(Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9]));
  const target = Math.round((minClues+maxClues)/2);
  let clues=81;
  for (const [r,c] of positions) {
    if (clues<=target) break;
    const saved=puzzle[r][c]; puzzle[r][c]=0;
    if (countSolutions(puzzle,2)!==1) puzzle[r][c]=saved;
    else clues--;
  }
  return { puzzle, solution, difficulty, clues };
}

// Pre-built puzzles for instant load
export const SAMPLE_PUZZLES = {
  easy: [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ],
  medium: [
    [0,0,0,2,6,0,7,0,1],
    [6,8,0,0,7,0,0,9,0],
    [1,9,0,0,0,4,5,0,0],
    [8,2,0,1,0,0,0,4,0],
    [0,0,4,6,0,2,9,0,0],
    [0,5,0,0,0,3,0,2,8],
    [0,0,9,3,0,0,0,7,4],
    [0,4,0,0,5,0,0,3,6],
    [7,0,3,0,1,8,0,0,0]
  ],
  hard: [
    [0,0,0,6,0,0,4,0,0],
    [7,0,0,0,0,3,6,0,0],
    [0,0,0,0,9,1,0,8,0],
    [0,0,0,0,0,0,0,0,0],
    [0,5,0,1,8,0,0,0,3],
    [0,0,0,3,0,6,0,4,5],
    [0,4,0,2,0,0,0,6,0],
    [9,0,3,0,0,0,0,0,0],
    [0,2,0,0,0,0,1,0,0]
  ],
  expert: [
    [0,0,5,3,0,0,0,0,0],
    [8,0,0,0,0,0,0,2,0],
    [0,7,0,0,1,0,5,0,0],
    [4,0,0,0,0,5,3,0,0],
    [0,1,0,0,7,0,0,0,6],
    [0,0,3,2,0,0,0,8,0],
    [0,6,0,5,0,0,0,0,9],
    [0,0,4,0,0,0,0,3,0],
    [0,0,0,0,0,9,7,0,0]
  ]
};

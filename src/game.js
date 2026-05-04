// game.js — Game state, timer, undo/redo, notes

import { getCandidates, getHint, applyHint, solveFull } from './solver.js';
import { generatePuzzle, SAMPLE_PUZZLES } from './generator.js';

export class SudokuGame {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.board = null;
    this.solution = null;
    this.initial = null;
    this.notes = Array.from({length:9},()=>Array.from({length:9},()=>new Set()));
    this.history = [];
    this.future = [];
    this.selected = null;
    this.notesMode = false;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.difficulty = 'medium';
    this.startTime = null;
    this.elapsed = 0;
    this.timerInterval = null;
    this.paused = false;
    this.completed = false;
    this.highlightNum = null;
  }

  newGame(difficulty='medium', useSample=false) {
    this.stopTimer();
    this.completed = false;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.elapsed = 0;
    this.history = [];
    this.future = [];
    this.selected = null;
    this.notesMode = false;
    this.notes = Array.from({length:9},()=>Array.from({length:9},()=>new Set()));

    let puzzle, solution;
    if (useSample && SAMPLE_PUZZLES[difficulty]) {
      puzzle = SAMPLE_PUZZLES[difficulty].map(r=>[...r]);
      solution = solveFull(puzzle);
    } else {
      const gen = generatePuzzle(difficulty);
      puzzle = gen.puzzle;
      solution = gen.solution;
      difficulty = gen.difficulty;
    }

    this.board = puzzle.map(r=>[...r]);
    this.solution = solution;
    this.initial = puzzle.map(r=>[...r]);
    this.difficulty = difficulty;
    this.startTimer();
    this.update();
  }

  loadPuzzle(puzzle, solution, difficulty) {
    this.stopTimer();
    this.completed = false;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.elapsed = 0;
    this.history = [];
    this.future = [];
    this.selected = null;
    this.notesMode = false;
    this.notes = Array.from({length:9},()=>Array.from({length:9},()=>new Set()));
    this.board = puzzle.map(r=>[...r]);
    this.solution = solution || solveFull(puzzle);
    this.initial = puzzle.map(r=>[...r]);
    this.difficulty = difficulty;
    this.startTimer();
    this.update();
  }

  select(r, c) {
    this.selected = {r, c};
    this.highlightNum = this.board[r][c] || null;
    this.update();
  }

  input(n) {
    if (!this.selected || this.completed) return;
    const {r, c} = this.selected;
    if (this.initial[r][c] !== 0) return;

    this._pushHistory();

    if (this.notesMode && n !== 0) {
      if (this.board[r][c] !== 0) return;
      const note = this.notes[r][c];
      if (note.has(n)) note.delete(n); else note.add(n);
      this.future = [];
      this.update();
      return;
    }

    if (n === 0) {
      this.board[r][c] = 0;
      this.notes[r][c] = new Set();
      this.future = [];
      this.update();
      return;
    }

    // Check correctness
    if (this.solution && this.solution[r][c] !== n) {
      this.mistakes++;
      this.board[r][c] = n; // still place it, mark as error
    } else {
      this.board[r][c] = n;
      this.notes[r][c] = new Set();
      // Auto-remove note candidates from peers
      this._removeNoteFromPeers(r, c, n);
    }

    this.highlightNum = n;
    this.future = [];
    this.checkCompletion();
    this.update();
  }

  _removeNoteFromPeers(r, c, n) {
    for (let i=0;i<9;i++) {
      this.notes[r][i].delete(n);
      this.notes[i][c].delete(n);
    }
    const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
    for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++)
      this.notes[br+dr][bc+dc].delete(n);
  }

  _pushHistory() {
    this.history.push({
      board: this.board.map(r=>[...r]),
      notes: this.notes.map(r=>r.map(s=>new Set(s)))
    });
    if (this.history.length > 100) this.history.shift();
  }

  undo() {
    if (!this.history.length) return;
    this.future.push({
      board: this.board.map(r=>[...r]),
      notes: this.notes.map(r=>r.map(s=>new Set(s)))
    });
    const state = this.history.pop();
    this.board = state.board;
    this.notes = state.notes;
    this.update();
  }

  redo() {
    if (!this.future.length) return;
    this.history.push({
      board: this.board.map(r=>[...r]),
      notes: this.notes.map(r=>r.map(s=>new Set(s)))
    });
    const state = this.future.pop();
    this.board = state.board;
    this.notes = state.notes;
    this.update();
  }

  hint() {
    if (this.completed) return;
    this.hintsUsed++;
    const hint = getHint(this.board);
    if (!hint) {
      // Fall back to revealing a cell from solution
      const empties=[];
      for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(this.board[r][c]===0) empties.push([r,c]);
      if (!empties.length) return null;
      const [r,c]=empties[Math.floor(Math.random()*empties.length)];
      this._pushHistory();
      this.board[r][c]=this.solution[r][c];
      this.notes[r][c]=new Set();
      this._removeNoteFromPeers(r,c,this.solution[r][c]);
      this.checkCompletion();
      this.update();
      return { type:'Reveal', cell:{r,c}, value:this.solution[r][c], explanation:`Revealed the value at (${r+1},${c+1}).` };
    }
    this._pushHistory();
    if (hint.value !== undefined) {
      this.board[hint.cell.r][hint.cell.c] = hint.value;
      this.notes[hint.cell.r][hint.cell.c] = new Set();
      this._removeNoteFromPeers(hint.cell.r, hint.cell.c, hint.value);
    } else if (hint.eliminations) {
      for (const {r,c,remove} of hint.eliminations)
        remove.forEach(n=>this.notes[r][c].delete(n));
    }
    this.checkCompletion();
    this.update();
    return hint;
  }

  autoNote() {
    this._pushHistory();
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      if (this.board[r][c]!==0) continue;
      this.notes[r][c] = new Set(getCandidates(this.board,r,c));
    }
    this.update();
  }

  erase() {
    if (!this.selected) return;
    const {r,c}=this.selected;
    if (this.initial[r][c]!==0) return;
    this._pushHistory();
    this.board[r][c]=0;
    this.notes[r][c]=new Set();
    this.future=[];
    this.update();
  }

  checkCompletion() {
    if (!this.board || !this.solution) return false;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++)
      if (this.board[r][c]!==this.solution[r][c]) return false;
    this.completed = true;
    this.stopTimer();
    return true;
  }

  isError(r, c) {
    if (!this.solution || this.board[r][c]===0) return false;
    return this.board[r][c] !== this.solution[r][c];
  }

  // Timer
  startTimer() {
    this.startTime = Date.now() - this.elapsed*1000;
    this.paused = false;
    this.timerInterval = setInterval(()=>{
      if (!this.paused) {
        this.elapsed = Math.floor((Date.now()-this.startTime)/1000);
        this.onUpdate && this.onUpdate('timer');
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval=null; }
  }

  togglePause() {
    if (this.completed) return;
    this.paused = !this.paused;
    if (!this.paused) this.startTime = Date.now()-this.elapsed*1000;
    this.update();
  }

  formatTime() {
    const m=Math.floor(this.elapsed/60), s=this.elapsed%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // Highlight logic
  getHighlight(r, c) {
    if (!this.selected) return 'none';
    const {r:sr,c:sc}=this.selected;
    if (r===sr&&c===sc) return 'selected';
    const val=this.board[r][c];
    const selVal=this.board[sr][sc];
    if (selVal!==0&&val===selVal) return 'same-number';
    if (r===sr||c===sc||(Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(c/3)===Math.floor(sc/3)))
      return 'peer';
    return 'none';
  }

  update() {
    this.onUpdate && this.onUpdate('state');
  }

  // Serialise for localStorage
  save() {
    return JSON.stringify({
      board: this.board,
      solution: this.solution,
      initial: this.initial,
      notes: this.notes.map(r=>r.map(s=>[...s])),
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      difficulty: this.difficulty,
      elapsed: this.elapsed,
      completed: this.completed
    });
  }

  load(data) {
    try {
      const d = JSON.parse(data);
      this.board=d.board;
      this.solution=d.solution;
      this.initial=d.initial;
      this.notes=d.notes.map(r=>r.map(a=>new Set(a)));
      this.mistakes=d.mistakes;
      this.hintsUsed=d.hintsUsed;
      this.difficulty=d.difficulty;
      this.elapsed=d.elapsed;
      this.completed=d.completed;
      if (!this.completed) this.startTimer();
      this.update();
      return true;
    } catch { return false; }
  }
}

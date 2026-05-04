// main.js — UI controller

import { SudokuGame, MAX_HINTS } from './game.js';
import { getHint as _getHint, solveFull, getCandidates } from './solver.js';

// ── State ─────────────────────────────────────────────────────────────────────
let game = null;
let pendingHint = null;

// Solver state
let solverSelected = null;
let solverInputBoard = Array.from({length:9}, () => Array(9).fill(0));
let solverSteps = [];
let solverCurrentStep = -1;
let solverAutoTimer = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const boardEl         = document.getElementById('sudoku-board');
const menuOverlay     = document.getElementById('menu-overlay');
const completeOverlay = document.getElementById('complete-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hintOverlay     = document.getElementById('hint-overlay');
const pauseOverlay    = document.getElementById('pause-overlay');
const timerDisplay    = document.getElementById('timer-display');
const diffBadge       = document.getElementById('diff-badge');
const mistakesEl      = document.getElementById('mistakes');
const cTime           = document.getElementById('c-time');
const cMistakes       = document.getElementById('c-mistakes');
const cHints          = document.getElementById('c-hints');
const cDiff           = document.getElementById('c-diff');
const hintType        = document.getElementById('hint-type');
const hintExpl        = document.getElementById('hint-explanation');
const hintRemainingNote = document.getElementById('hint-remaining-note');
const continueBtn     = document.getElementById('continue-btn');
const btnNotes        = document.getElementById('btn-notes');
const btnUndo         = document.getElementById('btn-undo');
const btnErase        = document.getElementById('btn-erase');
const btnHint         = document.getElementById('btn-hint');
const hintCountBadge  = document.getElementById('hint-count-badge');

const appEl           = document.getElementById('app');
const solverPageEl    = document.getElementById('solver-page');
const solverInputPanel= document.getElementById('solver-input-panel');
const solverStepsPanel= document.getElementById('solver-steps-panel');
const solverBoardEl   = document.getElementById('solver-board');
const solverStepsBoardEl = document.getElementById('solver-steps-board');

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  game = new SudokuGame(onGameUpdate);

  const saved = localStorage.getItem('sudoku-save');
  if (saved) continueBtn.style.display = 'block';

  bindEvents();
  buildSolverInputBoard();
  showOverlay(menuOverlay);
}

// ── Game update handler ───────────────────────────────────────────────────────
function onGameUpdate(type) {
  if (type === 'timer') {
    timerDisplay.textContent = game.formatTime();
    return;
  }
  renderBoard();
  renderNumCounts();
  timerDisplay.textContent = game.formatTime();
  diffBadge.textContent = capitalise(game.difficulty);
  diffBadge.className = `diff-badge ${game.difficulty}`;
  mistakesEl.textContent = `${game.mistakes}/3`;
  btnNotes.classList.toggle('active', game.notesMode);

  // Update hint badge
  const remaining = game.hintsRemaining;
  hintCountBadge.textContent = remaining;
  hintCountBadge.className = `hint-count-badge${remaining === 0 ? ' depleted' : ''}`;
  btnHint.disabled = remaining === 0;
  btnHint.title = remaining > 0 ? `Hint (${remaining} left)` : 'No hints remaining';

  if (game.gameover) showGameOver();
  if (game.completed) showCompletion();
}

// ── Board rendering ───────────────────────────────────────────────────────────
function renderBoard() {
  if (!game.board) return;
  if (!boardEl.children.length) buildCells();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = boardEl.children[r * 9 + c];
      const val = game.board[r][c];
      const isInitial = game.initial[r][c] !== 0;
      const highlight = game.getHighlight(r, c);
      const isError = game.isError(r, c);
      const notes = game.notes[r][c];

      cell.className = 'cell';
      if (highlight !== 'none') cell.classList.add(
        highlight === 'selected' ? 'selected' :
        highlight === 'same-number' ? 'same-number' : 'peer'
      );
      if (isInitial) cell.classList.add('initial');
      else if (isError) cell.classList.add('error');
      else if (val !== 0) cell.classList.add('player');

      if (val !== 0) {
        cell.textContent = val;
      } else if (notes.size > 0) {
        cell.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'notes-grid';
        for (let n = 1; n <= 9; n++) {
          const nd = document.createElement('div');
          nd.className = 'note-digit' + (notes.has(n) ? ' active' : '');
          nd.textContent = notes.has(n) ? n : '';
          grid.appendChild(nd);
        }
        cell.appendChild(grid);
      } else {
        cell.textContent = '';
      }
    }
  }
}

function buildCells() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function renderNumCounts() {
  if (!game.board) return;
  const counts = Array(10).fill(0);
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (game.board[r][c]) counts[game.board[r][c]]++;
  for (let n=1;n<=9;n++) {
    const nc = document.getElementById(`nc-${n}`);
    const btn = document.querySelector(`.num-btn[data-n="${n}"]`);
    const rem = 9 - counts[n];
    if (nc) nc.textContent = rem > 0 ? rem : '';
    if (btn) btn.disabled = rem === 0;
  }
}

// ── Cell interaction ──────────────────────────────────────────────────────────
function onCellClick(r, c) {
  if (!game || game.paused || game.completed || game.gameover) return;
  game.select(r, c);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!game || game.paused || game.completed || game.gameover) return;
  if (solverPageEl && !solverPageEl.classList.contains('hidden')) return;

  if (e.key >= '1' && e.key <= '9') { game.input(parseInt(e.key)); return; }
  if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') { game.erase(); return; }
  if (e.key === 'n' || e.key === 'N') { game.notesMode = !game.notesMode; game.update(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); game.undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); game.redo(); return; }

  if (!game.selected) return;
  const {r,c} = game.selected;
  const moves = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] };
  if (moves[e.key]) {
    e.preventDefault();
    const [dr,dc] = moves[e.key];
    game.select(Math.max(0,Math.min(8,r+dr)), Math.max(0,Math.min(8,c+dc)));
  }
});

// ── Events ────────────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.diff));
  });

  continueBtn.addEventListener('click', () => {
    const saved = localStorage.getItem('sudoku-save');
    if (saved && game.load(saved)) hideOverlay(menuOverlay);
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    if (game.board) saveGame();
    showOverlay(menuOverlay);
  });

  document.getElementById('pause-btn').addEventListener('click', () => {
    game.togglePause();
    if (game.paused) showOverlay(pauseOverlay);
  });
  document.getElementById('resume-btn').addEventListener('click', () => {
    game.togglePause();
    hideOverlay(pauseOverlay);
  });

  btnUndo.addEventListener('click', () => game.undo());
  btnErase.addEventListener('click', () => game.erase());
  btnNotes.addEventListener('click', () => { game.notesMode = !game.notesMode; game.update(); });
  btnHint.addEventListener('click', showHint);

  document.getElementById('btn-solver').addEventListener('click', openSolverPage);
  document.getElementById('solver-menu-btn').addEventListener('click', () => {
    hideOverlay(menuOverlay);
    openSolverPage();
  });

  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!game.selected) return;
      game.input(parseInt(btn.dataset.n));
      animatePop(game.selected.r, game.selected.c);
    });
  });

  // Hint overlay
  document.getElementById('hint-close').addEventListener('click', () => {
    hideOverlay(hintOverlay);
    clearHintHighlights();
    pendingHint = null;
  });
  document.getElementById('hint-apply').addEventListener('click', () => {
    if (pendingHint && pendingHint.value !== undefined) {
      game._pushHistory();
      applyHintToGame(pendingHint);
      game.checkCompletion();
      game.update();
      pendingHint = null;
    } else if (pendingHint && pendingHint.eliminations) {
      game._pushHistory();
      applyHintToGame(pendingHint);
      game.update();
      pendingHint = null;
    }
    hideOverlay(hintOverlay);
  });

  // Gameover
  document.getElementById('gameover-new-btn').addEventListener('click', () => {
    hideOverlay(gameoverOverlay);
    startGame(game.difficulty);
  });
  document.getElementById('gameover-menu-btn').addEventListener('click', () => {
    hideOverlay(gameoverOverlay);
    showOverlay(menuOverlay);
  });

  // Completion
  document.getElementById('new-same-btn').addEventListener('click', () => {
    hideOverlay(completeOverlay);
    startGame(game.difficulty);
  });
  document.getElementById('back-menu-btn').addEventListener('click', () => {
    hideOverlay(completeOverlay);
    showOverlay(menuOverlay);
  });

  // Solver page events
  document.getElementById('solver-back-btn').addEventListener('click', closeSolverPage);
  document.getElementById('solver-load-current').addEventListener('click', loadCurrentGameIntoSolver);
  document.getElementById('solver-clear').addEventListener('click', clearSolverBoard);
  document.getElementById('solver-start').addEventListener('click', startSolving);
  document.getElementById('solver-next-step').addEventListener('click', () => stepSolver(1));
  document.getElementById('solver-prev-step').addEventListener('click', () => stepSolver(-1));
  document.getElementById('solver-auto-play').addEventListener('click', toggleAutoPlay);
  document.getElementById('solver-reset-steps').addEventListener('click', resetSolverToInput);

  document.querySelectorAll('.solver-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (solverSelected === null) return;
      const n = parseInt(btn.dataset.n);
      const {r, c} = solverSelected;
      solverInputBoard[r][c] = n;
      renderSolverInputBoard();
    });
  });
}

// ── Start game ────────────────────────────────────────────────────────────────
async function startGame(difficulty) {
  hideOverlay(menuOverlay);
  showGenerating(true);
  game.newGame(difficulty, true);
  buildCells();
  renderBoard();
  renderNumCounts();
  onGameUpdate('state');
  showGenerating(false);
}

// ── Hint logic ────────────────────────────────────────────────────────────────
function showHint() {
  if (game.completed || game.paused) return;
  if (game.hintsRemaining === 0) return;

  const hint = _getHint(game.board);
  if (!hint) {
    // Fall back: reveal a random cell
    const empties = [];
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (game.board[r][c]===0) empties.push([r,c]);
    if (!empties.length) return;
    const [r,c] = empties[Math.floor(Math.random()*empties.length)];
    pendingHint = {
      type: 'Cell Reveal',
      cell: {r, c},
      value: game.solution[r][c],
      explanation: buildRevealExplanation(r, c, game.solution[r][c], game.board)
    };
  } else {
    pendingHint = hint;
    pendingHint.explanation = buildRichExplanation(hint, game.board);
  }

  // Count the hint now (before showing overlay) so badge updates immediately
  game.hintsUsed++;
  game.update();

  hintType.textContent = pendingHint.type;
  hintExpl.textContent = pendingHint.explanation || '';

  const remaining = game.hintsRemaining;
  if (remaining === 0) {
    hintRemainingNote.textContent = '⚠️ This was your last hint.';
    hintRemainingNote.className = 'hint-remaining-note depleted';
  } else {
    hintRemainingNote.textContent = `${remaining} hint${remaining===1?'':'s'} remaining this game.`;
    hintRemainingNote.className = 'hint-remaining-note';
  }

  clearHintHighlights();
  if (pendingHint.cells) {
    pendingHint.cells.forEach(({r,c}) => {
      const el = boardEl.children[r*9+c];
      if (el) el.classList.add('highlight-candidate');
    });
  }
  if (pendingHint.cell) {
    const el = boardEl.children[pendingHint.cell.r*9+pendingHint.cell.c];
    if (el) el.classList.add('highlight-candidate');
  }
  if (pendingHint.eliminations) {
    pendingHint.eliminations.forEach(({r,c}) => {
      const el = boardEl.children[r*9+c];
      if (el) el.classList.add('highlight-elim');
    });
  }

  showOverlay(hintOverlay);
}

function buildRevealExplanation(r, c, val, board) {
  const candidates = getCandidates(board, r, c);
  return `Cell (${r+1},${c+1}) must be ${val}. ` +
    (candidates.length === 1
      ? `It's the only number that fits — all other digits already appear in the same row, column, or box.`
      : `After checking what's already placed in row ${r+1}, column ${c+1}, and its 3×3 box, ${val} is the only correct option.`);
}

function buildRichExplanation(hint, board) {
  // Already has a good explanation from solver — enrich it
  let base = hint.explanation || '';
  switch (hint.type) {
    case 'Naked Single':
      return base + ` Every other digit (1–9) already appears somewhere in the same row, column, or 3×3 box, so there is no other choice.`;
    case 'Hidden Single':
      return base + ` Even though the cell has other candidates, ${hint.value} cannot go anywhere else in that unit — making this spot the only valid one.`;
    case 'Naked Pair':
      return base + ` Because those two cells are the only places these digits can go in the unit, no other cell in the unit can contain them.`;
    case 'Hidden Pair':
      return base + ` Since these two digits are confined to exactly two cells, all other candidates in those cells can be eliminated.`;
    case 'Pointing Pair':
    case 'Pointing Triple':
      return base + ` This means that digit is "locked" into that row or column within the box, so it can be removed from the rest of the row or column outside the box.`;
    case 'X-Wing':
      return base + ` This forms a rectangle — no matter which pair of cells ends up with the digit, it eliminates the digit from all other cells in those columns.`;
    case 'Y-Wing':
      return base + ` The three cells form a chain where any value for the pivot forces a value in one of the wings, guaranteeing the elimination.`;
    default:
      return base;
  }
}

function applyHintToGame(hint) {
  if (hint.value !== undefined && hint.cell) {
    game.board[hint.cell.r][hint.cell.c] = hint.value;
    game.notes[hint.cell.r][hint.cell.c] = new Set();
    game._removeNoteFromPeers(hint.cell.r, hint.cell.c, hint.value);
    animatePop(hint.cell.r, hint.cell.c);
  } else if (hint.eliminations) {
    hint.eliminations.forEach(({r,c,remove}) => remove.forEach(n => game.notes[r][c].delete(n)));
  }
  clearHintHighlights();
}

function clearHintHighlights() {
  document.querySelectorAll('.highlight-candidate,.highlight-elim').forEach(el => {
    el.classList.remove('highlight-candidate','highlight-elim');
  });
}

// ── Solver Page ───────────────────────────────────────────────────────────────
function openSolverPage() {
  appEl.classList.add('hidden');
  solverPageEl.classList.remove('hidden');
  // Show input panel, hide steps
  solverInputPanel.classList.remove('hidden');
  solverStepsPanel.classList.add('hidden');
  stopAutoPlay();
}

function closeSolverPage() {
  solverPageEl.classList.add('hidden');
  appEl.classList.remove('hidden');
  stopAutoPlay();
}

function buildSolverInputBoard() {
  solverBoardEl.innerHTML = '';
  for (let r=0;r<9;r++) {
    for (let c=0;c<9;c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener('click', () => {
        solverSelected = {r, c};
        renderSolverInputBoard();
      });
      solverBoardEl.appendChild(cell);
    }
  }
  renderSolverInputBoard();
}

function renderSolverInputBoard() {
  for (let r=0;r<9;r++) {
    for (let c=0;c<9;c++) {
      const cell = solverBoardEl.children[r*9+c];
      const val = solverInputBoard[r][c];
      cell.className = 'cell';
      if (solverSelected && solverSelected.r===r && solverSelected.c===c) cell.classList.add('selected');
      if (val !== 0) {
        cell.classList.add('initial');
        cell.textContent = val;
      } else {
        cell.textContent = '';
      }
    }
  }
}

function clearSolverBoard() {
  solverInputBoard = Array.from({length:9}, () => Array(9).fill(0));
  solverSelected = null;
  renderSolverInputBoard();
}

function loadCurrentGameIntoSolver() {
  if (!game || !game.board) return;
  // Load the initial clues (not the player's progress)
  solverInputBoard = game.initial.map(r => [...r]);
  solverSelected = null;
  renderSolverInputBoard();
}

function startSolving() {
  // Validate the board has at least some clues
  const filled = solverInputBoard.flat().filter(v => v !== 0).length;
  if (filled < 17) {
    alert('Please enter at least 17 clues — a valid Sudoku requires a minimum of 17 given digits.');
    return;
  }

  // Generate all steps
  solverSteps = generateSolverSteps(solverInputBoard);
  if (!solverSteps.length) {
    alert('Could not find a solution. Please check the puzzle is valid.');
    return;
  }

  solverCurrentStep = -1;
  solverInputPanel.classList.add('hidden');
  solverStepsPanel.classList.remove('hidden');

  // Build the steps board
  buildSolverStepsBoard(solverSteps[0].boardBefore);
  document.getElementById('solver-step-total').textContent = solverSteps.length;
  document.getElementById('solver-step-num').textContent = 0;
  document.getElementById('solver-step-title').textContent = 'Ready to solve';
  document.getElementById('solver-step-desc').textContent = `Found ${solverSteps.length} steps. Press Next to begin.`;
  document.getElementById('solver-step-badge').textContent = 'Start';
  document.getElementById('solver-log').innerHTML = '';
  updateSolverNavButtons();
}

function generateSolverSteps(initialBoard) {
  const steps = [];
  const board = initialBoard.map(r => [...r]);
  const initialSet = initialBoard.map(r => [...r]);

  let safety = 0;
  while (true) {
    safety++;
    if (safety > 500) break;
    if (board.every(row => row.every(v => v !== 0))) break;

    const hint = _getHint(board);
    if (hint) {
      const explanation = buildRichExplanation(hint, board);
      const stepBoardBefore = board.map(row => [...row]);
      steps.push({ ...hint, explanation, boardBefore: stepBoardBefore });
      if (hint.value !== undefined && hint.cell) {
        board[hint.cell.r][hint.cell.c] = hint.value;
      } else if (hint.eliminations) {
        // For elimination hints, try to advance the board via solving
        // just continue — the board state doesn't visually change for eliminations
      }
    } else {
      // Brute-force one cell via trial & error
      const solution = solveFull(board);
      if (!solution) break;
      let placed = false;
      for (let r=0;r<9 && !placed;r++) {
        for (let c=0;c<9 && !placed;c++) {
          if (board[r][c] === 0) {
            const explanation = `No more logical deductions are possible at this point. By systematically testing candidates for cell (${r+1},${c+1}) and checking which value leads to a valid completed puzzle, we determine it must be ${solution[r][c]}. This "trial and error" (backtracking) is sometimes necessary for hard and expert puzzles.`;
            steps.push({
              type: 'Trial & Error',
              cell: {r, c},
              value: solution[r][c],
              boardBefore: board.map(row=>[...row]),
              explanation
            });
            board[r][c] = solution[r][c];
            placed = true;
          }
        }
      }
      if (!placed) break;
    }
  }
  return steps;
}

function buildSolverStepsBoard(board) {
  if (!solverStepsBoardEl.children.length) {
    solverStepsBoardEl.innerHTML = '';
    for (let r=0;r<9;r++) {
      for (let c=0;c<9;c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        solverStepsBoardEl.appendChild(cell);
      }
    }
  }
  for (let r=0;r<9;r++) {
    for (let c=0;c<9;c++) {
      const cell = solverStepsBoardEl.children[r*9+c];
      cell.className = 'cell';
      const val = board[r][c];
      const isInitial = solverInputBoard[r][c] !== 0;
      if (val !== 0) {
        if (isInitial) cell.classList.add('initial');
        else cell.classList.add('player');
        cell.textContent = val;
      } else {
        cell.textContent = '';
      }
    }
  }
}

function stepSolver(dir) {
  stopAutoPlay();
  const newStep = solverCurrentStep + dir;
  if (newStep < -1 || newStep >= solverSteps.length) return;
  solverCurrentStep = newStep;
  renderSolverStep();
}

function renderSolverStep() {
  const stepNum = solverCurrentStep + 1;
  document.getElementById('solver-step-num').textContent = stepNum;

  if (solverCurrentStep === -1) {
    buildSolverStepsBoard(solverSteps[0].boardBefore);
    document.getElementById('solver-step-title').textContent = 'Ready to solve';
    document.getElementById('solver-step-desc').textContent = `Found ${solverSteps.length} steps. Press Next to begin.`;
    document.getElementById('solver-step-badge').textContent = 'Start';
    updateSolverNavButtons();
    return;
  }

  const step = solverSteps[solverCurrentStep];

  // Build board up to this step
  const board = solverSteps[0].boardBefore.map(r=>[...r]);
  for (let i = 0; i <= solverCurrentStep; i++) {
    const s = solverSteps[i];
    if (s.value !== undefined && s.cell) {
      board[s.cell.r][s.cell.c] = s.value;
    }
  }
  buildSolverStepsBoard(board);

  // Highlight the step's cell
  clearSolverHighlights();
  if (step.cell) {
    const el = solverStepsBoardEl.children[step.cell.r*9+step.cell.c];
    if (el) el.classList.add('highlight-candidate');
  }
  if (step.cells) {
    step.cells.forEach(({r,c}) => {
      const el = solverStepsBoardEl.children[r*9+c];
      if (el) el.classList.add('highlight-candidate');
    });
  }
  if (step.eliminations) {
    step.eliminations.forEach(({r,c}) => {
      const el = solverStepsBoardEl.children[r*9+c];
      if (el) el.classList.add('highlight-elim');
    });
  }

  document.getElementById('solver-step-badge').textContent = step.type;
  document.getElementById('solver-step-title').textContent =
    step.cell
      ? `Place ${step.value} at (${step.cell.r+1}, ${step.cell.c+1})`
      : step.isElimination ? 'Eliminate candidates' : step.type;
  document.getElementById('solver-step-desc').textContent = step.explanation || '';

  // Add to log
  addToSolverLog(stepNum, step);
  updateSolverNavButtons();
}

function clearSolverHighlights() {
  solverStepsBoardEl.querySelectorAll('.highlight-candidate,.highlight-elim').forEach(el => {
    el.classList.remove('highlight-candidate','highlight-elim');
  });
}

function addToSolverLog(stepNum, step) {
  const log = document.getElementById('solver-log');
  // Don't duplicate
  if (log.querySelector(`[data-step="${stepNum}"]`)) return;
  const entry = document.createElement('div');
  entry.className = 'solver-log-entry';
  entry.dataset.step = stepNum;
  const cellStr = step.cell ? ` → (${step.cell.r+1},${step.cell.c+1})${step.value!==undefined?'='+step.value:''}` : '';
  entry.innerHTML = `<span class="solver-log-num">${stepNum}</span><span class="solver-log-type">${step.type}</span><span class="solver-log-cell">${cellStr}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function updateSolverNavButtons() {
  const prev = document.getElementById('solver-prev-step');
  const next = document.getElementById('solver-next-step');
  prev.disabled = solverCurrentStep <= -1;
  next.disabled = solverCurrentStep >= solverSteps.length - 1;
}

function toggleAutoPlay() {
  if (solverAutoTimer) {
    stopAutoPlay();
    document.getElementById('solver-auto-play').textContent = '▶ Auto Play';
  } else {
    document.getElementById('solver-auto-play').textContent = '⏸ Pause';
    solverAutoTimer = setInterval(() => {
      if (solverCurrentStep >= solverSteps.length - 1) {
        stopAutoPlay();
        document.getElementById('solver-auto-play').textContent = '▶ Auto Play';
        return;
      }
      solverCurrentStep++;
      renderSolverStep();
    }, 1200);
  }
}

function stopAutoPlay() {
  if (solverAutoTimer) {
    clearInterval(solverAutoTimer);
    solverAutoTimer = null;
  }
}

function resetSolverToInput() {
  stopAutoPlay();
  solverStepsPanel.classList.add('hidden');
  solverInputPanel.classList.remove('hidden');
  clearSolverHighlights();
}

// ── Overlay helpers ───────────────────────────────────────────────────────────
function showOverlay(el) { el.classList.add('active'); }
function hideOverlay(el) { el.classList.remove('active'); }

// ── Completion ────────────────────────────────────────────────────────────────
function showGameOver() {
  setTimeout(() => showOverlay(gameoverOverlay), 400);
}

function showCompletion() {
  saveGame();
  localStorage.removeItem('sudoku-save');
  cTime.textContent = game.formatTime();
  cMistakes.textContent = game.mistakes;
  cHints.textContent = game.hintsUsed;
  cDiff.textContent = capitalise(game.difficulty);
  setTimeout(() => {
    launchConfetti();
    showOverlay(completeOverlay);
  }, 400);
}

function launchConfetti() {
  const colors = ['#6c8ef7','#a78bfa','#f6d860','#4ade80','#f87171','#fb923c'];
  for (let i=0;i<60;i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.5}s;
      width:${6+Math.random()*6}px; height:${6+Math.random()*6}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
    `;
    document.body.appendChild(p);
    p.addEventListener('animationend',()=>p.remove());
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function animatePop(r, c) {
  if (r == null || c == null) return;
  const el = boardEl.children[r*9+c];
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  el.addEventListener('animationend',()=>el.classList.remove('pop'),{once:true});
}

function capitalise(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

function saveGame() {
  if (game && game.board && !game.completed) {
    localStorage.setItem('sudoku-save', game.save());
  }
}

function showGenerating(show) {
  let el = document.querySelector('.generating-msg');
  if (show && !el) {
    el = document.createElement('div');
    el.className = 'generating-msg';
    el.innerHTML = '<div class="spinner"></div><span>Generating puzzle…</span>';
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
  } else if (!show && el) {
    el.classList.remove('show');
    setTimeout(()=>el.remove(),300);
  }
}

window.addEventListener('beforeunload', saveGame);
init();

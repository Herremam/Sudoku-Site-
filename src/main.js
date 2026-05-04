// main.js — UI controller

import { SudokuGame } from './game.js';

// ── State ─────────────────────────────────────────────────────────────────────
let game = null;
let pendingHint = null;
let generating = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const boardEl       = document.getElementById('sudoku-board');
const menuOverlay   = document.getElementById('menu-overlay');
const completeOverlay= document.getElementById('complete-overlay');
const hintOverlay   = document.getElementById('hint-overlay');
const pauseOverlay  = document.getElementById('pause-overlay');
const timerDisplay  = document.getElementById('timer-display');
const diffBadge     = document.getElementById('diff-badge');
const mistakesEl    = document.getElementById('mistakes');
const cTime         = document.getElementById('c-time');
const cMistakes     = document.getElementById('c-mistakes');
const cHints        = document.getElementById('c-hints');
const cDiff         = document.getElementById('c-diff');
const hintType      = document.getElementById('hint-type');
const hintExpl      = document.getElementById('hint-explanation');
const continueBtn   = document.getElementById('continue-btn');
const btnNotes      = document.getElementById('btn-notes');
const btnUndo       = document.getElementById('btn-undo');
const btnErase      = document.getElementById('btn-erase');
const btnHint       = document.getElementById('btn-hint');
const btnAutonote   = document.getElementById('btn-autonote');

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  game = new SudokuGame(onGameUpdate);

  // Check for saved game
  const saved = localStorage.getItem('sudoku-save');
  if (saved) continueBtn.style.display = 'block';

  bindEvents();
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
  mistakesEl.textContent = game.mistakes;
  btnNotes.classList.toggle('active', game.notesMode);

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

      // Classes
      cell.className = 'cell';
      if (highlight !== 'none') cell.classList.add(highlight === 'selected' ? 'selected' : highlight === 'same-number' ? 'same-number' : 'peer');
      if (isInitial) cell.classList.add('initial');
      else if (isError) cell.classList.add('error');
      else if (val !== 0) cell.classList.add('player');

      // Content
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
  if (!game || game.paused || game.completed) return;
  game.select(r, c);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!game || game.paused || game.completed) return;

  if (e.key >= '1' && e.key <= '9') { game.input(parseInt(e.key)); return; }
  if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') { game.erase(); return; }
  if (e.key === 'n' || e.key === 'N') { game.notesMode = !game.notesMode; game.update(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); game.undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); game.redo(); return; }

  // Arrow navigation
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
  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.diff));
  });

  // Continue
  continueBtn.addEventListener('click', () => {
    const saved = localStorage.getItem('sudoku-save');
    if (saved && game.load(saved)) {
      hideOverlay(menuOverlay);
    }
  });

  // Menu btn
  document.getElementById('menu-btn').addEventListener('click', () => {
    if (game.board) saveGame();
    showOverlay(menuOverlay);
  });

  // Pause
  document.getElementById('pause-btn').addEventListener('click', () => {
    game.togglePause();
    if (game.paused) showOverlay(pauseOverlay);
  });
  document.getElementById('resume-btn').addEventListener('click', () => {
    game.togglePause();
    hideOverlay(pauseOverlay);
  });

  // Toolbar
  btnUndo.addEventListener('click', () => game.undo());
  btnErase.addEventListener('click', () => game.erase());
  btnNotes.addEventListener('click', () => { game.notesMode = !game.notesMode; game.update(); });
  btnAutonote.addEventListener('click', () => game.autoNote());
  btnHint.addEventListener('click', showHint);

  // Numpad
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
    pendingHint = null;
  });
  document.getElementById('hint-apply').addEventListener('click', () => {
    if (pendingHint) {
      game._pushHistory();
      applyHintToGame(pendingHint);
      game.checkCompletion();
      game.update();
      pendingHint = null;
    }
    hideOverlay(hintOverlay);
  });

  // Completion overlay
  document.getElementById('new-same-btn').addEventListener('click', () => {
    hideOverlay(completeOverlay);
    startGame(game.difficulty);
  });
  document.getElementById('back-menu-btn').addEventListener('click', () => {
    hideOverlay(completeOverlay);
    showOverlay(menuOverlay);
  });
}

// ── Start game ────────────────────────────────────────────────────────────────
async function startGame(difficulty) {
  hideOverlay(menuOverlay);
  showGenerating(true);

  // Use sample first for instant load, then generate in bg
  game.newGame(difficulty, true);
  buildCells();
  renderBoard();
  renderNumCounts();
  showGenerating(false);
}

// ── Hint logic ────────────────────────────────────────────────────────────────
function showHint() {
  if (game.completed || game.paused) return;
  const hint = getHintPreview();
  if (!hint) {
    // Reveal a cell directly
    const h = game.hint();
    if (h) animatePop(h.cell?.r, h.cell?.c);
    return;
  }
  pendingHint = hint;
  hintType.textContent = hint.type;
  hintExpl.textContent = hint.explanation || '';

  // Highlight cells on board
  clearHintHighlights();
  if (hint.cells) {
    hint.cells.forEach(({r,c}) => {
      const el = boardEl.children[r*9+c];
      if (el) el.classList.add('highlight-candidate');
    });
  }
  if (hint.eliminations) {
    hint.eliminations.forEach(({r,c}) => {
      const el = boardEl.children[r*9+c];
      if (el) el.classList.add('highlight-elim');
    });
  }

  showOverlay(hintOverlay);
}

function getHintPreview() {
  const { getHint } = window._solver || {};
  // Import dynamically to avoid circular issues — use game's board
  return _getHint(game.board);
}

import { getHint as _getHint } from './solver.js';

function applyHintToGame(hint) {
  if (hint.value !== undefined && hint.cell) {
    game.board[hint.cell.r][hint.cell.c] = hint.value;
    game.notes[hint.cell.r][hint.cell.c] = new Set();
    game._removeNoteFromPeers(hint.cell.r, hint.cell.c, hint.value);
    animatePop(hint.cell.r, hint.cell.c);
  } else if (hint.eliminations) {
    hint.eliminations.forEach(({r,c,remove}) => remove.forEach(n => game.notes[r][c].delete(n)));
  }
  game.hintsUsed++;
  clearHintHighlights();
}

function clearHintHighlights() {
  document.querySelectorAll('.highlight-candidate,.highlight-elim').forEach(el => {
    el.classList.remove('highlight-candidate','highlight-elim');
  });
}

// ── Overlay helpers ───────────────────────────────────────────────────────────
function showOverlay(el) { el.classList.add('active'); }
function hideOverlay(el) { el.classList.remove('active'); }

// ── Completion ────────────────────────────────────────────────────────────────
function showCompletion() {
  saveGame();
  localStorage.removeItem('sudoku-save');
  cTime.textContent = game.formatTime();
  cMistakes.textContent = game.mistakes;
  cHints.textContent = game.hintsUsed;
  cDiff.textContent = capitalise(game.difficulty);
  setTimeout(()=>{
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

// ── Auto-save on unload ───────────────────────────────────────────────────────
window.addEventListener('beforeunload', saveGame);

// ── Start ─────────────────────────────────────────────────────────────────────
init();

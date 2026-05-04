# Sudoku

A full-featured Sudoku game — comparable to sudoku.com — built with vanilla JS + Vite. Zero runtime dependencies.

## ✨ Features

### Gameplay
- **4 difficulties**: Easy, Medium, Hard, Expert
- **Puzzle generation** with unique-solution guarantee (backtracking + uniqueness check)
- **Error detection** — incorrect entries are highlighted in red
- **Mistake counter** (tracks errors per game)

### Controls
- **Number pad** + full **keyboard** support (arrows, 1–9, Delete)
- **Notes / Pencil marks** with auto-removal when a digit is placed
- **Auto Notes** — fills all valid candidates at once
- **Undo / Redo** — full history stack
- **Erase** tool

### Hints & Solver
Full step-by-step hint engine covering:
1. Naked Single
2. Hidden Single
3. Naked Pair
4. Hidden Pair
5. Naked Triple
6. Hidden Triple
7. Pointing Pairs
8. Box/Line Reduction
9. X-Wing
10. Swordfish
11. Y-Wing

Each hint shows the **technique name**, **explanation**, **highlights affected cells** on the board, and lets you **apply** it with one click.

### UX
- **Timer** with pause/resume
- **Completion screen** with time, mistakes, hints used
- **Confetti** animation on completion
- **Auto-save** to localStorage — resume where you left off
- Keyboard navigation (arrow keys)
- Mobile-responsive

---

## 🚀 Deploy to Vercel

### Option A — GitHub → Vercel (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Vercel auto-detects Vite — click **Deploy**
5. Done ✅

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel
```

---

## 🛠 Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## 🏗 Build

```bash
npm run build   # outputs to /dist
npm run preview # preview the build
```

---

## 📁 Project Structure

```
sudoku/
├── index.html          # Entry point
├── src/
│   ├── main.js         # UI controller & event wiring
│   ├── game.js         # Game state (board, timer, undo, notes)
│   ├── solver.js       # All solving techniques + backtracking
│   ├── generator.js    # Puzzle generator & difficulty analyser
│   └── style.css       # Full UI styles
├── package.json
├── vite.config.js
└── vercel.json
```

---

## 🧠 Solving Techniques

| Technique | Difficulty |
|---|---|
| Naked Single | Easy |
| Hidden Single | Easy |
| Naked Pair | Medium |
| Hidden Pair | Medium |
| Pointing Pairs | Medium |
| Box/Line Reduction | Medium |
| Naked Triple | Hard |
| Hidden Triple | Hard |
| X-Wing | Hard |
| Swordfish | Expert |
| Y-Wing | Expert |

Puzzles are graded by which techniques are required to solve them.

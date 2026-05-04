// solver.js — Complete Sudoku solver with all major techniques

export function getCandidates(board, r, c) {
  if (board[r][c] !== 0) return [];
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(board[r][i]);
    used.add(board[i][c]);
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      used.add(board[br + dr][bc + dc]);
  return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(n));
}

export function getAllCandidates(board) {
  const cands = Array.from({length:9}, () => Array.from({length:9}, () => new Set()));
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] === 0)
        getCandidates(board, r, c).forEach(n => cands[r][c].add(n));
  return cands;
}

function cloneBoard(board) {
  return board.map(r => [...r]);
}

// ── Techniques ────────────────────────────────────────────────────────────────

export function nakedSingle(board) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const cands = getCandidates(board, r, c);
      if (cands.length === 1)
        return { type: 'Naked Single', cell: {r, c}, value: cands[0],
          explanation: `Cell (${r+1},${c+1}) has only one possible candidate: ${cands[0]}.` };
    }
  return null;
}

export function hiddenSingle(board) {
  const units = getUnits();
  for (const unit of units) {
    const pos = {};
    for (let n = 1; n <= 9; n++) pos[n] = [];
    for (const [r, c] of unit) {
      if (board[r][c] !== 0) continue;
      getCandidates(board, r, c).forEach(n => pos[n].push([r, c]));
    }
    for (let n = 1; n <= 9; n++) {
      if (pos[n].length === 1) {
        const [r, c] = pos[n][0];
        return { type: 'Hidden Single', cell: {r, c}, value: n,
          explanation: `${n} can only go in one place in this ${unit.label || 'unit'}.` };
      }
    }
  }
  return null;
}

export function nakedPair(board) {
  const units = getUnits();
  for (const unit of units) {
    const cells2 = unit.filter(([r,c]) => board[r][c] === 0 && getCandidates(board,r,c).length === 2);
    for (let i = 0; i < cells2.length; i++) {
      for (let j = i+1; j < cells2.length; j++) {
        const [r1,c1] = cells2[i], [r2,c2] = cells2[j];
        const s1 = getCandidates(board,r1,c1), s2 = getCandidates(board,r2,c2);
        if (s1[0]===s2[0] && s1[1]===s2[1]) {
          const eliminations = [];
          for (const [r,c] of unit) {
            if ((r===r1&&c===c1)||(r===r2&&c===c2)) continue;
            if (board[r][c] !== 0) continue;
            const remove = getCandidates(board,r,c).filter(n => s1.includes(n));
            if (remove.length) eliminations.push({r,c,remove});
          }
          if (eliminations.length)
            return { type:'Naked Pair', cells:[{r:r1,c:c1},{r:r2,c:c2}], pair:s1, eliminations,
              explanation:`Naked Pair ${s1.join(',')} found — remove them from other cells in the unit.` };
        }
      }
    }
  }
  return null;
}

export function nakedTriple(board) {
  const units = getUnits();
  for (const unit of units) {
    const empties = unit.filter(([r,c]) => board[r][c]===0 && getCandidates(board,r,c).length>=2 && getCandidates(board,r,c).length<=3);
    for (let i=0;i<empties.length;i++)
    for (let j=i+1;j<empties.length;j++)
    for (let k=j+1;k<empties.length;k++) {
      const combo = [empties[i],empties[j],empties[k]];
      const union = new Set(combo.flatMap(([r,c])=>getCandidates(board,r,c)));
      if (union.size===3) {
        const digits=[...union];
        const eliminations=[];
        for (const [r,c] of unit) {
          if (combo.some(([r2,c2])=>r===r2&&c===c2)) continue;
          if (board[r][c]!==0) continue;
          const remove=getCandidates(board,r,c).filter(n=>digits.includes(n));
          if (remove.length) eliminations.push({r,c,remove});
        }
        if (eliminations.length)
          return { type:'Naked Triple', cells:combo.map(([r,c])=>({r,c})), triple:digits, eliminations,
            explanation:`Naked Triple {${digits.join(',')}} — eliminate from rest of unit.` };
      }
    }
  }
  return null;
}

export function hiddenPair(board) {
  const units = getUnits();
  const key = ([r,c])=>`${r},${c}`;
  for (const unit of units) {
    const pos={};
    for (let n=1;n<=9;n++) pos[n]=[];
    for (const [r,c] of unit) {
      if (board[r][c]!==0) continue;
      getCandidates(board,r,c).forEach(n=>pos[n].push([r,c]));
    }
    const active=[1,2,3,4,5,6,7,8,9].filter(n=>pos[n].length===2);
    for (let i=0;i<active.length;i++)
    for (let j=i+1;j<active.length;j++) {
      const n1=active[i],n2=active[j];
      const p1=pos[n1],p2=pos[n2];
      if (p1.map(key).join()===p2.map(key).join()) {
        const pairSet=new Set([n1,n2]);
        const eliminations=p1.map(([r,c])=>({r,c,remove:getCandidates(board,r,c).filter(n=>!pairSet.has(n))})).filter(e=>e.remove.length);
        if (eliminations.length)
          return { type:'Hidden Pair', cells:p1.map(([r,c])=>({r,c})), pair:[n1,n2], eliminations,
            explanation:`Hidden Pair {${n1},${n2}} — only these two cells can hold these digits; remove all others from them.` };
      }
    }
  }
  return null;
}

export function hiddenTriple(board) {
  const units = getUnits();
  const key=([r,c])=>`${r},${c}`;
  for (const unit of units) {
    const pos={};
    for (let n=1;n<=9;n++) pos[n]=[];
    for (const [r,c] of unit) {
      if (board[r][c]!==0) continue;
      getCandidates(board,r,c).forEach(n=>pos[n].push([r,c]));
    }
    const active=[1,2,3,4,5,6,7,8,9].filter(n=>pos[n].length>=2&&pos[n].length<=3);
    for (let i=0;i<active.length;i++)
    for (let j=i+1;j<active.length;j++)
    for (let k=j+1;k<active.length;k++) {
      const n1=active[i],n2=active[j],n3=active[k];
      const union=new Set([...pos[n1],...pos[n2],...pos[n3]].map(key));
      if (union.size===3) {
        const tripleSet=new Set([n1,n2,n3]);
        const cells=[...union].map(k=>{const[r,c]=k.split(',').map(Number);return{r,c};});
        const eliminations=cells.map(({r,c})=>({r,c,remove:getCandidates(board,r,c).filter(n=>!tripleSet.has(n))})).filter(e=>e.remove.length);
        if (eliminations.length)
          return { type:'Hidden Triple', cells, triple:[n1,n2,n3], eliminations,
            explanation:`Hidden Triple {${n1},${n2},${n3}} found.` };
      }
    }
  }
  return null;
}

export function pointingPairs(board) {
  for (let br=0;br<3;br++)
  for (let bc=0;bc<3;bc++) {
    const boxCells=[];
    for (let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) boxCells.push([br*3+dr,bc*3+dc]);
    for (let n=1;n<=9;n++) {
      const cells=boxCells.filter(([r,c])=>board[r][c]===0&&getCandidates(board,r,c).includes(n));
      if (cells.length<2) continue;
      // Same row?
      if (cells.every(([r])=>r===cells[0][0])) {
        const row=cells[0][0];
        const eliminations=[];
        for (let c=0;c<9;c++) {
          if (Math.floor(c/3)===bc) continue;
          if (board[row][c]===0&&getCandidates(board,row,c).includes(n))
            eliminations.push({r:row,c,remove:[n]});
        }
        if (eliminations.length)
          return { type:'Pointing Pair', digit:n, cells:cells.map(([r,c])=>({r,c})), eliminations,
            explanation:`${n} in box (${br+1},${bc+1}) is confined to row ${row+1} — eliminate from rest of that row.` };
      }
      // Same col?
      if (cells.every(([,c])=>c===cells[0][1])) {
        const col=cells[0][1];
        const eliminations=[];
        for (let r=0;r<9;r++) {
          if (Math.floor(r/3)===br) continue;
          if (board[r][col]===0&&getCandidates(board,r,col).includes(n))
            eliminations.push({r,c:col,remove:[n]});
        }
        if (eliminations.length)
          return { type:'Pointing Pair', digit:n, cells:cells.map(([r,c])=>({r,c})), eliminations,
            explanation:`${n} in box (${br+1},${bc+1}) is confined to column ${col+1} — eliminate from rest of that column.` };
      }
    }
  }
  return null;
}

export function boxLineReduction(board) {
  for (let n=1;n<=9;n++) {
    // Check rows
    for (let r=0;r<9;r++) {
      const cols=[];
      for (let c=0;c<9;c++) if (board[r][c]===0&&getCandidates(board,r,c).includes(n)) cols.push(c);
      if (cols.length<2||cols.length>3) continue;
      const boxes=new Set(cols.map(c=>Math.floor(c/3)));
      if (boxes.size===1) {
        const bc=[...boxes][0], br=Math.floor(r/3);
        const eliminations=[];
        for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
          const rr=br*3+dr, cc=bc*3+dc;
          if (rr===r) continue;
          if (board[rr][cc]===0&&getCandidates(board,rr,cc).includes(n))
            eliminations.push({r:rr,c:cc,remove:[n]});
        }
        if (eliminations.length)
          return { type:'Box/Line Reduction', digit:n, eliminations,
            explanation:`${n} in row ${r+1} is confined to one box — eliminate from rest of that box.` };
      }
    }
    // Check cols
    for (let c=0;c<9;c++) {
      const rows=[];
      for (let r=0;r<9;r++) if (board[r][c]===0&&getCandidates(board,r,c).includes(n)) rows.push(r);
      if (rows.length<2||rows.length>3) continue;
      const boxes=new Set(rows.map(r=>Math.floor(r/3)));
      if (boxes.size===1) {
        const br=[...boxes][0], bc=Math.floor(c/3);
        const eliminations=[];
        for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
          const rr=br*3+dr, cc=bc*3+dc;
          if (cc===c) continue;
          if (board[rr][cc]===0&&getCandidates(board,rr,cc).includes(n))
            eliminations.push({r:rr,c:cc,remove:[n]});
        }
        if (eliminations.length)
          return { type:'Box/Line Reduction', digit:n, eliminations,
            explanation:`${n} in column ${c+1} is confined to one box — eliminate from rest of that box.` };
      }
    }
  }
  return null;
}

export function xWing(board) {
  for (let n=1;n<=9;n++) {
    // Row-based X-Wing
    const rowPairs=[];
    for (let r=0;r<9;r++) {
      const cols=[];
      for (let c=0;c<9;c++) if (board[r][c]===0&&getCandidates(board,r,c).includes(n)) cols.push(c);
      if (cols.length===2) rowPairs.push({r,cols});
    }
    for (let i=0;i<rowPairs.length;i++)
    for (let j=i+1;j<rowPairs.length;j++) {
      const a=rowPairs[i],b=rowPairs[j];
      if (a.cols[0]===b.cols[0]&&a.cols[1]===b.cols[1]) {
        const eliminations=[];
        for (let r=0;r<9;r++) {
          if (r===a.r||r===b.r) continue;
          for (const c of a.cols)
            if (board[r][c]===0&&getCandidates(board,r,c).includes(n))
              eliminations.push({r,c,remove:[n]});
        }
        if (eliminations.length)
          return { type:'X-Wing', digit:n, eliminations,
            explanation:`X-Wing on ${n} — eliminate ${n} from columns ${a.cols.map(c=>c+1).join(' and ')}.` };
      }
    }
    // Col-based X-Wing
    const colPairs=[];
    for (let c=0;c<9;c++) {
      const rows=[];
      for (let r=0;r<9;r++) if (board[r][c]===0&&getCandidates(board,r,c).includes(n)) rows.push(r);
      if (rows.length===2) colPairs.push({c,rows});
    }
    for (let i=0;i<colPairs.length;i++)
    for (let j=i+1;j<colPairs.length;j++) {
      const a=colPairs[i],b=colPairs[j];
      if (a.rows[0]===b.rows[0]&&a.rows[1]===b.rows[1]) {
        const eliminations=[];
        for (let c=0;c<9;c++) {
          if (c===a.c||c===b.c) continue;
          for (const r of a.rows)
            if (board[r][c]===0&&getCandidates(board,r,c).includes(n))
              eliminations.push({r,c,remove:[n]});
        }
        if (eliminations.length)
          return { type:'X-Wing', digit:n, eliminations,
            explanation:`X-Wing on ${n} — eliminate ${n} from rows ${a.rows.map(r=>r+1).join(' and ')}.` };
      }
    }
  }
  return null;
}

export function swordfish(board) {
  for (let n=1;n<=9;n++) {
    // Row-based Swordfish
    const rowData=[];
    for (let r=0;r<9;r++) {
      const cols=[];
      for (let c=0;c<9;c++) if (board[r][c]===0&&getCandidates(board,r,c).includes(n)) cols.push(c);
      if (cols.length>=2&&cols.length<=3) rowData.push({r,cols});
    }
    for (let i=0;i<rowData.length;i++)
    for (let j=i+1;j<rowData.length;j++)
    for (let k=j+1;k<rowData.length;k++) {
      const union=new Set([...rowData[i].cols,...rowData[j].cols,...rowData[k].cols]);
      if (union.size===3) {
        const cols=[...union];
        const rows=[rowData[i].r,rowData[j].r,rowData[k].r];
        const eliminations=[];
        for (let r=0;r<9;r++) {
          if (rows.includes(r)) continue;
          for (const c of cols)
            if (board[r][c]===0&&getCandidates(board,r,c).includes(n))
              eliminations.push({r,c,remove:[n]});
        }
        if (eliminations.length)
          return { type:'Swordfish', digit:n, eliminations,
            explanation:`Swordfish on ${n} across rows ${rows.map(r=>r+1).join(',')} — eliminate from columns.` };
      }
    }
  }
  return null;
}

export function yWing(board) {
  const empties=[];
  for (let r=0;r<9;r++) for (let c=0;c<9;c++)
    if (board[r][c]===0) { const cands=getCandidates(board,r,c); if (cands.length===2) empties.push({r,c,cands}); }
  
  function sees(r1,c1,r2,c2) {
    return r1===r2||c1===c2||(Math.floor(r1/3)===Math.floor(r2/3)&&Math.floor(c1/3)===Math.floor(c2/3));
  }
  
  for (const pivot of empties) {
    const [A,B]=pivot.cands;
    const wings=empties.filter(w=>w!==pivot&&sees(pivot.r,pivot.c,w.r,w.c));
    const wingA=wings.filter(w=>w.cands.includes(A)&&!w.cands.includes(B));
    const wingB=wings.filter(w=>w.cands.includes(B)&&!w.cands.includes(A));
    for (const wA of wingA) {
      const C=wA.cands.find(n=>n!==A);
      for (const wB of wingB) {
        if (!wB.cands.includes(C)) continue;
        const eliminations=[];
        for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
          if (board[r][c]!==0) continue;
          if ((r===pivot.r&&c===pivot.c)||(r===wA.r&&c===wA.c)||(r===wB.r&&c===wB.c)) continue;
          if (sees(r,c,wA.r,wA.c)&&sees(r,c,wB.r,wB.c)&&getCandidates(board,r,c).includes(C))
            eliminations.push({r,c,remove:[C]});
        }
        if (eliminations.length)
          return { type:'Y-Wing', cells:[{r:pivot.r,c:pivot.c},{r:wA.r,c:wA.c},{r:wB.r,c:wB.c}], digit:C, eliminations,
            explanation:`Y-Wing: pivot (${pivot.r+1},${pivot.c+1}) with wings — eliminate ${C} from seen cells.` };
      }
    }
  }
  return null;
}

// ── Backtracking solver ───────────────────────────────────────────────────────

export function solveFull(board) {
  const b = cloneBoard(board);
  if (_solve(b)) return b;
  return null;
}

function _solve(board) {
  let minLen = 10, bestR = -1, bestC = -1;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const cands = getCandidates(board, r, c);
      if (cands.length === 0) return false;
      if (cands.length < minLen) { minLen = cands.length; bestR = r; bestC = c; }
    }
  }
  if (bestR === -1) return true;
  for (const n of getCandidates(board, bestR, bestC)) {
    board[bestR][bestC] = n;
    if (_solve(board)) return true;
    board[bestR][bestC] = 0;
  }
  return false;
}

export function countSolutions(board, limit=2) {
  const b = cloneBoard(board);
  let count = 0;
  function solve(b) {
    if (count >= limit) return;
    let minLen=10,bestR=-1,bestC=-1;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      if (b[r][c]!==0) continue;
      const cands=getCandidates(b,r,c);
      if (!cands.length) return;
      if (cands.length<minLen){minLen=cands.length;bestR=r;bestC=c;}
    }
    if (bestR===-1){count++;return;}
    for (const n of getCandidates(b,bestR,bestC)) {
      b[bestR][bestC]=n;
      solve(b);
      b[bestR][bestC]=0;
      if (count>=limit) return;
    }
  }
  solve(b);
  return count;
}

// ── Step-by-step hint engine ──────────────────────────────────────────────────

const techniques = [
  nakedSingle, hiddenSingle, nakedPair, hiddenPair,
  nakedTriple, hiddenTriple, pointingPairs, boxLineReduction,
  xWing, swordfish, yWing
];

export function getHint(board) {
  for (const fn of techniques) {
    const result = fn(board);
    if (result) return result;
  }
  return null;
}

export function applyHint(board, hint) {
  const b = cloneBoard(board);
  if (hint.value !== undefined) {
    b[hint.cell.r][hint.cell.c] = hint.value;
  }
  return b;
}

// ── Difficulty analyser ───────────────────────────────────────────────────────

export function analyseDifficulty(board) {
  const b = cloneBoard(board);
  const usedTechniques = new Set();
  let steps = 0;
  while (true) {
    let progress = false;
    for (const fn of techniques) {
      const hint = fn(b);
      if (!hint) continue;
      usedTechniques.add(hint.type);
      if (hint.value !== undefined) {
        b[hint.cell.r][hint.cell.c] = hint.value;
      } else if (hint.eliminations) {
        // apply eliminations — skip for difficulty check (assume we continue)
      }
      progress = true;
      steps++;
      break;
    }
    if (!progress) break;
    if (b.every(row=>row.every(v=>v!==0))) break;
  }
  const hard = ['X-Wing','Swordfish','Y-Wing','Hidden Triple','Naked Triple'];
  const medium = ['Hidden Pair','Naked Pair','Pointing Pair','Box/Line Reduction'];
  if (hard.some(t=>usedTechniques.has(t))) return 'expert';
  if (usedTechniques.has('X-Wing')||usedTechniques.has('Y-Wing')) return 'hard';
  if (medium.some(t=>usedTechniques.has(t))) return steps>30?'hard':'medium';
  return steps>20?'medium':'easy';
}

// ── Units helper ──────────────────────────────────────────────────────────────

function getUnits() {
  const units = [];
  for (let r=0;r<9;r++) { const u=[]; for(let c=0;c<9;c++) u.push([r,c]); u.label=`row ${r+1}`; units.push(u); }
  for (let c=0;c<9;c++) { const u=[]; for(let r=0;r<9;r++) u.push([r,c]); u.label=`column ${c+1}`; units.push(u); }
  for (let br=0;br<3;br++) for(let bc=0;bc<3;bc++) {
    const u=[];
    for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) u.push([br*3+dr,bc*3+dc]);
    u.label=`box (${br+1},${bc+1})`; units.push(u);
  }
  return units;
}

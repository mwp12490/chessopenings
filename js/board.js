// Interactive chess board: builds an 8x8 grid, renders pieces from a chess.js
// instance, and supports click-to-move plus drag-and-drop. The board is purely
// presentational — move legality is validated by the consumer (which owns the
// Chess instance) before calling setPosition().

// Use the filled (black) glyph forms for both colors and tint via CSS, with
// the U+FE0E variation selector to force monochrome text presentation rather
// than emoji on platforms that default chess symbols to colored glyphs.
const PIECE_GLYPHS = {
  wK: "♚︎", wQ: "♛︎", wR: "♜︎",
  wB: "♝︎", wN: "♞︎", wP: "♟︎",
  bK: "♚︎", bQ: "♛︎", bR: "♜︎",
  bB: "♝︎", bN: "♞︎", bP: "♟︎"
};

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

class ChessBoard {
  constructor(rootEl, opts = {}) {
    this.root = rootEl;
    this.onMoveAttempt = opts.onMoveAttempt || (() => false);
    this.draggable = opts.draggable !== false;
    this.orientation = "white";
    this.boardState = null; // 8x8 array from chess.js board()
    this.selected = null;
    this.lastMove = null;
    this.legalSquaresFor = opts.legalSquaresFor || null; // function(square) -> [squares]
    this._isDragging = false;
    this._dragGhost = null;
    this._build();
    this._bindGlobalListeners();
  }

  _build() {
    this.root.innerHTML = "";
    this.squares = {};
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const fileIdx = this.orientation === "white" ? f : 7 - f;
        const rankIdx = this.orientation === "white" ? r : 7 - r;
        const file = FILES[fileIdx];
        const rank = RANKS[rankIdx];
        const square = file + rank;
        const sq = document.createElement("div");
        sq.className = "square " + (((fileIdx + rankIdx) % 2 === 0) ? "light" : "dark");
        sq.dataset.square = square;

        // Coordinate labels on the edges
        if (f === 0) {
          const c = document.createElement("span");
          c.className = "coord rank";
          c.textContent = rank;
          sq.appendChild(c);
        }
        if (r === 7) {
          const c = document.createElement("span");
          c.className = "coord file";
          c.textContent = file;
          sq.appendChild(c);
        }

        sq.addEventListener("click", () => this._onSquareClick(square));
        sq.addEventListener("mousedown", (e) => this._onMouseDown(e, square));
        sq.addEventListener("touchstart", (e) => this._onTouchStart(e, square), { passive: false });

        this.root.appendChild(sq);
        this.squares[square] = sq;
      }
    }

    // Arrow overlay (engine recommendations etc). Sits above the squares,
    // ignores pointer events so clicks/drag pass through to the board.
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.setAttribute("class", "board-arrows");
    svg.setAttribute("preserveAspectRatio", "none");
    this.root.appendChild(svg);
    this._arrowSvg = svg;
  }

  _squareToXY(square) {
    const fileIdx = FILES.indexOf(square[0]);
    const rankIdx = RANKS.indexOf(square[1]);
    if (fileIdx < 0 || rankIdx < 0) return null;
    const f = this.orientation === "white" ? fileIdx : 7 - fileIdx;
    const r = this.orientation === "white" ? rankIdx : 7 - rankIdx;
    return { x: f + 0.5, y: r + 0.5 };
  }

  // Draw a single arrow from `from` square to `to` square. Replaces any
  // existing arrow. Pass null to clear.
  setEngineArrow(from, to) {
    const svg = this._arrowSvg;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!from || !to) return;
    const a = this._squareToXY(from);
    const b = this._squareToXY(to);
    if (!a || !b) return;

    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const ux = dx / len, uy = dy / len;

    // Pull the shaft back from the target so it tucks under the head.
    const headLen = 0.36;
    const headHalfWidth = 0.22;
    const sx = a.x + ux * 0.18, sy = a.y + uy * 0.18; // start a bit out of source center
    const tx = b.x - ux * headLen * 0.55;             // shaft end inside head
    const ty = b.y - uy * headLen * 0.55;
    const headBaseX = b.x - ux * headLen;
    const headBaseY = b.y - uy * headLen;
    const px = -uy, py = ux;
    const t1x = headBaseX + px * headHalfWidth;
    const t1y = headBaseY + py * headHalfWidth;
    const t2x = headBaseX - px * headHalfWidth;
    const t2y = headBaseY - py * headHalfWidth;

    const ns = "http://www.w3.org/2000/svg";
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", sx);
    line.setAttribute("y1", sy);
    line.setAttribute("x2", tx);
    line.setAttribute("y2", ty);
    line.setAttribute("class", "engine-arrow-line");
    svg.appendChild(line);

    const head = document.createElementNS(ns, "polygon");
    head.setAttribute("points", b.x + "," + b.y + " " + t1x + "," + t1y + " " + t2x + "," + t2y);
    head.setAttribute("class", "engine-arrow-head");
    svg.appendChild(head);
  }

  clearEngineArrow() {
    this.setEngineArrow(null, null);
  }

  _bindGlobalListeners() {
    document.addEventListener("mousemove", (e) => this._onMouseMove(e));
    document.addEventListener("mouseup", (e) => this._onMouseUp(e));
    document.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener("touchend", (e) => this._onTouchEnd(e));
    // Cancel a drag on right-click anywhere, and suppress the system menu so
    // it doesn't pop up over the board.
    document.addEventListener("contextmenu", (e) => {
      if (this._isDragging || (this.root && this.root.contains(e.target))) {
        e.preventDefault();
      }
      if (this._isDragging) this._cancelDrag();
    });
  }

  setOrientation(o) {
    this.orientation = o;
    this._build();
    if (this.boardState) this._render();
  }

  flip() {
    this.setOrientation(this.orientation === "white" ? "black" : "white");
  }

  // boardState is 2D array from chess.js: rows[0] = rank 8, rows[7] = rank 1.
  setPosition(boardState, lastMove) {
    this.boardState = boardState;
    this.lastMove = lastMove || null;
    this.selected = null;
    this.clearEngineArrow();
    this._render();
  }

  _pieceAt(square) {
    if (!this.boardState) return null;
    const fileIdx = FILES.indexOf(square[0]);
    const rankIdx = RANKS.indexOf(square[1]); // RANKS[0]="8" → row 0 in chess.js board()
    if (fileIdx < 0 || rankIdx < 0) return null;
    const row = this.boardState[rankIdx];
    if (!row) return null;
    return row[fileIdx] || null;
  }

  _render() {
    // Clear pieces and highlights
    for (const sq of Object.values(this.squares)) {
      sq.classList.remove("selected", "last-from", "last-to", "legal", "legal-capture", "hint");
      const existing = sq.querySelector(".piece");
      if (existing) existing.remove();
    }
    if (!this.boardState) return;

    // Place pieces
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = this.boardState[r][f];
        if (!cell) continue;
        const square = FILES[f] + RANKS[r];
        const sq = this.squares[square];
        if (!sq) continue;
        const piece = document.createElement("div");
        const code = (cell.color === "w" ? "w" : "b") + cell.type.toUpperCase();
        piece.className = "piece " + (cell.color === "w" ? "white" : "black");
        piece.dataset.piece = code;
        piece.textContent = PIECE_GLYPHS[code];
        sq.appendChild(piece);
      }
    }

    // Last move highlight
    if (this.lastMove) {
      if (this.squares[this.lastMove.from]) this.squares[this.lastMove.from].classList.add("last-from");
      if (this.squares[this.lastMove.to]) this.squares[this.lastMove.to].classList.add("last-to");
    }
  }

  _highlightLegal(from) {
    if (!this.legalSquaresFor) return;
    const targets = this.legalSquaresFor(from) || [];
    for (const t of targets) {
      const sq = this.squares[t];
      if (!sq) continue;
      const occupied = this._pieceAt(t);
      sq.classList.add(occupied ? "legal-capture" : "legal");
    }
  }

  _clearLegal() {
    for (const sq of Object.values(this.squares)) {
      sq.classList.remove("legal", "legal-capture", "selected");
    }
  }

  _onSquareClick(square) {
    if (this._isDragging) return;
    if (this.selected) {
      if (this.selected === square) {
        this.selected = null;
        this._clearLegal();
        return;
      }
      const accepted = this.onMoveAttempt({ from: this.selected, to: square });
      this.selected = null;
      this._clearLegal();
      if (!accepted) {
        // If clicked on own piece, switch selection
        const piece = this._pieceAt(square);
        if (piece) this._select(square);
      }
    } else {
      const piece = this._pieceAt(square);
      if (piece) this._select(square);
    }
  }

  _select(square) {
    this.selected = square;
    this._clearLegal();
    if (this.squares[square]) this.squares[square].classList.add("selected");
    this._highlightLegal(square);
  }

  _onMouseDown(e, square) {
    if (!this.draggable) return;
    // Right- or middle-click while dragging cancels the drag (piece returns
    // to its source square instead of dropping at the cursor).
    if (e.button !== 0) {
      if (this._isDragging) {
        e.preventDefault();
        this._cancelDrag();
      }
      return;
    }
    const piece = this._pieceAt(square);
    if (!piece) return;
    e.preventDefault();
    this._startDrag(e.clientX, e.clientY, square);
  }

  _onTouchStart(e, square) {
    if (!this.draggable) return;
    const piece = this._pieceAt(square);
    if (!piece) return;
    e.preventDefault();
    const t = e.touches[0];
    this._startDrag(t.clientX, t.clientY, square);
  }

  _startDrag(x, y, square) {
    this._isDragging = true;
    this._dragFrom = square;
    this._select(square);
    const sq = this.squares[square];
    const piece = sq.querySelector(".piece");
    if (piece) piece.classList.add("dragging");
    // Build ghost element
    const ghost = document.createElement("div");
    ghost.className = "piece ghost " + (piece ? piece.className.split(" ").slice(1).join(" ") : "");
    ghost.style.position = "fixed";
    ghost.style.fontSize = (sq.clientWidth * 0.8) + "px";
    ghost.style.left = x + "px";
    ghost.style.top = y + "px";
    ghost.textContent = piece ? piece.textContent : "";
    document.body.appendChild(ghost);
    this._dragGhost = ghost;
  }

  _onMouseMove(e) {
    if (!this._isDragging) return;
    if (this._dragGhost) {
      this._dragGhost.style.left = e.clientX + "px";
      this._dragGhost.style.top = e.clientY + "px";
    }
  }

  _onTouchMove(e) {
    if (!this._isDragging) return;
    e.preventDefault();
    const t = e.touches[0];
    if (this._dragGhost) {
      this._dragGhost.style.left = t.clientX + "px";
      this._dragGhost.style.top = t.clientY + "px";
    }
  }

  _onMouseUp(e) {
    if (!this._isDragging) return;
    // Only the left button release should commit the drop; right/middle
    // releases are ignored (they shouldn't produce a move).
    if (e.button !== 0) return;
    this._endDrag(e.clientX, e.clientY);
  }

  _onTouchEnd(e) {
    if (!this._isDragging) return;
    const t = e.changedTouches[0];
    this._endDrag(t.clientX, t.clientY);
  }

  _endDrag(x, y) {
    this._isDragging = false;
    if (this._dragGhost) { this._dragGhost.remove(); this._dragGhost = null; }
    // Find target square via element under pointer
    let target = document.elementFromPoint(x, y);
    while (target && !target.dataset.square) target = target.parentElement;
    const from = this._dragFrom;
    this._dragFrom = null;
    const piece = this.squares[from] && this.squares[from].querySelector(".piece");
    if (piece) piece.classList.remove("dragging");
    this._clearLegal();
    this.selected = null;
    if (target && target.dataset.square && target.dataset.square !== from) {
      const accepted = this.onMoveAttempt({ from, to: target.dataset.square });
      if (!accepted) this._render();
    }
  }

  // Aborts an in-progress drag without attempting a move. Piece visually
  // returns to where it started.
  _cancelDrag() {
    this._isDragging = false;
    if (this._dragGhost) { this._dragGhost.remove(); this._dragGhost = null; }
    const from = this._dragFrom;
    this._dragFrom = null;
    const piece = this.squares[from] && this.squares[from].querySelector(".piece");
    if (piece) piece.classList.remove("dragging");
    this._clearLegal();
    this.selected = null;
    this._render();
  }

  showHint(square) {
    const sq = this.squares[square];
    if (sq) sq.classList.add("hint");
    setTimeout(() => { if (sq) sq.classList.remove("hint"); }, 1500);
  }
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const EMPTY = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const startBtn = document.getElementById('startBtn');

const PIECES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: '#38bdf8',
  O: '#facc15',
  T: '#c084fc',
  S: '#4ade80',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c',
};

let board;
let currentPiece;
let nextPiece;
let score;
let lines;
let level;
let dropInterval;
let lastTime;
let dropCounter;
let isGameOver;
let animationId;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const types = Object.keys(PIECES);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: cloneMatrix(PIECES[type]),
    x: Math.floor((COLS - PIECES[type][0].length) / 2),
    y: 0,
  };
}

function resetGame() {
  board = createBoard();
  currentPiece = randomPiece();
  nextPiece = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 750;
  lastTime = 0;
  dropCounter = 0;
  isGameOver = false;
  updateHud();
  drawBoard();
  drawNext();
}

function updateHud() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;

      const nextX = piece.x + x + offsetX;
      const nextY = piece.y + y + offsetY;

      if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (nextY >= 0 && board[nextY][nextX]) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = currentPiece.y + y;
      const boardX = currentPiece.x + x;
      if (boardY >= 0) {
        board[boardY][boardX] = currentPiece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(EMPTY));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 750 - (level - 1) * 60);
    updateHud();
  }
}

function spawnPiece() {
  currentPiece = nextPiece;
  currentPiece.x = Math.floor((COLS - currentPiece.matrix[0].length) / 2);
  currentPiece.y = 0;
  nextPiece = randomPiece();

  if (collides(currentPiece)) {
    isGameOver = true;
  }

  drawNext();
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function rotatePiece() {
  if (isGameOver) return;

  const rotated = rotateMatrix(currentPiece.matrix);
  const originalX = currentPiece.x;
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    currentPiece.x = originalX + kick;
    if (!collides(currentPiece, 0, 0, rotated)) {
      currentPiece.matrix = rotated;
      return;
    }
  }

  currentPiece.x = originalX;
}

function movePiece(dx, dy) {
  if (isGameOver) return false;

  if (!collides(currentPiece, dx, dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }

  if (dy > 0) {
    mergePiece();
    clearLines();
    spawnPiece();
    return false;
  }

  return false;
}

function hardDrop() {
  if (isGameOver) return;

  while (movePiece(0, 1)) {
    score += 2;
  }
  updateHud();
}

function drawCell(x, y, type, context = ctx, size = BLOCK) {
  if (!type) return;

  context.fillStyle = COLORS[type];
  context.fillRect(x * size, y * size, size, size);

  context.strokeStyle = 'rgba(255,255,255,0.25)';
  context.lineWidth = 1;
  context.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell) {
        drawCell(x, y, cell, ctx, BLOCK);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
    }
  }

  if (currentPiece) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawCell(currentPiece.x + x, currentPiece.y + y, currentPiece.type, ctx, BLOCK);
        }
      });
    });
  }

  if (isGameOver) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = '#0b1220';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const previewSize = 24;
  const matrix = nextPiece.matrix;
  const offsetX = Math.floor((nextCanvas.width - matrix[0].length * previewSize) / 2);
  const offsetY = Math.floor((nextCanvas.height - matrix.length * previewSize) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        nextCtx.fillStyle = COLORS[nextPiece.type];
        nextCtx.fillRect(offsetX + x * previewSize, offsetY + y * previewSize, previewSize, previewSize);
        nextCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        nextCtx.strokeRect(offsetX + x * previewSize + 0.5, offsetY + y * previewSize + 0.5, previewSize - 1, previewSize - 1);
      }
    });
  });
}

function tick(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (!isGameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      movePiece(0, 1);
      dropCounter = 0;
    }
  }

  drawBoard();
  animationId = requestAnimationFrame(tick);
}

function handleKeydown(event) {
  if (isGameOver && event.key !== 'Enter') return;

  switch (event.key) {
    case 'ArrowLeft':
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      if (movePiece(0, 1)) {
        score += 1;
        updateHud();
      }
      break;
    case 'ArrowUp':
      rotatePiece();
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
    case 'Enter':
      if (isGameOver) startGame();
      break;
    default:
      break;
  }

  drawBoard();
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  resetGame();
  lastTime = 0;
  animationId = requestAnimationFrame(tick);
}

startBtn.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeydown);

resetGame();

actionText = 'Press Start';

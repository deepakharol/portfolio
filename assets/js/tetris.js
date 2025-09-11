// Tetris Game Implementation
class TetrisGame {
    constructor(canvasId, nextCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.nextCanvas = document.getElementById(nextCanvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Game dimensions
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 30;
        
        // Game state
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropTimer = 0;
        this.dropInterval = 1000; // Start with 1 second
        
        // Tetris pieces (Tetrominos)
        this.pieces = {
            I: { blocks: [[1,1,1,1]], color: '#00f0f0' },
            O: { blocks: [[1,1],[1,1]], color: '#f0f000' },
            T: { blocks: [[0,1,0],[1,1,1]], color: '#a000f0' },
            S: { blocks: [[0,1,1],[1,1,0]], color: '#00f000' },
            Z: { blocks: [[1,1,0],[0,1,1]], color: '#f00000' },
            J: { blocks: [[1,0,0],[1,1,1]], color: '#0000f0' },
            L: { blocks: [[0,0,1],[1,1,1]], color: '#f0a000' }
        };
        
        this.init();
    }
    
    init() {
        // Initialize empty board
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = 0;
            }
        }
        
        // Set up event listeners
        this.setupControls();
        
        // Start the game
        this.reset();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameOver && !this.paused) {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.movePiece(-1, 0);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.movePiece(1, 0);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.dropPiece();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.rotatePiece();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.hardDrop();
                        break;
                }
            }
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.togglePause();
            }
        });
    }
    
    reset() {
        // Clear board
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = 0;
            }
        }
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropInterval = 1000;
        
        this.updateScore();
        this.spawnPiece();
        this.nextPiece = this.getRandomPiece();
        this.drawNextPiece();
    }
    
    getRandomPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        const piece = this.pieces[randomType];
        
        return {
            type: randomType,
            blocks: JSON.parse(JSON.stringify(piece.blocks)), // Deep copy
            color: piece.color,
            x: Math.floor((this.cols - piece.blocks[0].length) / 2),
            y: 0
        };
    }
    
    spawnPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.getRandomPiece();
        } else {
            this.currentPiece = this.getRandomPiece();
            this.nextPiece = this.getRandomPiece();
        }
        
        this.drawNextPiece();
        
        // Check if the new piece collides immediately (game over)
        if (this.checkCollision(this.currentPiece)) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    checkCollision(piece, offsetX = 0, offsetY = 0) {
        for (let row = 0; row < piece.blocks.length; row++) {
            for (let col = 0; col < piece.blocks[row].length; col++) {
                if (piece.blocks[row][col]) {
                    const newX = piece.x + col + offsetX;
                    const newY = piece.y + row + offsetY;
                    
                    if (newX < 0 || newX >= this.cols || 
                        newY >= this.rows ||
                        (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    movePiece(dx, dy) {
        if (!this.checkCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }
    
    rotatePiece() {
        const rotated = this.rotate(this.currentPiece.blocks);
        const oldBlocks = this.currentPiece.blocks;
        this.currentPiece.blocks = rotated;
        
        // Try to fit the rotated piece
        if (this.checkCollision(this.currentPiece)) {
            // Try wall kicks
            if (!this.checkCollision(this.currentPiece, -1, 0)) {
                this.currentPiece.x -= 1;
            } else if (!this.checkCollision(this.currentPiece, 1, 0)) {
                this.currentPiece.x += 1;
            } else if (!this.checkCollision(this.currentPiece, -2, 0)) {
                this.currentPiece.x -= 2;
            } else if (!this.checkCollision(this.currentPiece, 2, 0)) {
                this.currentPiece.x += 2;
            } else {
                // Can't rotate
                this.currentPiece.blocks = oldBlocks;
            }
        }
    }
    
    rotate(blocks) {
        const rows = blocks.length;
        const cols = blocks[0].length;
        const rotated = [];
        
        for (let col = 0; col < cols; col++) {
            rotated[col] = [];
            for (let row = rows - 1; row >= 0; row--) {
                rotated[col][rows - 1 - row] = blocks[row][col];
            }
        }
        
        return rotated;
    }
    
    dropPiece() {
        if (!this.movePiece(0, 1)) {
            this.lockPiece();
        }
    }
    
    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2;
        }
        this.lockPiece();
        this.updateScore();
    }
    
    lockPiece() {
        // Add piece to board
        for (let row = 0; row < this.currentPiece.blocks.length; row++) {
            for (let col = 0; col < this.currentPiece.blocks[row].length; col++) {
                if (this.currentPiece.blocks[row][col]) {
                    const boardY = this.currentPiece.y + row;
                    const boardX = this.currentPiece.x + col;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        // Check for completed lines
        this.clearLines();
        
        // Spawn new piece
        this.spawnPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                // Remove the completed line
                this.board.splice(row, 1);
                // Add empty line at top
                this.board.unshift(new Array(this.cols).fill(0));
                linesCleared++;
                row++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            // Scoring: 100 * level for 1 line, more for multiple lines
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[linesCleared] * this.level;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            }
            
            this.updateScore();
        }
    }
    
    update(deltaTime) {
        if (this.gameOver || this.paused) return;
        
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropInterval) {
            this.dropPiece();
            this.dropTimer = 0;
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board grid
        this.ctx.strokeStyle = '#16213e';
        this.ctx.lineWidth = 0.5;
        for (let row = 0; row <= this.rows; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.blockSize);
            this.ctx.lineTo(this.cols * this.blockSize, row * this.blockSize);
            this.ctx.stroke();
        }
        for (let col = 0; col <= this.cols; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.blockSize, 0);
            this.ctx.lineTo(col * this.blockSize, this.rows * this.blockSize);
            this.ctx.stroke();
        }
        
        // Draw locked pieces
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.blocks.length; row++) {
                for (let col = 0; col < this.currentPiece.blocks[row].length; col++) {
                    if (this.currentPiece.blocks[row][col]) {
                        this.drawBlock(
                            this.currentPiece.x + col,
                            this.currentPiece.y + row,
                            this.currentPiece.color
                        );
                    }
                }
            }
        }
        
        // Draw pause overlay
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize + 1,
            y * this.blockSize + 1,
            this.blockSize - 2,
            this.blockSize - 2
        );
        
        // Add highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(
            x * this.blockSize + 1,
            y * this.blockSize + 1,
            this.blockSize - 2,
            4
        );
    }
    
    drawNextPiece() {
        // Clear next piece canvas
        this.nextCtx.fillStyle = '#f3f4f6';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!this.nextPiece) return;
        
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.blocks[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.blocks.length * blockSize) / 2;
        
        for (let row = 0; row < this.nextPiece.blocks.length; row++) {
            for (let col = 0; col < this.nextPiece.blocks[row].length; col++) {
                if (this.nextPiece.blocks[row][col]) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(
                        offsetX + col * blockSize + 1,
                        offsetY + row * blockSize + 1,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            }
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
    
    showGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
    }
}

// Global game instance
let tetrisGame = null;
let animationId = null;
let lastTime = 0;

function gameLoop(currentTime) {
    if (!tetrisGame) return;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    tetrisGame.update(deltaTime);
    tetrisGame.draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

function startTetris() {
    if (!tetrisGame) {
        tetrisGame = new TetrisGame('tetrisCanvas', 'nextCanvas');
    } else {
        tetrisGame.reset();
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

function pauseTetris() {
    if (tetrisGame) {
        tetrisGame.togglePause();
    }
}

function resetTetris() {
    if (tetrisGame) {
        tetrisGame.reset();
    }
}

function openTetrisModal() {
    const modal = document.getElementById('tetrisModal');
    modal.style.display = 'block';
    startTetris();
}

function closeTetrisModal() {
    const modal = document.getElementById('tetrisModal');
    modal.style.display = 'none';
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Export functions to global scope
window.startTetris = startTetris;
window.pauseTetris = pauseTetris;
window.resetTetris = resetTetris;
window.openTetrisModal = openTetrisModal;
window.closeTetrisModal = closeTetrisModal;

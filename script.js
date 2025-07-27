class SudokuSolver {
    constructor(gridContainerId, controls) {
        this.gridContainer = document.getElementById(gridContainerId);
        this.controls = controls;
        this.messageBar = document.getElementById('message-bar');
        
        this.boardSize = 9;
        this.emptyValue = 0;
        
        this.initialBoard = [];
        this.solvedBoard = [];
        
        this.isSolving = false; 
        this.animationRequest = null; 

        this.DIFFICULTY = {
            easy: 45,
            medium: 38,
            hard: 31,
            expert: 24
        };
        
        this._createGrid();
        this._setupEventListeners();
        this.generateNewPuzzle();
    }

    _createGrid() {
        this.gridContainer.innerHTML = '';
        for (let i = 0; i < this.boardSize * this.boardSize; i++) {
            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 1;
            cell.classList.add('sudoku-cell');
            cell.dataset.index = i;
            this.gridContainer.appendChild(cell);
        }
    }
    
    _setupEventListeners() {
        this.controls.generateBtn.addEventListener('click', () => this.generateNewPuzzle());
        this.controls.solveBtn.addEventListener('click', () => this.solvePuzzleAnimated());
        this.controls.giveUpBtn.addEventListener('click', () => this.giveUp());
        this.controls.validateBtn.addEventListener('click', () => this.validateUserSolution());
        this.controls.hintBtn.addEventListener('click', () => this.provideHint());
        this.controls.clearBtn.addEventListener('click', () => this.clearUserInputs());
        
        this.gridContainer.addEventListener('input', (e) => this._handleCellInput(e));
        this.gridContainer.addEventListener('focusin', (e) => this._highlightRelatedCells(e));
        this.gridContainer.addEventListener('focusout', () => this._clearHighlights());
    }
    
    _stopSolver() {
        if (this.isSolving) {
            this.isSolving = false;
            if (this.animationRequest) {
                cancelAnimationFrame(this.animationRequest);
                this.animationRequest = null;
            }
            this.showMessage('Solver stopped.', 'info');
        }
    }
    
    generateNewPuzzle() {
        this._stopSolver(); 
        this.showMessage('Generating a new puzzle...', 'info');
        
        let board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(this.emptyValue));
        this._solveRecursive(board);
        this.solvedBoard = JSON.parse(JSON.stringify(board));

        const difficulty = this.controls.difficultySelect.value;
        let attempts = this.boardSize * this.boardSize - this.DIFFICULTY[difficulty];
        
        while (attempts > 0) {
            let row = Math.floor(Math.random() * this.boardSize);
            let col = Math.floor(Math.random() * this.boardSize);

            if (board[row][col] !== this.emptyValue) {
                let temp = board[row][col];
                board[row][col] = this.emptyValue;

                let solutionCount = 0;
                let boardCopy = JSON.parse(JSON.stringify(board));
                this._countSolutions(boardCopy, () => solutionCount++);
                
                if (solutionCount !== 1) {
                    board[row][col] = temp;
                } else {
                    attempts--;
                }
            }
        }
        
        this.initialBoard = JSON.parse(JSON.stringify(board));
        this._setBoardOnDOM(this.initialBoard);
        this.showMessage('New puzzle generated. Good luck!', 'success');
    }
    
    _isValid(board, row, col, num) {
        for (let i = 0; i < this.boardSize; i++) {
            if (board[row][i] === num || board[i][col] === num) return false;
        }
        const boxRowStart = row - row % 3;
        const boxColStart = col - col % 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[boxRowStart + r][boxColStart + c] === num) return false;
            }
        }
        return true;
    }

    _solveRecursive(board) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === this.emptyValue) {
                    const numbers = this._shuffleArray([...Array(10).keys()].slice(1));
                    for (let num of numbers) {
                        if (this._isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (this._solveRecursive(board)) return true;
                            board[row][col] = this.emptyValue;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    _countSolutions(board, counter) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this._isValid(board, row, col, num)) {
                            board[row][col] = num;
                            this._countSolutions(board, counter);
                        }
                    }
                    board[row][col] = 0;
                    return;
                }
            }
        }
        counter();
    }
    
    solvePuzzleAnimated() {
        this._stopSolver(); 
        
        const userBoard = this._getBoardFromDOM();
        if (JSON.stringify(userBoard) === JSON.stringify(this.solvedBoard)) {
            this.showMessage('Puzzle is already solved!', 'success');
            return;
        }

        this.isSolving = true;
        this.showMessage('Solving the puzzle...', 'info');
        const board = this._getBoardFromDOM();

        const steps = [];
        this._solveAndRecordSteps(board, steps);

        this._animateSteps(steps);
    }

    giveUp() {
        this._stopSolver();
        this._setBoardOnDOM(this.solvedBoard, { isGivingUp: true });
        this.showMessage('Puzzle revealed!', 'success');
    }

    _solveAndRecordSteps(board, steps) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === this.emptyValue) {
                    for (let num = 1; num <= this.boardSize; num++) {
                        if (this._isValid(board, row, col, num)) {
                            board[row][col] = num;
                            steps.push({ row, col, num, type: 'place' });

                            if (this._solveAndRecordSteps(board, steps)) {
                                return true;
                            }
                            
                            board[row][col] = this.emptyValue;
                            steps.push({ row, col, num: '', type: 'backtrack' });
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    _animateSteps(steps) {
        if (!this.isSolving || steps.length === 0) {
            this.isSolving = false;
            this.showMessage('Puzzle solved!', 'success');
            return;
        }

        const step = steps.shift();
        const cell = this.gridContainer.children[step.row * this.boardSize + step.col];
        cell.value = step.num;
        
        cell.classList.remove('placed', 'backtracked');
        void cell.offsetWidth; 
        cell.classList.add(step.type === 'place' ? 'placed' : 'backtracked');

        this.animationRequest = requestAnimationFrame(() => this._animateSteps(steps));
    }
    
    validateUserSolution() {
        if (this.isSolving) return;
        
        const userBoard = this._getBoardFromDOM();
        let errors = 0;
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const cellValue = userBoard[r][c];
                if (cellValue !== this.emptyValue) {
                    if (cellValue !== this.solvedBoard[r][c]) {
                        const cell = this.gridContainer.children[r * this.boardSize + c];
                        cell.classList.add('error');
                        setTimeout(() => cell.classList.remove('error'), 1000);
                        errors++;
                    }
                }
            }
        }
        if(errors > 0) {
            this.showMessage(`Found ${errors} incorrect numbers. Keep trying!`, 'error');
        } else {
             this.showMessage('So far, so good! No errors found.', 'success');
        }
    }
    
    provideHint() {
        if (this.isSolving) return;
        
        const userBoard = this._getBoardFromDOM();
        const emptyCells = [];
        for(let r=0; r<this.boardSize; r++){
            for(let c=0; c<this.boardSize; c++){
                if(userBoard[r][c] === this.emptyValue){
                    emptyCells.push({r, c});
                }
            }
        }
        
        if (emptyCells.length === 0) {
            this.showMessage('The board is already full!', 'info');
            return;
        }

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { r, c } = randomCell;
        const correctValue = this.solvedBoard[r][c];
        
        const cell = this.gridContainer.children[r * this.boardSize + c];
        cell.value = correctValue;
        cell.classList.add('hinted');
        setTimeout(() => cell.classList.remove('hinted'), 1000);
        this.showMessage('Here is a hint for you!', 'info');
    }
    
    clearUserInputs() {
        this._stopSolver();
        this._setBoardOnDOM(this.initialBoard);
        this.showMessage('Board cleared to initial state.', 'info');
    }

    _handleCellInput(e) {
        if (this.isSolving) return;
        const target = e.target;
        const value = target.value;
        if (!/^[1-9]$/.test(value)) {
            target.value = '';
        }
    }
    
    _highlightRelatedCells(e) {
        if (this.isSolving) return;
        this._clearHighlights();
        const index = parseInt(e.target.dataset.index);
        const row = Math.floor(index / this.boardSize);
        const col = index % this.boardSize;

        const cells = this.gridContainer.children;
        for(let i=0; i<this.boardSize; i++){
            cells[row * this.boardSize + i].classList.add('highlight');
            cells[i * this.boardSize + col].classList.add('highlight');
        }
        
        const boxRowStart = row - row % 3;
        const boxColStart = col - col % 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                 cells[(boxRowStart + r) * this.boardSize + (boxColStart + c)].classList.add('highlight');
            }
        }
    }
    
    _clearHighlights() {
        const cells = this.gridContainer.querySelectorAll('.sudoku-cell');
        cells.forEach(c => c.classList.remove('highlight'));
    }

    _getBoardFromDOM() {
        const board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(this.emptyValue));
        const cells = this.gridContainer.querySelectorAll('.sudoku-cell');
        cells.forEach((cell, i) => {
            const row = Math.floor(i / this.boardSize);
            const col = i % this.boardSize;
            const value = parseInt(cell.value, 10);
            board[row][col] = isNaN(value) ? this.emptyValue : value;
        });
        return board;
    }

    _setBoardOnDOM(board, options = {}) {
        const cells = this.gridContainer.querySelectorAll('.sudoku-cell');
        cells.forEach((cell, i) => {
            const row = Math.floor(i / this.boardSize);
            const col = i % this.boardSize;
            const value = board[row][col];

            cell.value = value === this.emptyValue ? '' : value;
            cell.classList.remove('fixed', 'hinted', 'error', 'placed');
            cell.readOnly = false;
            
            if (options.isGivingUp && value !== this.emptyValue) {
                cell.classList.add('fixed');
                cell.readOnly = true;
            } 
            else if (this.initialBoard[row][col] !== this.emptyValue) {
                cell.classList.add('fixed');
                cell.readOnly = true;
            }
        });
    }
    
    showMessage(text, type = 'info') {
        this.messageBar.textContent = text;
        this.messageBar.className = 'message-bar';
        if (type) {
            this.messageBar.classList.add(type);
        }
    }
    
    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const controls = {
        generateBtn: document.getElementById('generate-btn'),
        solveBtn: document.getElementById('solve-btn'),
        giveUpBtn: document.getElementById('give-up-btn'),
        validateBtn: document.getElementById('validate-btn'),
        hintBtn: document.getElementById('hint-btn'),
        clearBtn: document.getElementById('clear-btn'),
        difficultySelect: document.getElementById('difficulty-select'),
    };
    new SudokuSolver('sudoku-grid-container', controls);
});
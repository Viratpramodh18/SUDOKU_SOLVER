const boardSize = 9;
const emptyValue = 0;

/**
 * Main message handler for the worker.
 * Receives a difficulty level and generates a new puzzle.
 */
self.onmessage = function(e) {
    const { difficulty } = e.data;
    const DIFFICULTY_LEVELS = { easy: 45, medium: 38, hard: 31, expert: 24 };
    const cluesToLeave = DIFFICULTY_LEVELS[difficulty] || 38; // Default to medium

    // 1. Generate a fully solved board.
    let board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(emptyValue));
    solve(board);
    const solvedBoard = JSON.parse(JSON.stringify(board));

    // 2. Create a shuffled list of all 81 cell positions.
    const positions = [];
    for (let i = 0; i < boardSize * boardSize; i++) {
        positions.push(i);
    }
    shuffleArray(positions);

    // 3. Dig holes from the solved board until the desired number of clues is left,
    // ensuring the puzzle remains unique at each step.
    let cellsToRemove = boardSize * boardSize - cluesToLeave;
    let cellsRemoved = 0;

    for (const pos of positions) {
        if (cellsRemoved >= cellsToRemove) {
            break; // Stop when we've removed enough cells.
        }

        const row = Math.floor(pos / boardSize);
        const col = pos % boardSize;

        const temp = board[row][col];
        board[row][col] = emptyValue;

        // Make a copy to test for uniqueness.
        const boardCopy = JSON.parse(JSON.stringify(board));
        const solutionCount = countSolutions(boardCopy);
        
        // If the puzzle is no longer unique, revert the change.
        if (solutionCount !== 1) {
            board[row][col] = temp;
        } else {
            cellsRemoved++;
        }
    }

    const initialBoard = board;
    self.postMessage({ initialBoard, solvedBoard });
};


/**
 * Efficiently counts the number of solutions for a given board.
 * Stops as soon as it finds more than one solution.
 * @param {number[][]} board - The Sudoku board.
 * @returns {number} The number of solutions found (0, 1, or 2 if it finds more than one).
 */
function countSolutions(board) {
    let count = 0;
    
    function search() {
        let row = -1, col = -1;
        // Find the first empty cell.
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === emptyValue) {
                    row = r;
                    col = c;
                    break;
                }
            }
            if (row !== -1) break;
        }

        // If no empty cell is found, we have a complete solution.
        if (row === -1) {
            count++;
            return;
        }

        // Try numbers 1-9 in the empty cell.
        for (let num = 1; num <= 9 && count < 2; num++) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                search();
            }
        }
        
        // Backtrack to explore other possibilities.
        board[row][col] = emptyValue;
    }

    search();
    return count;
}


// --- Core Helper Functions (Unchanged) ---

function isValid(board, row, col, num) {
    for (let i = 0; i < boardSize; i++) {
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

function solve(board) {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === emptyValue) {
                const numbers = shuffleArray([...Array(10).keys()].slice(1));
                for (let num of numbers) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solve(board)) return true;
                        board[row][col] = emptyValue;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
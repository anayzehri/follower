let canvas;
let ctx;
let dot = { x: 0, y: 0, size: 10, color: 'blue' };
let gazeHistory = [];
const gazeHistoryLength = 5; // Average gaze over this many frames
let fixationThreshold = 1000; // milliseconds
let fixationStartTime = null;
let score = 0;
let gameOver = false;
let calibrationPoints = [];
let calibrationIndex = 0;
const numCalibrationPoints = 5;

document.addEventListener('DOMContentLoaded', () => {
    const calibrationContainer = document.getElementById('calibration-container');
    const gameContainer = document.getElementById('game-container');
    const gameOverScreen = document.getElementById('game-over');
    const startCalibrationButton = document.getElementById('start-calibration');
    const calibrationPointsContainer = document.getElementById('calibration-points');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Initialize calibration points
    for (let i = 0; i < numCalibrationPoints; i++) {
        const point = document.createElement('div');
        point.classList.add('calibration-point');
        calibrationPointsContainer.appendChild(point);
        calibrationPoints.push(point);
    }

    startCalibrationButton.addEventListener('click', () => {
        startCalibration();
    });

    restartButton.addEventListener('click', () => {
        resetGame();
        calibrationContainer.style.display = 'flex';
        gameContainer.style.display = 'none';
        gameOverScreen.style.display = 'none';
        startCalibration();
    });

    function startCalibration() {
        calibrationContainer.style.display = 'flex';
        gameContainer.style.display = 'none';
        gameOverScreen.style.display = 'none';

        webgazer.setGazeListener(function(data, elapsedTime) {
            if (data == null) {
                return;
            }
            const x = data.x;
            const y = data.y;

            const currentPoint = calibrationPoints[calibrationIndex];
            if (currentPoint) {
                const rect = currentPoint.getBoundingClientRect();
                const pointCenterX = rect.left + rect.width / 2;
                const pointCenterY = rect.top + rect.height / 2;

                const distance = Math.sqrt(Math.pow(x - pointCenterX, 2) + Math.pow(y - pointCenterY, 2));

                if (distance < 50) { // Consider it looked at if within 50 pixels
                    currentPoint.style.backgroundColor = 'green';
                    setTimeout(() => {
                        calibrationIndex++;
                        if (calibrationIndex < numCalibrationPoints) {
                            positionCalibrationPoint();
                        } else {
                            webgazer.pause();
                            calibrationContainer.style.display = 'none';
                            gameContainer.style.display = 'flex';
                            startGame();
                        }
                    }, 500);
                }
            }
        }).begin();

        positionCalibrationPoint();
    }

    function positionCalibrationPoint() {
        if (calibrationIndex < numCalibrationPoints) {
            const point = calibrationPoints[calibrationIndex];
            const containerRect = calibrationPointsContainer.getBoundingClientRect();
            const x = Math.random() * (containerRect.width - 20) + 10;
            const y = Math.random() * (containerRect.height - 20) + 10;
            point.style.left = `${x}px`;
            point.style.top = `${y}px`;
            point.style.backgroundColor = 'red';
        }
    }

    function startGame() {
        resetGame();
        moveDot();
        webgazer.resume();
        webgazer.setGazeListener(function(data, elapsedTime) {
            if (data == null || gameOver) return;
            trackGaze(data.x, data.y);
        }).start();
        gameLoop();
    }

    function resetGame() {
        score = 0;
        gameOver = false;
        fixationStartTime = null;
        scoreDisplay.textContent = `Score: ${score}`;
    }

    function moveDot() {
        dot.x = Math.random() * (canvas.width - dot.size);
        dot.y = Math.random() * (canvas.height - dot.size);
        dot.color = getRandomColor();
    }

    function getRandomColor() {
        const colors = ['blue', 'green', 'yellow', 'purple', 'cyan'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function isLookingAtDot(gazeX, gazeY) {
        const distX = Math.abs(gazeX - (dot.x + dot.size / 2));
        const distY = Math.abs(gazeY - (dot.y + dot.size / 2));
        return distX < dot.size / 2 && distY < dot.size / 2;
    }

    function trackGaze(gazeX, gazeY) {
        gazeHistory.push({ x: gazeX, y: gazeY });
        if (gazeHistory.length > gazeHistoryLength) {
            gazeHistory.shift();
        }

        let avgGazeX = 0;
        let avgGazeY = 0;
        gazeHistory.forEach(gaze => {
            avgGazeX += gaze.x;
            avgGazeY += gaze.y;
        });
        avgGazeX /= gazeHistoryLength;
        avgGazeY /= gazeHistoryLength;

        if (isLookingAtDot(avgGazeX, avgGazeY)) {
            if (!fixationStartTime) {
                fixationStartTime = Date.now();
            } else if (Date.now() - fixationStartTime >= fixationThreshold) {
                endGame();
            }
        } else {
            fixationStartTime = null;
        }
    }

    function endGame() {
        gameOver = true;
        webgazer.pause();
        finalScoreDisplay.textContent = `Your Final Score: ${score}`;
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('game-over').style.display = 'flex';
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x + dot.size / 2, dot.y + dot.size / 2, dot.size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    function update() {
        if (!gameOver) {
            score += 1;
            scoreDisplay.textContent = `Score: ${score}`;
            // Increase difficulty over time or score
            if (score % 500 === 0) {
                fixationThreshold = Math.max(500, fixationThreshold - 100);
            }
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
});

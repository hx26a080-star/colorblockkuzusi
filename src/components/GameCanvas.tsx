import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Ball, Brick, COLORS, GameColor, GameState, Particle, PowerUp, PowerUpType } from '../types';
import { sounds } from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  level: number;
  score: number;
  lives: number;
  paddleColor: GameColor;
  isMuted: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number | ((prev: number) => number)) => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
  onPowerUpCollected: (type: PowerUpType) => void;
  onGameInfoUpdate?: (ballsCount: number, activePowerups: string[]) => void;
}

export interface GameCanvasHandle {
  launchBall: () => void;
  resetGame: (resetScore?: boolean) => void;
  nextLevel: () => void;
  setPaddleColorDirectly: (color: GameColor) => void;
}

// Fixed game coordinates resolution size (logic board)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  gameState,
  level,
  score,
  lives,
  paddleColor,
  isMuted,
  onScoreChange,
  onLivesChange,
  onLevelComplete,
  onGameOver,
  onPowerUpCollected,
  onGameInfoUpdate
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core Game Entities (ref-based for direct access in physics loops without state re-render lags)
  const stateRef = useRef<{
    balls: Ball[];
    paddleX: number;
    paddleWidth: number;
    paddleHeight: number;
    paddleColor: GameColor;
    bricks: Brick[];
    particles: Particle[];
    powerUps: PowerUp[];
    score: number;
    lives: number;
    isBallReady: boolean; // Is ball glued to paddle, waiting to launch
    rainbowTimer: number; // Active time remaining for rainbow ball
    widerPaddleTimer: number; // Active time remaining for wide paddle
    slowBallTimer: number; // Active slow duration
    gameLevel: number;
  }>({
    balls: [],
    paddleX: CANVAS_WIDTH / 2 - 60,
    paddleWidth: 120,
    paddleHeight: 18,
    paddleColor: 'red',
    bricks: [],
    particles: [],
    powerUps: [],
    score: 0,
    lives: 3,
    isBallReady: true,
    rainbowTimer: 0,
    widerPaddleTimer: 0,
    slowBallTimer: 0,
    gameLevel: 1,
  });

  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [activePaddleColorState, setActivePaddleColorState] = useState<GameColor>('red');

  // Input States
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Sync some external changes to ref values quickly
  useEffect(() => {
    stateRef.current.paddleColor = paddleColor;
    setActivePaddleColorState(paddleColor);
    // If the ball is ready (glued to paddle), color it immediately to match
    if (stateRef.current.isBallReady && stateRef.current.balls.length > 0) {
      stateRef.current.balls[0].color = paddleColor;
    }
  }, [paddleColor]);

  useEffect(() => {
    stateRef.current.lives = lives;
  }, [lives]);

  useEffect(() => {
    stateRef.current.gameLevel = level;
  }, [level]);

  // Handle resizing / responsive mapping beautifully
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;

      const containerWidth = container.clientWidth;
      // Maintain aspect ratio 4:3
      const calculatedHeight = Math.min((containerWidth * 3) / 4, window.innerHeight * 0.7);
      const calculatedWidth = (calculatedHeight * 4) / 3;

      canvas.style.width = `${calculatedWidth}px`;
      canvas.style.height = `${calculatedHeight}px`;

      setScale({
        x: calculatedWidth / CANVAS_WIDTH,
        y: calculatedHeight / CANVAS_HEIGHT,
      });
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Expose handles to Parent Component
  useImperativeHandle(ref, () => ({
    launchBall: () => {
      triggerLaunch();
    },
    resetGame: (resetScore = true) => {
      initializeLevel(stateRef.current.gameLevel, resetScore);
    },
    nextLevel: () => {
      initializeLevel(stateRef.current.gameLevel + 1, false);
    },
    setPaddleColorDirectly: (color: GameColor) => {
      stateRef.current.paddleColor = color;
      setActivePaddleColorState(color);
      if (stateRef.current.isBallReady && stateRef.current.balls.length > 0) {
        stateRef.current.balls[0].color = color;
      }
    }
  }));

  // Create Brick Maps based on levels
  const generateLevelBricks = (lvl: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = 5 + Math.min(lvl, 3);
    const cols = 10;
    const padding = 6;
    const startY = 60;
    
    const blockWidth = (CANVAS_WIDTH - padding * (cols + 1)) / cols;
    const blockHeight = 22;

    const colorCycle: GameColor[] = ['red', 'blue', 'green', 'yellow'];

    if (lvl % 4 === 1) {
      // Level 1: Horizontal striped lines + Gray/White wildcards
      for (let r = 0; r < rows; r++) {
        let blockColor: GameColor = colorCycle[r % 4];
        if (r === rows - 1) {
          blockColor = 'white'; // bottom row is wildcard white
        }
        for (let c = 0; c < cols; c++) {
          bricks.push({
            id: `b-${r}-${c}`,
            x: padding + c * (blockWidth + padding),
            y: startY + r * (blockHeight + padding),
            width: blockWidth,
            height: blockHeight,
            color: blockColor,
            points: blockColor === 'white' ? 50 : 100,
            isAlive: true,
          });
        }
      }
    } else if (lvl % 4 === 2) {
      // Level 2: Checkerboard design with alternating pockets of color
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isColored = (r + c) % 2 === 0;
          const blockColor: GameColor = isColored ? colorCycle[(r + c) % 4] : 'white';
          bricks.push({
            id: `b-${r}-${c}`,
            x: padding + c * (blockWidth + padding),
            y: startY + r * (blockHeight + padding),
            width: blockWidth,
            height: blockHeight,
            color: blockColor,
            points: blockColor === 'white' ? 50 : 100,
            isAlive: true,
          });
        }
      }
    } else if (lvl % 4 === 3) {
      // Level 3: Dual Shield with a glowing central block layout
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Leave some gaps to make high-level designs
          const isGap = (c === 0 || c === cols - 1) && (r < 2);
          const blockColor = r === 2 ? 'white' : colorCycle[(c + r) % 4];
          if (!isGap) {
            bricks.push({
              id: `b-${r}-${c}`,
              x: padding + c * (blockWidth + padding),
              y: startY + r * (blockHeight + padding),
              width: blockWidth,
              height: blockHeight,
              color: blockColor,
              points: 120,
              isAlive: true,
            });
          }
        }
      }
    } else {
      // Level 4: Spiral/Heart or fun geometric layout
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Symmetric design
          const centerDist = Math.abs(c - (cols - 1) / 2) + Math.abs(r - (rows - 1) / 2);
          if (centerDist < 5) {
            const blockColor = colorCycle[Math.floor(centerDist) % 4];
            bricks.push({
              id: `b-${r}-${c}`,
              x: padding + c * (blockWidth + padding),
              y: startY + r * (blockHeight + padding),
              width: blockWidth,
              height: blockHeight,
              color: blockColor,
              points: 150,
              isAlive: true,
            });
          }
        }
      }
    }

    return bricks;
  };

  // Launch prepped ball
  const triggerLaunch = () => {
    const s = stateRef.current;
    if (s.isBallReady && s.balls.length > 0) {
      s.isBallReady = false;
      const angle = (Math.random() * 40 - 20) * (Math.PI / 180); // Random offset -20 to +20 deg
      const speed = 7.5 + Math.min(s.gameLevel * 0.3, 2);
      s.balls[0].vx = speed * Math.sin(angle);
      s.balls[0].vy = -speed * Math.cos(angle);
      sounds.playPaddleHit();
    }
  };

  // Initialize a Level
  const initializeLevel = (lvl: number, resetScoreAll: boolean) => {
    const s = stateRef.current;
    s.gameLevel = lvl;
    if (resetScoreAll) {
      s.score = 0;
      s.lives = 3;
      onScoreChange(0);
      onLivesChange(3);
    }
    
    // Paddle Size Reset
    s.paddleWidth = 125;
    s.paddleHeight = 18;
    s.paddleX = CANVAS_WIDTH / 2 - s.paddleWidth / 2;

    // Reset PowerUps & Timers
    s.powerUps = [];
    s.particles = [];
    s.rainbowTimer = 0;
    s.widerPaddleTimer = 0;
    s.slowBallTimer = 0;

    // Generate Bricks Map
    s.bricks = generateLevelBricks(lvl);

    // Initial ball placement (resting on the paddle)
    const initialBall: Ball = {
      id: `ball-${Date.now()}`,
      x: s.paddleX + s.paddleWidth / 2,
      y: CANVAS_HEIGHT - 35,
      vx: 0,
      vy: 0,
      radius: 9,
      color: s.paddleColor,
    };
    s.balls = [initialBall];
    s.isBallReady = true;

    // Notify React layer
    if (onGameInfoUpdate) {
      onGameInfoUpdate(1, []);
    }
  };

  // Setup initial load
  useEffect(() => {
    initializeLevel(level, true);
    // Keyboard key listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          if (stateRef.current.isBallReady) {
            triggerLaunch();
          } else {
            // Cycle color on Spacebar
            cyclePaddleColor();
          }
        }
      }
      // Color Keys: 1 -> red, 2 -> blue, 3 -> green, 4 -> yellow
      if (gameState === 'PLAYING') {
        if (e.key === '1') cycleToColor('red');
        if (e.key === '2') cycleToColor('blue');
        if (e.key === '3') cycleToColor('green');
        if (e.key === '4') cycleToColor('yellow');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Color Cycling Engine
  const cyclePaddleColor = () => {
    const colors: GameColor[] = ['red', 'blue', 'green', 'yellow'];
    const s = stateRef.current;
    const curIdx = colors.indexOf(s.paddleColor);
    const nextColor = colors[(curIdx + 1) % colors.length];
    s.paddleColor = nextColor;
    setActivePaddleColorState(nextColor);

    if (s.isBallReady && s.balls.length > 0) {
      s.balls[0].color = nextColor;
    }
  };

  const cycleToColor = (col: GameColor) => {
    const s = stateRef.current;
    s.paddleColor = col;
    setActivePaddleColorState(col);
    if (s.isBallReady && s.balls.length > 0) {
      s.balls[0].color = col;
    }
  };

  // Spark beautiful retro particle rings
  const createExplosion = (x: number, y: number, colorHex: string, qty = 15) => {
    const s = stateRef.current;
    for (let i = 0; i < qty; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 2.5,
        color: colorHex,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        gravity: 0.12,
      });
    }
  };

  // Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      updatePhysics();
      drawGame();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'PLAYING') {
      animationFrameId = requestAnimationFrame(gameLoop);
    } else {
      // Just redraw on paused/other screens to keep updates visible
      drawGame();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, scale]);

  // Game Physics Engine
  const updatePhysics = () => {
    const s = stateRef.current;
    if (gameState !== 'PLAYING') return;

    // 1. Decrement powerup timers
    if (s.rainbowTimer > 0) {
      s.rainbowTimer -= 1000 / 60; // Approximate ms per frame (60 FPS)
      if (s.rainbowTimer <= 0) {
        s.balls.forEach(b => b.rainbowMode = false);
      }
    }
    if (s.widerPaddleTimer > 0) {
      s.widerPaddleTimer -= 1000 / 60;
      if (s.widerPaddleTimer <= 0) {
        s.paddleWidth = 125;
      }
    }
    if (s.slowBallTimer > 0) {
      s.slowBallTimer -= 1000 / 60;
    }

    // 2. Paddle Movement
    const paddleSpeed = 9;
    if (keysPressedRef.current['ArrowLeft'] || keysPressedRef.current['KeyA']) {
      s.paddleX = Math.max(0, s.paddleX - paddleSpeed);
    }
    if (keysPressedRef.current['ArrowRight'] || keysPressedRef.current['KeyD']) {
      s.paddleX = Math.min(CANVAS_WIDTH - s.paddleWidth, s.paddleX + paddleSpeed);
    }

    // If ball is glued, stick to paddle center
    if (s.isBallReady && s.balls.length > 0) {
      s.balls[0].x = s.paddleX + s.paddleWidth / 2;
      s.balls[0].y = CANVAS_HEIGHT - 35;
    }

    // 3. Move PowerUps
    for (let i = s.powerUps.length - 1; i >= 0; i--) {
      const p = s.powerUps[i];
      if (!p.isActive) continue;
      p.y += p.vy;

      // Check paddle collision
      const padTop = CANVAS_HEIGHT - 30;
      if (
        p.y + p.height >= padTop &&
        p.y <= padTop + s.paddleHeight &&
        p.x + p.width >= s.paddleX &&
        p.x <= s.paddleX + s.paddleWidth
      ) {
        // Collect PowerUp !
        p.isActive = false;
        applyPowerUp(p.type);
        sounds.playPowerUp();
      }

      // Check screen bounds bottom
      if (p.y > CANVAS_HEIGHT) {
        p.isActive = false;
      }
    }
    s.powerUps = s.powerUps.filter(p => p.isActive);

    // 4. Move and scale Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const pt = s.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      if (pt.gravity) pt.vy += pt.gravity;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        s.particles.splice(i, 1);
      }
    }

    // 5. Balls Physics & Bouncing Logic
    for (let idx = s.balls.length - 1; idx >= 0; idx--) {
      const ball = s.balls[idx];
      if (s.isBallReady && idx === 0) continue; // Skip moving first ball if locked to paddle

      // Apply slow modifier
      const currentSpeedCoeff = s.slowBallTimer > 0 ? 0.65 : 1.0;
      ball.x += ball.vx * currentSpeedCoeff;
      ball.y += ball.vy * currentSpeedCoeff;

      // Boundary Collisions (Left, Right, Top)
      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx;
        sounds.playWallBounce();
      } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
        ball.x = CANVAS_WIDTH - ball.radius;
        ball.vx = -ball.vx;
        sounds.playWallBounce();
      }

      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy;
        sounds.playWallBounce();
      }

      // Bottom death boundary check
      if (ball.y - ball.radius > CANVAS_HEIGHT) {
        s.balls.splice(idx, 1);
        if (s.balls.length === 0) {
          // Player loses life!
          onLivesChange(prev => {
            const nextLives = prev - 1;
            if (nextLives <= 0) {
              sounds.playGameOver();
              onGameOver();
            } else {
              // Revive standard ball on paddle
              s.balls = [{
                id: `ball-${Date.now()}`,
                x: s.paddleX + s.paddleWidth / 2,
                y: CANVAS_HEIGHT - 35,
                vx: 0,
                vy: 0,
                radius: 9,
                color: s.paddleColor,
              }];
              s.isBallReady = true;
            }
            return nextLives;
          });
        }
        continue;
      }

      // Paddle Collision check
      const padTop = CANVAS_HEIGHT - 30;
      if (
        ball.y + ball.radius >= padTop &&
        ball.y - ball.radius <= padTop + s.paddleHeight &&
        ball.x + ball.radius >= s.paddleX &&
        ball.x - ball.radius <= s.paddleX + s.paddleWidth &&
        ball.vy > 0
      ) {
        // Safe placement at paddle top contact limit
        ball.y = padTop - ball.radius;

        // Bouncing angle depends on where on the paddle the ball landed
        const relativeX = (ball.x - s.paddleX) / s.paddleWidth; // 0 to 1
        const maxAngleShift = 55 * (Math.PI / 180); // Maximum 55 degrees bend
        const angle = (relativeX - 0.5) * 2 * maxAngleShift;

        // Speed dynamic calculation
        const baseSpeed = 7.5 + Math.min(s.gameLevel * 0.3, 2);
        ball.vx = baseSpeed * Math.sin(angle);
        ball.vy = -baseSpeed * Math.cos(angle);

        // BALL COLORS MATCHING DYE COUPLING!
        // The ball takes the color of the paddle upon contact
        ball.color = s.paddleColor;
        if (s.rainbowTimer > 0) {
          ball.rainbowMode = true;
        }

        sounds.playPaddleHit();
        
        // Spawn small splash sparks matching paddle color at hit coordinate
        createExplosion(ball.x, padTop, COLORS[s.paddleColor].hex, 6);
      }

      // Bricks Collisions
      let collisionOccurred = false;
      for (let bIdx = 0; bIdx < s.bricks.length; bIdx++) {
        const brick = s.bricks[bIdx];
        if (!brick.isAlive) continue;

        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;

        // Box & Circle intersection
        if (
          ballRight > brick.x &&
          ballLeft < brick.x + brick.width &&
          ballBottom > brick.y &&
          ballTop < brick.y + brick.height
        ) {
          // Accurate physical bounce calculations
          const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
          const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));

          if (overlapX < overlapY) {
            // Horizontal impact bounce logic
            ball.vx = -ball.vx;
            if (ball.x < brick.x) {
              ball.x = brick.x - ball.radius;
            } else {
              ball.x = brick.x + brick.width + ball.radius;
            }
          } else {
            // Vertical impact bounce logic
            ball.vy = -ball.vy;
            if (ball.y < brick.y) {
              ball.y = brick.y - ball.radius;
            } else {
              ball.y = brick.y + brick.height + ball.radius;
            }
          }

          // SAME COLOR MATCHING VALIDATION CHECK!
          const isColorMatch = (brick.color === ball.color) || (brick.color === 'white') || ball.rainbowMode;

          if (isColorMatch) {
            // MATCH! Brick is destroyed
            brick.isAlive = false;
            s.score += brick.points;
            onScoreChange(s.score);

            sounds.playBrickBreak(brick.color);
            createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2, COLORS[brick.color].hex, 16);

            // Chance to drop power-ups (e.g. 15% rate)
            if (Math.random() < 0.16) {
              spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height);
            }
          } else {
            // WRONG COLOR! Brick shimmers, flashes but stays intact
            brick.shining = true;
            brick.shineEndTime = Date.now() + 250; // shine for 250ms
            sounds.playBrickHitWrong();

            // Emit minor defense sparks
            createExplosion(ball.x, ball.y, COLORS[brick.color].hex, 4);
          }

          collisionOccurred = true;
          break; // Stop evaluating multiple bricks in same tick for this ball to preserve physics stability
        }
      }

      // Clear shimmering visual updates
      s.bricks.forEach(br => {
        if (br.shining && br.shineEndTime && Date.now() > br.shineEndTime) {
          br.shining = false;
        }
      });

      // 6. Level Win State Check
      const aliveBricks = s.bricks.filter(b => b.isAlive);
      if (aliveBricks.length === 0 && s.bricks.length > 0) {
        sounds.playLevelComplete();
        onLevelComplete();
      }
    }

    // Sync info to outer layout
    if (onGameInfoUpdate) {
      const activePowerupsList: string[] = [];
      if (s.rainbowTimer > 0) activePowerupsList.push('レインボー球');
      if (s.widerPaddleTimer > 0) activePowerupsList.push('ロングパドル');
      if (s.slowBallTimer > 0) activePowerupsList.push('スローボール');
      onGameInfoUpdate(s.balls.length, activePowerupsList);
    }
  };

  // PowerUp Spawning Setup
  const spawnPowerUp = (x: number, y: number) => {
    const s = stateRef.current;
    const types: PowerUpType[] = ['multiball', 'extralife', 'widerpaddle', 'rainbow', 'slowball'];
    // Weighted selection (multiball is more common, extralife is rare)
    const weights = [0.35, 0.08, 0.22, 0.15, 0.2];
    const r = Math.random();
    let cumulative = 0;
    let selectedType: PowerUpType = 'multiball';

    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) {
        selectedType = types[i];
        break;
      }
    }

    let col = '#ffffff';
    if (selectedType === 'multiball') col = '#00d2d3'; // turquoise
    else if (selectedType === 'extralife') col = '#ff9ff3'; // pink
    else if (selectedType === 'widerpaddle') col = '#ff9f43'; // orange
    else if (selectedType === 'rainbow') col = '#feca57'; // gold yellow
    else if (selectedType === 'slowball') col = '#54a0ff'; // light blue

    s.powerUps.push({
      id: `pw-${Date.now()}-${Math.random()}`,
      x: x - 13,
      y,
      vy: 2.2,
      width: 26,
      height: 26,
      type: selectedType,
      color: col,
      isActive: true,
    });
  };

  // Action Apply PowerUp
  const applyPowerUp = (type: PowerUpType) => {
    const s = stateRef.current;
    if (type === 'extralife') {
      onLivesChange(prev => prev + 1);
    } else if (type === 'widerpaddle') {
      s.widerPaddleTimer = 10000; // 10s duration
      s.paddleWidth = 185;
    } else if (type === 'rainbow') {
      s.rainbowTimer = 7000; // 7s duration
      s.balls.forEach(b => b.rainbowMode = true);
    } else if (type === 'slowball') {
      s.slowBallTimer = 8000; // 8s duration
    } else if (type === 'multiball') {
      // Spawn standard balls active in paddle area or randomly from an existing active ball
      const sourceBall = s.balls[0] || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: 0, vy: -5 };
      const angle1 = (Math.random() * 30 - 15) * (Math.PI / 180);
      const angle2 = (Math.random() * 30 - 15) * (Math.PI / 180);

      const speed = 7.5 + Math.min(s.gameLevel * 0.3, 2);
      
      const newBall1: Ball = {
        id: `ball-${Date.now()}-m1`,
        x: sourceBall.x,
        y: sourceBall.y - 10,
        vx: speed * Math.sin(angle1 - 0.4),
        vy: -speed * Math.cos(angle1 - 0.4),
        radius: 9,
        color: (['red', 'blue', 'green', 'yellow'] as GameColor[])[Math.floor(Math.random() * 4)],
        rainbowMode: s.rainbowTimer > 0
      };

      const newBall2: Ball = {
        id: `ball-${Date.now()}-m2`,
        x: sourceBall.x,
        y: sourceBall.y - 10,
        vx: speed * Math.sin(angle2 + 0.4),
        vy: -speed * Math.cos(angle2 + 0.4),
        radius: 9,
        color: (['red', 'blue', 'green', 'yellow'] as GameColor[])[Math.floor(Math.random() * 4)],
        rainbowMode: s.rainbowTimer > 0
      };

      s.balls.push(newBall1, newBall2);
    }
  };

  // Canvas Drawing Routine
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    // Clear with semi-transparent sweep for beautiful space trails
    ctx.fillStyle = '#0A0A0B'; // pitch-black elegant dark background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid background for techno style aesthetics
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // 1. Draw Bricks
    s.bricks.forEach(brick => {
      if (!brick.isAlive) return;

      const conf = COLORS[brick.color];
      
      // Outer Glow shadow on matching colors
      ctx.shadowBlur = 4;
      ctx.shadowColor = conf.hex;

      if (brick.shining) {
        ctx.fillStyle = '#ffffff'; // White overlay on error
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = conf.hex;
      }

      // Draw rounded rectangular brick
      const r = 4; // corner radius
      ctx.beginPath();
      ctx.moveTo(brick.x + r, brick.y);
      ctx.lineTo(brick.x + brick.width - r, brick.y);
      ctx.quadraticCurveTo(brick.x + brick.width, brick.y, brick.x + brick.width, brick.y + r);
      ctx.lineTo(brick.x + brick.width, brick.y + brick.height - r);
      ctx.quadraticCurveTo(brick.x + brick.width, brick.y + brick.height, brick.x + brick.width - r, brick.y + brick.height);
      ctx.lineTo(brick.x + r, brick.y + brick.height - r);
      ctx.quadraticCurveTo(brick.x, brick.y + brick.height, brick.x, brick.y + brick.height - r);
      ctx.lineTo(brick.x, brick.y + r);
      ctx.quadraticCurveTo(brick.x, brick.y, brick.x + r, brick.y);
      ctx.closePath();
      ctx.fill();

      // Border shimmer highlight
      ctx.shadowBlur = 0; // reset
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Color Match Indicator Light (Small horizontal internal thread)
      if (brick.color !== 'white') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(brick.x + brick.width / 2 - 8, brick.y + brick.height / 2 - 1.5, 16, 3);
      } else {
        // Star pattern for wildcard
        ctx.fillStyle = '#0A0A0B';
        ctx.fillText('★', brick.x + brick.width / 2 - 5, brick.y + brick.height / 2 + 3.5);
      }
    });

    // 2. Draw Active PowerUps
    s.powerUps.forEach(p => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Icon overlay symbol inside powerup circle
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let symbol = '?';
      if (p.type === 'multiball') symbol = '●●';
      else if (p.type === 'extralife') symbol = '♥';
      else if (p.type === 'widerpaddle') symbol = '↔';
      else if (p.type === 'rainbow') symbol = '★';
      else if (p.type === 'slowball') symbol = '▼';

      ctx.fillText(symbol, p.x + p.width / 2, p.y + p.height / 2 + 1);
    });

    // 3. Draw Particles (Shatters)
    s.particles.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Reset alpha

    // 4. Draw Paddle
    const padConf = COLORS[s.paddleColor];
    ctx.shadowBlur = 15;
    ctx.shadowColor = padConf.hex;
    ctx.fillStyle = padConf.hex;

    // Elegant Capsule representation of paddle
    const px = s.paddleX;
    const py = CANVAS_HEIGHT - 30;
    const pw = s.paddleWidth;
    const ph = s.paddleHeight;
    const prPoint = ph / 2;

    ctx.beginPath();
    ctx.arc(px + prPoint, py + prPoint, prPoint, Math.PI/2, (3*Math.PI)/2);
    ctx.lineTo(px + pw - prPoint, py);
    ctx.arc(px + pw - prPoint, py + prPoint, prPoint, (3*Math.PI)/2, Math.PI/2);
    ctx.lineTo(px + prPoint, py + ph);
    ctx.closePath();
    ctx.fill();

    // Inside highlight of paddle capsules
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Central grip bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(px + pw / 2 - 15, py + ph / 2 - 1.5, 30, 3);

    // active controls indicator text above paddle when ready to launch
    if (s.isBallReady) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE / クリックで発射', px + pw / 2, py - 20);
    }

    // 5. Draw Game Balls
    s.balls.forEach((ball, bIdx) => {
      // Glow depending on mode
      ctx.shadowBlur = 12;
      let ballHexStr = COLORS[ball.color].hex;

      if (ball.rainbowMode || s.rainbowTimer > 0) {
        // Fast pulsing spectrum color sequence for rainbow ball
        const t = Date.now() / 200;
        const r = Math.floor(Math.sin(t) * 127 + 128);
        const g = Math.floor(Math.sin(t + 2) * 127 + 128);
        const b = Math.floor(Math.sin(t + 4) * 127 + 128);
        ballHexStr = `rgb(${r}, ${g}, ${b})`;
      }

      ctx.shadowColor = ballHexStr;

      // Draw Ball circle
      ctx.fillStyle = ballHexStr;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight white dot to feel physically round
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.35, ball.y - ball.radius * 0.35, ball.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reset shadow values for subsequent HTML layout components
    ctx.shadowBlur = 0;
  };

  // Mouse / Pointer Controls
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / scale.x;

    const s = stateRef.current;
    s.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - s.paddleWidth, relativeX - s.paddleWidth / 2));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    
    // Prevent default reactions
    const s = stateRef.current;
    if (s.isBallReady) {
      triggerLaunch();
    } else {
      // Cycle on tap/click inside game area
      cyclePaddleColor();
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#121214] border border-white/10 shadow-2xl p-1"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block cursor-crosshair bg-[#0A0A0B] shadow-inner rounded-xl"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';

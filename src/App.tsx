import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Heart, 
  Pause, 
  HelpCircle, 
  Cpu, 
  Sparkles, 
  ArrowRight,
  Crown
} from 'lucide-react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { GameColor, GameState, COLORS } from './types';
import { sounds } from './utils/audio';

export default function App() {
  const canvasRef = useRef<GameCanvasHandle>(null);

  // Synchronized States
  const [gameState, setGameState] = useState<GameState>('START');
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('color_breaker_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState<number>(3);
  const [paddleColor, setPaddleColor] = useState<GameColor>('red');
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuteStatus());
  
  // HUD Extra Info (Balls sync, active buffs)
  const [ballsCount, setBallsCount] = useState<number>(1);
  const [activePowerups, setActivePowerups] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(true);

  // Sync high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('color_breaker_highscore', score.toString());
      } catch (e) {}
    }
  }, [score, highScore]);

  // Handle Mute Switching
  const handleToggleMute = () => {
    const nextMute = sounds.toggleMute();
    setIsMuted(nextMute);
  };

  // Launch triggers
  const handleStartGame = () => {
    setGameState('PLAYING');
    sounds.playPaddleHit();
  };

  const handlePauseGame = () => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
    }
  };

  const handleRestartFull = () => {
    setLevel(1);
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    setTimeout(() => {
      canvasRef.current?.resetGame(true);
    }, 50);
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    if (nextLvl > 4) {
      setGameState('WIN');
    } else {
      setLevel(nextLvl);
      setGameState('PLAYING');
      setTimeout(() => {
        canvasRef.current?.nextLevel();
      }, 50);
    }
  };

  const handleGameOverTrigger = () => {
    setGameState('GAMEOVER');
  };

  const handleLevelCompleteTrigger = () => {
    setGameState('LEVEL_COMPLETED');
  };

  // Update paddle color directly from clicking bottom palette buttons
  const selectPaddleColor = (color: GameColor) => {
    setPaddleColor(color);
    canvasRef.current?.setPaddleColorDirectly(color);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col items-center justify-between font-sans no-scrollbar pb-6 selection:bg-cyan-500 selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="w-full max-w-7xl px-6 md:px-10 py-4 flex flex-col md:flex-row items-center justify-between border-b border-white/10 bg-[#121214] sticky top-0 z-40 gap-4 mt-2 rounded-2xl shadow-lg">
        
        {/* Brand Name */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CHROMA<span className="text-cyan-400">BREAK</span>
            </h1>
            <p className="text-[10px] text-white/40 font-mono tracking-[0.2em]">
              COLLIDE MATCHING RESONATORS
            </p>
          </div>
        </div>

        {/* Global Stats HUD */}
        <div className="flex flex-wrap items-center gap-6 md:gap-8 bg-[#0a0a0b]/60 border border-white/5 px-6 py-2 rounded-xl font-mono text-xs uppercase tracking-[0.15em]">
          
          {/* High Score */}
          <div className="flex flex-col items-center border-r border-white/10 pr-6">
            <span className="text-white/40 mb-0.5 text-[9px]">BEST</span>
            <span className="text-amber-400 font-bold text-base">{highScore.toLocaleString()}</span>
          </div>

          {/* Current Score */}
          <div className="flex flex-col items-center border-r border-white/10 pr-6">
            <span className="text-white/40 mb-0.5 text-[9px]">SCORE</span>
            <span className="text-white font-bold text-base">{score.toLocaleString()}</span>
          </div>

          {/* Level Tracker */}
          <div className="flex flex-col items-center border-r border-white/10 pr-6">
            <span className="text-white/40 mb-0.5 text-[9px]">LEVEL</span>
            <span className="text-cyan-400 font-bold text-base">{level}</span>
          </div>

          {/* Lives Left */}
          <div className="flex flex-col items-center pl-1">
            <span className="text-white/40 mb-0.5 text-[9px]">LIVES</span>
            <div className="flex gap-1.5 mt-1">
              {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                </motion.div>
              ))}
              {lives <= 0 && (
                <span className="text-pink-500 font-bold text-[9px]">NO LIVES</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2">
          {/* Pause Button */}
          {gameState === 'PLAYING' && (
            <button
              onClick={handlePauseGame}
              className="p-2.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-white/60 hover:border-white/20 hover:text-white transition duration-200"
              title="一時停止"
              id="pause-btn"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-white/60 hover:border-white/20 hover:text-white transition duration-200"
            title={isMuted ? '音量をオンにする' : 'ミュートする'}
            id="sound-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-pink-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Guide Overlay Toggle */}
          <button
            onClick={() => setShowTutorial(prev => !prev)}
            className={`p-2.5 rounded-xl border transition duration-200 ${
              showTutorial 
                ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40' 
                : 'bg-[#0A0A0B] border-white/10 text-white/60 hover:border-white/20 hover:text-white'
            }`}
            title="遊び方ガイド"
            id="help-btn"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN GAME CONTAINER VIEW */}
      <main className="w-full max-w-7xl px-4 md:px-8 py-4 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* LEFT COLUMN: GUIDES & CURRENT POWER-UP STATUS */}
        <section className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Interactive Tutorial Guide */}
          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
                
                <h3 className="font-display font-bold text-sm tracking-wide text-cyan-400 uppercase flex items-center gap-2">
                  <HelpCircle className="w-4.5 h-4.5 text-cyan-400" />
                  カラーマッチ・ガイド
                </h3>

                <div className="text-xs text-white/60 leading-relaxed flex flex-col gap-2.5 font-sans">
                  <p>
                    通常のブロック崩しとは異なり、<strong className="text-white">【球と同じ色のブロック】</strong>しか破壊することができません！
                  </p>
                  
                  <div className="border-t border-white/5 my-1" />

                  <div className="flex flex-col gap-2">
                    <span className="font-semibold text-white/80">ルール＆操作：</span>
                    <ul className="list-disc pl-5 space-y-1 text-white/40">
                      <li>
                        球が<span className="text-white">パドルにヒットすると</span>、パドルと同じ色に着色されます。
                      </li>
                      <li>
                        マウス移動または <span className="text-white">A/Dキー、←/→キー</span>でパドルを動かします。
                      </li>
                      <li>
                        <span className="text-cyan-400 font-mono font-bold bg-[#0A0A0B] px-1 rounded border border-white/5">SPACEキー</span> または画面のタップでパドルの色を変更（サイクル）できます。
                      </li>
                      <li>
                        <span className="text-cyan-400 font-mono font-bold bg-[#0A0A0B] px-1 rounded border border-white/5">1 / 2 / 3 / 4 キー</span>で特定の色へダイレクトに切り替えられます。
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-white/5 my-1" />

                  <p className="text-[11px] text-white/30 italic">
                    異なる色のブロックに当てると壊れずに弾かれます。パドルの色を素早く回して球の色を操りましょう！
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Buffs & PowerUps List */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex-1 flex flex-col gap-4 min-h-[160px]">
            <h3 className="font-display font-bold text-xs tracking-wider text-white/40 uppercase">
              アクティブな補正効果
            </h3>

            {activePowerups.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-xl">
                <span className="text-xs text-white/20 font-mono uppercase tracking-wider">NO_ACTIVE_MODIFIERS</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activePowerups.map((pwName, idx) => (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={idx}
                    className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-2.5 rounded-xl"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <div>
                      <h4 className="text-xs font-semibold text-white font-mono">{pwName}</h4>
                      <p className="text-[10px] text-white/40">稼働時間制限あり</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Balls in Play count display */}
            <div className="border-t border-white/5 pt-4 flex justify-between items-center text-xs">
              <span className="text-white/45">稼働中のボール:</span>
              <span className="font-bold font-mono text-cyan-400 text-sm">{ballsCount} 個</span>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: LIVE INTERACTIVE CANVAS & SCREEN OVERLAYS */}
        <section className="lg:col-span-2 flex flex-col gap-4 relative justify-center items-center">
          
          <div className="w-full relative">
            <GameCanvas
              ref={canvasRef}
              gameState={gameState}
              level={level}
              score={score}
              lives={lives}
              paddleColor={paddleColor}
              isMuted={isMuted}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelComplete={handleLevelCompleteTrigger}
              onGameOver={handleGameOverTrigger}
              onPowerUpCollected={(type) => {}}
              onGameInfoUpdate={(count, activeList) => {
                setBallsCount(count);
                setActivePowerups(activeList);
              }}
            />

            {/* 1. START OVERLAY */}
            {gameState === 'START' && (
              <div className="absolute inset-2 bg-[#0A0A0B]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 border border-white/10">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-md flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 relative group">
                    <span className="inset-0 absolute rounded-2xl bg-cyan-500/10 blur-xl opacity-80 animate-pulse" />
                    <Play className="w-8 h-8 fill-cyan-400 relative" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white mb-2 uppercase">
                    CHROMA<span className="text-cyan-400">BREAK</span>
                  </h2>
                  <p className="text-sm text-white/50 px-4 mb-8 leading-relaxed">
                    同じカラーの球でブロックを粉砕せよ！<br />
                    パドルの色を変えれば、バウンドする球もその色に染まる。
                  </p>

                  <button
                    onClick={handleStartGame}
                    className="group relative flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all text-sm tracking-wider"
                    id="start-overlay-btn"
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
                    MISSION START <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            )}

            {/* 2. PAUSED OVERLAY */}
            {gameState === 'PAUSED' && (
              <div className="absolute inset-2 bg-[#0A0A0B]/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-10 border border-white/10">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold font-display tracking-wide text-white mb-6 uppercase">
                    GAME PAUSED
                  </h2>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handlePauseGame}
                      className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl transition text-sm flex items-center gap-2"
                      id="resume-overlay-btn"
                    >
                      <Play className="w-4 h-4 fill-black" /> 再開
                    </button>
                    <button
                      onClick={handleRestartFull}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl transition text-sm flex items-center gap-2"
                      id="reset-paused-btn"
                    >
                      <RotateCcw className="w-4 h-4" /> 最初から
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 3. GAMEOVER OVERLAY */}
            {gameState === 'GAMEOVER' && (
              <div className="absolute inset-2 bg-[#0A0A0B]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 border border-pink-500/20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-xs flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-pink-550/10 border border-pink-500/30 flex items-center justify-center text-pink-500 mb-4 animate-bounce">
                    <Heart className="w-6 h-6" />
                  </div>

                  <h2 className="text-3xl font-bold font-display tracking-tight text-pink-500 mb-1">
                    MISSION FAILED
                  </h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-mono mb-6">
                    SIGNAL LOST IN SPACE
                  </p>

                  <div className="bg-[#121214] border border-white/5 px-5 py-3 rounded-xl w-full mb-6 text-sm font-mono flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-white/30">FINAL SCORE</span>
                      <span className="text-white font-bold">{score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5">
                      <span className="text-white/30">HIGH SCORE</span>
                      <span className="text-amber-400 font-bold">{highScore.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRestartFull}
                    className="flex justify-center items-center gap-2 px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition shadow-lg shadow-pink-500/20 text-sm w-full"
                    id="retry-overlay-btn"
                  >
                    <RotateCcw className="w-4 h-4" /> もう一度挑戦する
                  </button>
                </motion.div>
              </div>
            )}

            {/* 4. LEVEL_COMPLETED OVERLAY */}
            {gameState === 'LEVEL_COMPLETED' && (
              <div className="absolute inset-2 bg-[#0A0A0B]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 border border-cyan-500/20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-sm flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-spin">
                    <Sparkles className="w-6 h-6" />
                  </div>

                  <h2 className="text-3xl font-bold font-display tracking-tight text-cyan-400 mb-1">
                    ROUND CLEANED
                  </h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-mono mb-6">
                    PREPARING NEXT FREQUENCY
                  </p>

                  <div className="bg-[#121214] border border-white/5 px-6 py-4 rounded-xl w-full mb-6 text-sm flex flex-col gap-2">
                    <div className="flex justify-between font-mono">
                      <span className="text-white/40">SCORE</span>
                      <span className="text-white font-bold">{score.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-cyan-400/90 text-left leading-relaxed mt-1">
                      ★ ステージクリアボーナスを加算しました！
                    </p>
                  </div>

                  <button
                    onClick={handleNextLevel}
                    className="flex justify-center items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition shadow-lg shadow-cyan-500/20 text-sm w-full"
                    id="next-overlay-btn"
                  >
                    NEXT STAGE <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            )}

            {/* 5. WIN OVERLAY */}
            {gameState === 'WIN' && (
              <div className="absolute inset-2 bg-[#0A0A0B]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 border border-amber-500/20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-xs flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
                    <Crown className="w-8 h-8" />
                  </div>

                  <h2 className="text-3xl font-bold font-display tracking-tight text-amber-400 mb-1">
                    GALAXY MASTERED
                  </h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-mono mb-6">
                    ALL SECTORS SECURED
                  </p>

                  <p className="text-xs text-white/60 leading-relaxed mb-6">
                    素晴らしいビジュアルコーディネーションです。すべてのカラーキャスケード・セクターの調和に成功しました！
                  </p>

                  <div className="bg-[#121214] border border-white/5 px-5 py-3 rounded-xl w-full mb-6 font-mono text-sm flex justify-between items-center">
                    <span className="text-white/30">FINAL SCORE</span>
                    <span className="text-amber-400 font-bold text-lg">{score.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={handleRestartFull}
                    className="flex justify-center items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-550 text-black font-bold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm w-full"
                    id="win-restart-btn"
                  >
                    <RotateCcw className="w-4 h-4" /> 最初から周回プレイ
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: PADDLE COLOR MANIPULATOR PALETTE */}
        <section className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Main Paddle Color Controller */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-display font-semibold text-xs tracking-wider text-white/40 uppercase flex items-center justify-between">
              <span>パドルのカラー選択</span>
              <span className="text-[10px] text-white/20 font-mono">PADDLE COLOR</span>
            </h3>

            {/* Quick Click Palette Grid */}
            <div className="grid grid-cols-2 gap-3">
              {(['red', 'blue', 'green', 'yellow'] as GameColor[]).map((colId) => {
                const config = COLORS[colId];
                const isActive = paddleColor === colId;
                return (
                  <button
                    key={colId}
                    onClick={() => selectPaddleColor(colId)}
                    disabled={gameState !== 'PLAYING'}
                    className={`relative p-4 rounded-xl flex flex-col items-center gap-2 border transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive 
                        ? 'border-white/40 bg-white/5 ring-2 ring-white/10' 
                        : 'border-white/5 bg-[#0a0a0b]/60 hover:bg-white/5'
                    }`}
                    id={`color-btn-${colId}`}
                  >
                    {/* Glowing point indicator */}
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20 transition-transform duration-200"
                      style={{ 
                        backgroundColor: config.hex,
                        boxShadow: isActive ? `0 0 12px ${config.hex}` : 'none',
                        transform: isActive ? 'scale(1.15)' : 'none'
                      }}
                    />
                    <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-white/40'}`}>
                      {config.name}
                    </span>

                    {/* Keyboard shortcut hint overlay inside touch button */}
                    <span className="absolute top-1 right-2 text-[8px] font-mono font-normal opacity-30 bg-[#0a0a0b] px-1 rounded border border-white/5">
                      {colId === 'red' && '1'}
                      {colId === 'blue' && '2'}
                      {colId === 'green' && '3'}
                      {colId === 'yellow' && '4'}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-white/30 leading-relaxed text-center mt-1">
              クリックまたはキーボードの <strong className="text-white/50">1, 2, 3, 4</strong> を押して好きな色へダイレクトに切り替えられます。
            </p>
          </div>

          {/* Items & PowerUp Glossary dictionary panel */}
          <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-display font-semibold text-xs tracking-wider text-white/40 uppercase">
              アイテム・図鑑
            </h3>

            <div className="flex flex-col gap-2 font-sans text-xs">
              <div className="flex items-center gap-2 text-white/60">
                <span className="w-5 h-5 rounded-full bg-[#00d2d3] flex items-center justify-center text-[10px] text-slate-950 font-bold">●●</span>
                <span>マルチボール: ボールを2増やす</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="w-5 h-5 rounded-full bg-[#ff9ff3] flex items-center justify-center text-[10px] text-slate-950 font-bold">♥</span>
                <span>ライフアップ: ライフ+1</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="w-5 h-5 rounded-full bg-[#ff9f43] flex items-center justify-center text-[10px] text-slate-950 font-bold">↔</span>
                <span>ロングパドル: パドルを幅広にする 10s</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="w-5 h-5 rounded-full bg-[#feca57] flex items-center justify-center text-[10px] text-slate-950 font-bold">★</span>
                <span>レインボー球: 全レンガを即破壊 7s</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="w-5 h-5 rounded-full bg-[#54a0ff] flex items-center justify-center text-[10px] text-slate-950 font-bold">▼</span>
                <span>スローボール: ボールスピード低下 8s</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER SECTION */}
      <footer className="w-full max-w-7xl px-8 py-4 flex flex-col md:flex-row items-center justify-between text-[11px] text-white/30 gap-2 border-t border-white/5 bg-[#121214] rounded-2xl shadow-inner mt-4">
        <div>
          <span>© 10-06-2026 CHROMA BREAK Engine.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>[SPACE] またはタップ：カラー切り替え</span>
          <span>•</span>
          <span>[1][2][3][4]：クイック選択</span>
        </div>
      </footer>

    </div>
  );
}

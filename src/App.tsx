/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Play, RotateCcw, Shield, Target, Zap } from 'lucide-react';
import { GameStatus, Point, Rocket, Interceptor, Explosion, City, Turret } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TARGET_SCORE = 1000;

const INITIAL_TURRETS: Turret[] = [
  { id: 't1', x: 80, y: 550, ammo: 20, maxAmmo: 20, active: true },
  { id: 't2', x: 400, y: 550, ammo: 40, maxAmmo: 40, active: true },
  { id: 't3', x: 720, y: 550, ammo: 20, maxAmmo: 20, active: true },
];

const INITIAL_CITIES: City[] = [
  { id: 'c1', x: 180, y: 570, active: true },
  { id: 'c2', x: 260, y: 570, active: true },
  { id: 'c3', x: 340, y: 570, active: true },
  { id: 'c4', x: 460, y: 570, active: true },
  { id: 'c5', x: 540, y: 570, active: true },
  { id: 'c6', x: 620, y: 570, active: true },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  // Refs for game entities to avoid React state overhead in the loop
  const rocketsRef = useRef<Rocket[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>(INITIAL_CITIES.map(c => ({ ...c })));
  const turretsRef = useRef<Turret[]>(INITIAL_TURRETS.map(t => ({ ...t })));
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);

  const t = {
    zh: {
      title: "LIAOZHIH星空防御",
      start: "开始游戏",
      win: "胜利！",
      lose: "城市陷落",
      restart: "再玩一次",
      score: "得分",
      level: "关卡",
      ammo: "弹药",
      mission: "目标：1000分",
      instructions: "点击屏幕发射拦截导弹。保护城市和炮台！",
    },
    en: {
      title: "LIAOZHIH Starry Defense",
      start: "Start Game",
      win: "Victory!",
      lose: "Cities Fallen",
      restart: "Play Again",
      score: "Score",
      level: "Level",
      ammo: "Ammo",
      mission: "Goal: 1000 Pts",
      instructions: "Click to fire interceptors. Protect cities and turrets!",
    }
  }[language];

  const resetGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setGameState(GameStatus.PLAYING);
    rocketsRef.current = [];
    interceptorsRef.current = [];
    explosionsRef.current = [];
    citiesRef.current = INITIAL_CITIES.map(c => ({ ...c }));
    turretsRef.current = INITIAL_TURRETS.map(t => ({ ...t }));
  }, []);

  const spawnRocket = useCallback(() => {
    const targets = [...citiesRef.current.filter(c => c.active), ...turretsRef.current.filter(t => t.active)];
    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const startX = Math.random() * CANVAS_WIDTH;
    
    const newRocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      x: startX,
      y: 0,
      targetX: target.x,
      targetY: target.y,
      speed: 0.0005 + (level * 0.0002),
      progress: 0,
    };
    rocketsRef.current.push(newRocket);
  }, [level]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== GameStatus.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Find best turret
    let bestTurret: Turret | null = null;
    let minDist = Infinity;

    turretsRef.current.forEach(t => {
      if (t.active && t.ammo > 0) {
        const dist = Math.abs(t.x - x);
        if (dist < minDist) {
          minDist = dist;
          bestTurret = t;
        }
      }
    });

    if (bestTurret) {
      (bestTurret as Turret).ammo -= 1;
      interceptorsRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        x: (bestTurret as Turret).x,
        y: (bestTurret as Turret).y,
        startX: (bestTurret as Turret).x,
        startY: (bestTurret as Turret).y,
        targetX: x,
        targetY: y,
        speed: 0.02,
        progress: 0,
      });
    }
  };

  const update = useCallback((time: number) => {
    if (gameState !== GameStatus.PLAYING) return;

    // Spawn rockets
    const spawnInterval = Math.max(500, 2000 - level * 200);
    if (time - lastSpawnTime.current > spawnInterval) {
      spawnRocket();
      lastSpawnTime.current = time;
    }

    // Update rockets
    rocketsRef.current = rocketsRef.current.filter(r => {
      r.progress += r.speed;
      r.x = r.x + (r.targetX - r.x) * r.speed / (1 - r.progress + 0.001);
      r.y = r.y + (r.targetY - r.y) * r.speed / (1 - r.progress + 0.001);

      if (r.progress >= 1) {
        // Hit target
        const city = citiesRef.current.find(c => Math.abs(c.x - r.targetX) < 5 && Math.abs(c.y - r.targetY) < 5);
        if (city) city.active = false;
        const turret = turretsRef.current.find(t => Math.abs(t.x - r.targetX) < 5 && Math.abs(t.y - r.targetY) < 5);
        if (turret) turret.active = false;

        // Check loss condition
        if (turretsRef.current.every(t => !t.active)) {
          setGameState(GameStatus.LOST);
        }
        return false;
      }
      return true;
    });

    // Update interceptors
    interceptorsRef.current = interceptorsRef.current.filter(i => {
      i.progress += i.speed;
      const dx = i.targetX - i.startX;
      const dy = i.targetY - i.startY;
      i.x = i.startX + dx * i.progress;
      i.y = i.startY + dy * i.progress;

      if (i.progress >= 1) {
        explosionsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          x: i.targetX,
          y: i.targetY,
          radius: 0,
          maxRadius: 40,
          expanding: true,
          life: 1,
        });
        return false;
      }
      return true;
    });

    // Update explosions
    explosionsRef.current = explosionsRef.current.filter(e => {
      if (e.expanding) {
        e.radius += 2;
        if (e.radius >= e.maxRadius) e.expanding = false;
      } else {
        e.life -= 0.02;
        e.radius -= 0.5;
      }

      // Check collisions with rockets
      rocketsRef.current = rocketsRef.current.filter(r => {
        const dist = Math.sqrt((r.x - e.x) ** 2 + (r.y - e.y) ** 2);
        if (dist < e.radius) {
          setScore(prev => {
            const newScore = prev + 20;
            if (newScore >= TARGET_SCORE) {
              setGameState(GameStatus.WON);
            }
            return newScore;
          });
          return false;
        }
        return true;
      });

      return e.life > 0;
    });

    // Level up logic (optional, but adds progression)
    if (score > level * 200 && level < 5) {
      setLevel(prev => prev + 1);
      // Refill ammo on level up
      turretsRef.current.forEach(t => {
        if (t.active) t.ammo = t.maxAmmo;
      });
    }

  }, [gameState, level, score, spawnRocket]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 550, CANVAS_WIDTH, 50);

    // Draw Cities
    citiesRef.current.forEach(c => {
      if (c.active) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(c.x - 15, c.y - 10, 30, 20);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(c.x - 10, c.y - 15, 10, 10);
        ctx.fillRect(c.x + 2, c.y - 12, 8, 8);
      } else {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Turrets
    turretsRef.current.forEach(t => {
      if (t.active) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(t.x - 20, t.y + 20);
        ctx.lineTo(t.x + 20, t.y + 20);
        ctx.lineTo(t.x, t.y - 10);
        ctx.closePath();
        ctx.fill();
        
        // Ammo indicator
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.ammo.toString(), t.x, t.y + 35);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(t.x - 15, t.y + 15);
        ctx.lineTo(t.x + 15, t.y - 15);
        ctx.moveTo(t.x + 15, t.y + 15);
        ctx.lineTo(t.x - 15, t.y - 15);
        ctx.stroke();
      }
    });

    // Draw Rockets
    ctx.lineWidth = 1;
    rocketsRef.current.forEach(r => {
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(r.x - (r.targetX - r.x) * 0.1, r.y - (r.targetY - r.y) * 0.1);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Interceptors
    interceptorsRef.current.forEach(i => {
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(i.startX, i.startY);
      ctx.lineTo(i.x, i.y);
      ctx.stroke();

      // Target X
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(i.targetX - 5, i.targetY - 5);
      ctx.lineTo(i.targetX + 5, i.targetY + 5);
      ctx.moveTo(i.targetX + 5, i.targetY - 5);
      ctx.lineTo(i.targetX - 5, i.targetY + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(e => {
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${e.life})`);
      gradient.addColorStop(0.4, `rgba(251, 191, 36, ${e.life})`);
      gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, []);

  const gameLoop = useCallback((time: number) => {
    update(time);
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-mono">{t.mission}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-white/40 font-mono">{t.score}</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{score.toString().padStart(4, '0')}</span>
          </div>
          <button 
            onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
            className="px-3 py-1 rounded-full border border-white/10 text-xs hover:bg-white/5 transition-colors"
          >
            {language === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="relative w-full h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="relative aspect-[4/3] w-full max-w-4xl bg-black shadow-2xl shadow-black/50 border border-white/5 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleCanvasClick}
            onTouchStart={handleCanvasClick}
            className="w-full h-full cursor-crosshair touch-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === GameStatus.START && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-center items-center justify-center p-8 text-center"
              >
                <div className="max-w-md">
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <h2 className="text-5xl font-black tracking-tighter italic text-emerald-500">{t.title}</h2>
                      <p className="text-white/60 text-sm">{t.instructions}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 py-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-400" />
                        <span className="text-[10px] uppercase font-mono">Precision</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="text-[10px] uppercase font-mono">Speed</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <span className="text-[10px] uppercase font-mono">Defense</span>
                      </div>
                    </div>

                    <button
                      onClick={resetGame}
                      className="group relative px-12 py-4 bg-emerald-500 text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Play className="w-5 h-5 fill-current" />
                        {t.start}
                      </span>
                      <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20" />
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {gameState === GameStatus.WON && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="bg-black p-12 rounded-[3rem] border-4 border-emerald-500 shadow-2xl shadow-emerald-500/40 space-y-6"
                >
                  <Trophy className="w-24 h-24 text-emerald-500 mx-auto animate-bounce" />
                  <div className="space-y-2">
                    <h2 className="text-6xl font-black italic tracking-tighter text-white">{t.win}</h2>
                    <p className="text-emerald-400 font-mono text-xl">{t.score}: {score}</p>
                  </div>
                  <button
                    onClick={resetGame}
                    className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {t.restart}
                  </button>
                </motion.div>
              </motion.div>
            )}

            {gameState === GameStatus.LOST && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-red-500/20 backdrop-blur-md flex items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-black p-12 rounded-[3rem] border-4 border-red-500 shadow-2xl shadow-red-500/40 space-y-6"
                >
                  <Skull className="w-24 h-24 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <h2 className="text-6xl font-black italic tracking-tighter text-white">{t.lose}</h2>
                    <p className="text-red-400 font-mono text-xl">{t.score}: {score}</p>
                  </div>
                  <button
                    onClick={resetGame}
                    className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {t.restart}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-center gap-12 pointer-events-none">
        <div className="flex gap-8 bg-black/60 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-white/40 font-mono mb-1">{t.level}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(l => (
                <div 
                  key={l} 
                  className={`w-2 h-6 rounded-full transition-all duration-500 ${l <= level ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} 
                />
              ))}
            </div>
          </div>
          
          <div className="w-px h-10 bg-white/10 self-center" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-white/40 font-mono mb-1">Cities</span>
            <div className="flex gap-1">
              {citiesRef.current.map((c, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-sm transition-all duration-300 ${c.active ? 'bg-blue-500' : 'bg-red-900/50'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

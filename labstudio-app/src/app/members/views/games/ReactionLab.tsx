'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trophy, Zap, ArrowLeft, Volume2, VolumeX,
    ChevronRight, Play, Timer
} from 'lucide-react';

const GAME_DURATION = 30; // seconds

interface Target {
    id: string;
    x: number;
    y: number;
    scale: number;
    createdAt: number;
}

type WindowWithWebkitAudioContext = Window & {
    webkitAudioContext?: typeof AudioContext;
};

const getAudioContextCtor = () => {
    if (typeof window === 'undefined') return null;
    const win = window as WindowWithWebkitAudioContext;
    return window.AudioContext ?? win.webkitAudioContext ?? null;
};

const getRandomUnit = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        return values[0] / 4294967296;
    }
    return 0.5;
};

const createTargetId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const values = new Uint32Array(2);
        crypto.getRandomValues(values);
        return `${values[0]}-${values[1]}`;
    }
    return `${Date.now()}`;
};

const playPopSound = (enabled: boolean) => {
    if (!enabled) return;
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;
    const audioCtx = new AudioContextCtor();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
};

interface ReactionLabProps {
    onExit: () => void;
}

export default function ReactionLab({ onExit }: ReactionLabProps) {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
    const [targets, setTargets] = useState<Target[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const gameRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const spawnTarget = useCallback(() => {
        if (!gameRef.current) return;
        const { width, height } = gameRef.current.getBoundingClientRect();
        const padding = 60;
        const newTarget: Target = {
            id: createTargetId(),
            x: padding + getRandomUnit() * (width - padding * 2),
            y: padding + getRandomUnit() * (height - padding * 2),
            scale: 1,
            createdAt: Date.now(),
        };
        setTargets(prev => [...prev, newTarget]);
    }, []);

    const startGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setGameState('playing');
        setTargets([]);
        spawnTarget();
        spawnTarget();

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setGameState('gameOver');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTargetClick = (id: string) => {
        if (gameState !== 'playing') return;
        setScore(prev => prev + 1);
        setTargets(prev => prev.filter(t => t.id !== id));
        playPopSound(soundEnabled);
        spawnTarget();
        // Occasionally spawn two
        if (getRandomUnit() > 0.8) spawnTarget();
    };

    const submitScore = useCallback(async (finalScore: number) => {
        try {
            await fetch('/api/lab/games/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: 'reaction-lab', score: finalScore })
            });
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    }, []);

    useEffect(() => {
        if (gameState === 'gameOver') {
            submitScore(score);
        }
    }, [gameState, score, submitScore]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col font-mono text-white p-6">
            {/* Header */}
            <div className="w-full flex items-center justify-between max-w-lg mx-auto">
                <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-black italic uppercase tracking-tighter">REACTION LAB</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Reaction Speed</p>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            {/* Info Bar */}
            <div className="flex justify-between max-w-lg w-full mx-auto mt-6 px-4">
                <div className="flex items-center gap-2">
                    <Timer size={16} className="text-violet-400" />
                    <span className={`text-xl font-black ${timeLeft < 5 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                        {timeLeft}s
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-yellow-400" />
                    <span className="text-xl font-black">{score}</span>
                </div>
            </div>

            {/* Game Stage */}
            <div
                ref={gameRef}
                className="flex-1 relative w-full max-w-2xl mx-auto my-8 border-4 border-zinc-900 bg-zinc-900/20 rounded-3xl overflow-hidden cursor-crosshair touch-none"
            >
                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/80 backdrop-blur-sm z-10">
                        <Zap className="text-yellow-400 mb-6 animate-bounce" size={64} />
                        <h3 className="text-2xl font-black uppercase mb-2">Reaction Challenge</h3>
                        <p className="text-zinc-500 text-xs mb-8 uppercase font-bold tracking-widest max-w-[240px]">
                            Tap the targets as quickly as you can before time runs out.
                        </p>
                        <button
                            onClick={startGame}
                            className="w-full max-w-xs py-4 bg-yellow-400 text-black font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_30px_rgba(250,204,21,0.3)]"
                        >
                            Start Game <Play size={20} fill="currentColor" />
                        </button>
                    </div>
                )}

                {gameState === 'playing' && targets.map(target => (
                    <button
                        key={target.id}
                        onPointerDown={() => handleTargetClick(target.id)}
                        style={{ left: target.x, top: target.y }}
                        className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 group"
                    >
                        <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping"></div>
                        <div className="relative w-full h-full bg-yellow-400 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.5)] active:scale-95 transition-transform">
                            <Zap size={16} className="text-black" />
                        </div>
                    </button>
                ))}

                {gameState === 'gameOver' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/90 backdrop-blur-md z-10">
                        <Trophy className="text-yellow-400 mb-6 animate-bounce" size={64} />
                        <h3 className="text-2xl font-black uppercase mb-2">Time&apos;s Up</h3>
                        <p className="text-zinc-500 text-xs mb-6 uppercase font-bold tracking-widest">Here&apos;s how you did.</p>

                        <div className="w-full max-w-xs bg-zinc-900 p-6 rounded-2xl border border-white/5 mb-8">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                                <span>FINAL SCORE</span>
                                <span className="text-white text-lg">{score}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
                                <span>TAPS PER MINUTE</span>
                                <span className="text-violet-400">{score * 2} TPM</span>
                            </div>
                            <div className="h-px bg-white/5 mb-4"></div>
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <span>Points Earned</span>
                                <span className="text-emerald-400">+{Math.floor(score / 5)}</span>
                            </div>
                        </div>

                        <div className="w-full max-w-xs flex flex-col gap-3">
                            <button
                                onClick={startGame}
                                className="w-full py-4 bg-white text-black font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                            >
                                Play Again <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-zinc-800 text-white font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                Back to Games
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid Pattern Background - Aesthetic Only */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden -z-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>
        </div>
    );
}

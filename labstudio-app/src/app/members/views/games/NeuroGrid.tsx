'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trophy, LayoutGrid, ArrowLeft, Volume2, VolumeX,
    ChevronRight, Star, AlertCircle, Play,
    Search, Eye, Scan
} from 'lucide-react';

const GRID_LEVELS = [
    { size: 3, symbol: 'O', anomaly: '0' },
    { size: 4, symbol: 'X', anomaly: 'K' },
    { size: 5, symbol: '6', anomaly: '9' },
    { size: 6, symbol: 'M', anomaly: 'N' },
    { size: 7, symbol: 'E', anomaly: 'F' },
    { size: 8, symbol: 'S', anomaly: '5' },
    { size: 9, symbol: 'P', anomaly: 'R' },
    { size: 10, symbol: 'W', anomaly: 'V' },
];

const playPingSound = (enabled: boolean, success: boolean) => {
    if (!enabled || typeof window === 'undefined') return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(success ? 800 : 200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
};

interface NeuroGridProps {
    onExit: () => void;
}

export default function NeuroGrid({ onExit }: NeuroGridProps) {
    const [level, setLevel] = useState(0);
    const [grid, setGrid] = useState<string[]>([]);
    const [anomalyIndex, setAnomalyIndex] = useState(-1);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver' | 'complete'>('idle');
    const [timeLeft, setTimeLeft] = useState(30);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const generateGrid = useCallback((lvlIdx: number) => {
        const config = GRID_LEVELS[Math.min(lvlIdx, GRID_LEVELS.length - 1)];
        const total = config.size * config.size;
        const newGrid = Array(total).fill(config.symbol);
        const anomaly = Math.floor(Math.random() * total);
        newGrid[anomaly] = config.anomaly;
        setGrid(newGrid);
        setAnomalyIndex(anomaly);
    }, []);

    const startGame = () => {
        setLevel(0);
        setTimeLeft(30);
        setGameState('playing');
        generateGrid(0);

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

    const handleCellClick = (idx: number) => {
        if (gameState !== 'playing') return;

        if (idx === anomalyIndex) {
            playPingSound(soundEnabled, true);
            if (level >= GRID_LEVELS.length - 1) {
                setGameState('complete');
                if (timerRef.current) clearInterval(timerRef.current);
                submitScore(level * 1000 + timeLeft * 100);
            } else {
                const nextLvl = level + 1;
                setLevel(nextLvl);
                generateGrid(nextLvl);
            }
        } else {
            playPingSound(soundEnabled, false);
            setTimeLeft(prev => Math.max(0, prev - 2)); // Penalty
        }
    };

    const submitScore = async (score: number) => {
        try {
            await fetch('/api/lab/games/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: 'neuro-grid', score })
            });
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    };

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
                    <h2 className="text-lg font-black italic uppercase tracking-tighter">NEURO GRID</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Visual Anomaly Detection</p>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                {gameState === 'idle' && (
                    <div className="text-center p-8 bg-zinc-900/50 border-2 border-white/5 rounded-3xl backdrop-blur-md">
                        <Scan className="text-cyan-400 mx-auto mb-6 animate-pulse" size={64} />
                        <h3 className="text-2xl font-black uppercase mb-2 italic">PATTERN RECOGNITION</h3>
                        <p className="text-zinc-500 text-xs mb-8 uppercase font-bold tracking-widest max-w-[280px]">
                            Identify the structural anomaly in the neural grid. Precision over speed. Failure results in temporal decompression.
                        </p>
                        <button
                            onClick={startGame}
                            className="w-full py-4 bg-cyan-600 text-white font-black italic uppercase rounded-xl shadow-[0_4px_30px_rgba(8,145,178,0.3)] hover:scale-105 transition-all"
                        >
                            EXECUTE SEARCH <Play size={20} className="inline ml-2" fill="currentColor" />
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="w-full flex flex-col items-center">
                        <div className="flex justify-between w-full mb-6 text-xs font-black uppercase tracking-widest px-4">
                            <div className="flex items-center gap-2">
                                <Star className="text-cyan-400" size={14} /> LEVEL {level + 1} / {GRID_LEVELS.length}
                            </div>
                            <div className={`flex items-center gap-2 ${timeLeft < 5 ? 'text-rose-500 animate-pulse' : 'text-zinc-400'}`}>
                                <Search size={14} /> {timeLeft}S REMAINING
                            </div>
                        </div>

                        <div
                            className="grid gap-1 p-2 bg-zinc-900 rounded-xl border border-white/5 shadow-2xl"
                            style={{
                                gridTemplateColumns: `repeat(${GRID_LEVELS[level].size}, minmax(0, 1fr))`,
                                width: 'min(90vw, 400px)',
                                height: 'min(90vw, 400px)',
                            }}
                        >
                            {grid.map((cell, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleCellClick(idx)}
                                    className="flex items-center justify-center bg-zinc-950 text-xs font-black hover:bg-zinc-800 transition-colors rounded-sm border border-white/5"
                                >
                                    {cell}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(gameState === 'gameOver' || gameState === 'complete') && (
                    <div className="text-center p-8 bg-zinc-900 border-4 border-cyan-500 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] w-full max-w-sm">
                        <Trophy className={`mx-auto mb-6 ${gameState === 'complete' ? 'text-yellow-400 animate-bounce' : 'text-rose-500'}`} size={64} />
                        <h3 className="text-2xl font-black italic uppercase tracking-wide mb-2">
                            {gameState === 'complete' ? 'NEURAL SYNC ACHIEVED' : 'SYNC FAILURE'}
                        </h3>
                        <p className="text-zinc-500 text-xs mb-6 uppercase font-bold tracking-widest">
                            {gameState === 'complete' ? 'All anomalies neutralized.' : 'Temporal limit exceeded.'}
                        </p>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 mb-8 text-left">
                            <div className="flex justify-between text-[10px] font-black uppercase text-zinc-400 mb-2">
                                <span>NEURAL LOAD LEVEL</span>
                                <span>{level + 1}</span>
                            </div>
                            <div className="flex justify-between text-xs font-black uppercase text-white mb-4">
                                <span>FINAL READOUT (SCORE)</span>
                                <span className="text-cyan-400">{(level * 1000 + timeLeft * 100).toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-white/5 mb-4"></div>
                            <div className="flex justify-between text-[10px] font-black uppercase text-emerald-400">
                                <span>XP AWARDED</span>
                                <span>+{gameState === 'complete' ? 60 : level * 5} XP</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={startGame}
                                className="w-full py-4 bg-white text-black font-black italic uppercase rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all"
                            >
                                RE-INITIALIZE <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-zinc-800 text-white font-black italic uppercase rounded-xl flex items-center justify-center gap-2"
                            >
                                ARCADE BASE
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cyber Background Lines */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] -z-10">
                <div className="absolute top-0 left-1/4 w-px h-full bg-cyan-400"></div>
                <div className="absolute top-0 left-3/4 w-px h-full bg-cyan-400"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-400"></div>
            </div>
        </div>
    );
}

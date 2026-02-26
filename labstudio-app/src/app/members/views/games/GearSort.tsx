'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    RefreshCw, RotateCcw, Plus, Trophy, ChevronRight, Zap,
    Settings, Volume2, VolumeX, Menu, Play, Lock, Star,
    X, ArrowLeft, Activity
} from 'lucide-react';

// --- CONFIG ---
const PIXEL_COLORS: Record<string, { bg: string, border: string, highlight: string }> = {
    RUBY: { bg: 'bg-rose-500', border: 'border-rose-700', highlight: 'bg-rose-300' },
    SAPPHIRE: { bg: 'bg-blue-500', border: 'border-blue-700', highlight: 'bg-blue-300' },
    EMERALD: { bg: 'bg-emerald-500', border: 'border-emerald-700', highlight: 'bg-emerald-300' },
    AMETHYST: { bg: 'bg-violet-500', border: 'border-violet-700', highlight: 'bg-violet-300' },
    GOLD: { bg: 'bg-amber-400', border: 'border-amber-600', highlight: 'bg-amber-100' },
    PEARL: { bg: 'bg-slate-200', border: 'border-slate-400', highlight: 'bg-white' },
    CYAN: { bg: 'bg-cyan-400', border: 'border-cyan-600', highlight: 'bg-cyan-200' },
    ORANGE: { bg: 'bg-orange-500', border: 'border-orange-700', highlight: 'bg-orange-300' },
};

const LEVEL_CONFIGS = [
    { colors: 3, empty: 2 },
    { colors: 4, empty: 2 },
    { colors: 5, empty: 2 },
    { colors: 6, empty: 2 },
    { colors: 7, empty: 2 },
    { colors: 8, empty: 2 },
];

const TUBE_CAPACITY = 4;

// --- AUDIO ---
const playSound = (type: 'select' | 'drop' | 'win' | 'error', enabled: boolean) => {
    if (!enabled || typeof window === 'undefined') return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
    } else if (type === 'drop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start();
        osc.stop(now + 0.2);
    } else if (type === 'win') {
        [523, 659, 784, 1046].forEach((f, i) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, now + i * 0.1);
            o.connect(g);
            g.connect(audioCtx.destination);
            g.gain.setValueAtTime(0.1, now + i * 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            o.start(now + i * 0.1);
            o.stop(now + i * 0.1 + 0.3);
        });
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start();
        osc.stop(now + 0.2);
    }
};

// --- HELPERS ---
const cloneState = (tubes: string[][]) => tubes.map(tube => [...tube]);

const getTopChunkSize = (tube: string[]) => {
    if (tube.length === 0) return 0;
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0; i--) {
        if (tube[i] === color) count++;
        else break;
    }
    return count;
};

const generateLevel = (levelNumber: number) => {
    const config = LEVEL_CONFIGS[Math.min(levelNumber - 1, LEVEL_CONFIGS.length - 1)];
    const colorKeys = Object.keys(PIXEL_COLORS).slice(0, config.colors);

    let tubes: string[][] = [];
    colorKeys.forEach(color => {
        tubes.push(Array(TUBE_CAPACITY).fill(color));
    });
    for (let i = 0; i < config.empty; i++) {
        tubes.push([]);
    }

    const shuffleMoves = 100 + (levelNumber * 20);
    let currentTubes = cloneState(tubes);

    for (let i = 0; i < shuffleMoves; i++) {
        const nonEmpty = currentTubes.map((t, i) => t.length > 0 ? i : -1).filter(i => i !== -1);
        if (!nonEmpty.length) continue;
        const from = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];

        const notFull = currentTubes.map((t, i) => t.length < TUBE_CAPACITY && i !== from ? i : -1).filter(i => i !== -1);
        if (!notFull.length) continue;
        const to = notFull[Math.floor(Math.random() * notFull.length)];

        currentTubes[to].push(currentTubes[from].pop()!);
    }
    return currentTubes;
};

// --- COMPONENTS ---
const NeuralCore = ({ colorKey, size = "md" }: { colorKey: string, size?: "sm" | "md" }) => {
    const theme = PIXEL_COLORS[colorKey] || PIXEL_COLORS.PEARL;
    const sizeClasses = size === "sm" ? "w-6 h-6 border-2" : "w-10 h-10 border-4";

    return (
        <div className={`relative ${sizeClasses} ${theme.bg} ${theme.border} rounded flex-shrink-0 select-none shadow-lg`} style={{ imageRendering: 'pixelated' }}>
            <div className={`absolute top-0.5 left-0.5 w-1/3 h-1/3 ${theme.highlight} opacity-60 rounded-sm`}></div>
            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-black/20 rounded-full"></div>
        </div>
    );
};

interface GearSortProps {
    onExit: () => void;
}

export default function GearSort({ onExit }: GearSortProps) {
    const [level, setLevel] = useState(1);
    const [tubes, setTubes] = useState<string[][]>([]);
    const [history, setHistory] = useState<string[][][]>([]);
    const [selectedTube, setSelectedTube] = useState<number | null>(null);
    const [isGameWon, setIsGameWon] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [xpToAward, setXpToAward] = useState(0);

    useEffect(() => {
        setTubes(generateLevel(level));
    }, [level]);

    const handleTubeClick = (index: number) => {
        if (isGameWon) return;

        if (selectedTube === index) {
            setSelectedTube(null);
            return;
        }

        if (selectedTube === null) {
            if (tubes[index].length > 0) {
                setSelectedTube(index);
                playSound('select', soundEnabled);
            }
            return;
        }

        // Attempt Move
        const sourceIdx = selectedTube;
        const destIdx = index;
        const sourceTube = tubes[sourceIdx];
        const destTube = tubes[destIdx];

        if (sourceTube.length === 0) {
            setSelectedTube(null);
            return;
        }

        const colorToMove = sourceTube[sourceTube.length - 1];
        const sourceChunkSize = getTopChunkSize(sourceTube);
        const spaceInDest = TUBE_CAPACITY - destTube.length;

        if (spaceInDest > 0 && (destTube.length === 0 || destTube[destTube.length - 1] === colorToMove)) {
            const amountToMove = Math.min(sourceChunkSize, spaceInDest);
            const newTubes = cloneState(tubes);
            for (let i = 0; i < amountToMove; i++) {
                newTubes[destIdx].push(newTubes[sourceIdx].pop()!);
            }

            setHistory([...history, tubes]);
            setTubes(newTubes);
            setSelectedTube(null);
            playSound('drop', soundEnabled);

            // Check Win
            const allCorrect = newTubes.every(tube => {
                if (tube.length === 0) return true;
                if (tube.length !== TUBE_CAPACITY) return false;
                return tube.every(color => color === tube[0]);
            });

            if (allCorrect) {
                setIsGameWon(true);
                const xp = 50 + (level * 10);
                setXpToAward(xp);
                playSound('win', soundEnabled);
                submitScore(level * 1000, xp);
            }
        } else {
            setSelectedTube(null);
            playSound('error', soundEnabled);
        }
    };

    const submitScore = async (score: number, xp: number) => {
        try {
            await fetch('/api/lab/games/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: 'gear-sort', score })
            });
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    };

    const undoMove = () => {
        if (history.length === 0 || isGameWon) return;
        const previous = history[history.length - 1]!;
        setTubes(previous);
        setHistory(history.slice(0, -1));
        setSelectedTube(null);
    };

    return (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col font-mono text-white">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between">
                <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-black italic uppercase tracking-tighter">GEAR SORT</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Neural Circuit {level.toString().padStart(2, '0')}</p>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            {/* Game Stage */}
            <div className="flex-1 flex flex-wrap justify-center items-center gap-6 p-8 overflow-y-auto">
                {tubes.map((tube, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleTubeClick(idx)}
                        className={`
              relative flex flex-col-reverse items-center justify-start
              w-16 h-48 rounded-b-2xl
              border-x-4 border-b-4 bg-zinc-900/80
              transition-all duration-200 cursor-pointer
              ${selectedTube === idx ? 'translate-y-[-8px] border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-zinc-800 hover:border-zinc-700'}
              ${isGameWon && tube.length === TUBE_CAPACITY ? 'border-emerald-500 brightness-110' : ''}
            `}
                    >
                        <div className="flex flex-col-reverse w-full items-center mb-2 gap-1.5">
                            {tube.map((color, cidx) => (
                                <NeuralCore key={`${idx}-${cidx}`} colorKey={color} />
                            ))}
                        </div>

                        {/* Gloss Highlight */}
                        <div className="absolute top-2 right-2 w-1 h-24 bg-white/5 pointer-events-none rounded-full"></div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="p-6 bg-zinc-900/80 backdrop-blur-md border-t border-white/5 flex gap-4">
                <button
                    onClick={undoMove}
                    disabled={history.length === 0 || isGameWon}
                    className="flex-1 py-4 bg-zinc-800 disabled:opacity-30 rounded-xl border border-white/5 flex flex-col items-center gap-1 hover:bg-zinc-700 transition-colors"
                >
                    <RotateCcw size={20} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">UNDO DRIVE</span>
                </button>
                <button
                    onClick={() => setLevel(level)}
                    disabled={isGameWon}
                    className="flex-1 py-4 bg-zinc-800 rounded-xl border border-white/5 flex flex-col items-center gap-1 hover:bg-zinc-700 transition-colors"
                >
                    <RefreshCw size={20} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">RESET RESET</span>
                </button>
            </div>

            {/* Win Modal */}
            {isGameWon && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border-4 border-violet-500 p-8 rounded-3xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(139,92,246,0.5)]">
                        <div className="relative inline-block mb-6">
                            <Trophy size={64} className="text-yellow-400 animate-bounce" />
                            <Star className="absolute -top-2 -left-4 text-violet-400 animate-pulse" size={24} />
                            <Star className="absolute -bottom-2 -right-4 text-violet-400 animate-pulse" size={20} />
                        </div>
                        <h3 className="text-2xl font-black italic uppercase italic tracking-wide mb-2">NEURAL SYNC COMPLETE</h3>
                        <p className="text-zinc-500 text-xs mb-6 uppercase font-bold tracking-widest">Efficiency threshold met.</p>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 mb-8">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                <span>XP GAINED</span>
                                <span className="text-emerald-400">+{xpToAward}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <span>ACCURACY</span>
                                <span className="text-violet-400">100%</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setLevel(level + 1);
                                setIsGameWon(false);
                                setHistory([]);
                            }}
                            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
                        >
                            NEXT DOWNLOAD <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

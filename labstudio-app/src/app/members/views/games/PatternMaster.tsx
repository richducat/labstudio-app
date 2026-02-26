'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trophy, Brain, ArrowLeft, Volume2, VolumeX,
    ChevronRight, Star, AlertCircle, Play
} from 'lucide-react';

const NODES = [
    { id: 0, color: 'bg-rose-500', activeColor: 'bg-rose-300', shadow: 'shadow-rose-500/50', freq: 261.63 }, // C4
    { id: 1, color: 'bg-blue-500', activeColor: 'bg-blue-300', shadow: 'shadow-blue-500/50', freq: 329.63 }, // E4
    { id: 2, color: 'bg-emerald-500', activeColor: 'bg-emerald-300', shadow: 'shadow-emerald-500/50', freq: 392.00 }, // G4
    { id: 3, color: 'bg-amber-400', activeColor: 'bg-amber-200', shadow: 'shadow-amber-400/50', freq: 523.25 }, // C5
];

const playNodeSound = (freq: number, enabled: boolean) => {
    if (!enabled || typeof window === 'undefined') return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
};

interface PatternMasterProps {
    onExit: () => void;
}

export default function PatternMaster({ onExit }: PatternMasterProps) {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [activeNode, setActiveNode] = useState<number | null>(null);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'waiting' | 'gameOver'>('idle');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [highScore, setHighScore] = useState(0);

    const playSequence = useCallback(async (seq: number[]) => {
        setGameState('playing');
        for (const nodeId of seq) {
            setActiveNode(nodeId);
            playNodeSound(NODES[nodeId].freq, soundEnabled);
            await new Promise(r => setTimeout(r, 600));
            setActiveNode(null);
            await new Promise(r => setTimeout(r, 200));
        }
        setGameState('waiting');
        setUserSequence([]);
    }, [soundEnabled]);

    const startNewGame = () => {
        const firstNode = Math.floor(Math.random() * 4);
        const newSeq = [firstNode];
        setSequence(newSeq);
        setGameState('playing');
        setTimeout(() => playSequence(newSeq), 1000);
    };

    const handleNodeClick = (id: number) => {
        if (gameState !== 'waiting') return;

        playNodeSound(NODES[id].freq, soundEnabled);
        setActiveNode(id);
        setTimeout(() => setActiveNode(null), 200);

        const newUserSeq = [...userSequence, id];
        setUserSequence(newUserSeq);

        // Check if correct
        if (id !== sequence[userSequence.length]) {
            setGameState('gameOver');
            submitScore(sequence.length - 1);
            return;
        }

        // Check if finished sequence
        if (newUserSeq.length === sequence.length) {
            setGameState('playing');
            const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
            setSequence(nextSeq);
            setTimeout(() => playSequence(nextSeq), 1000);
        }
    };

    const submitScore = async (score: number) => {
        try {
            await fetch('/api/lab/games/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: 'pattern-master', score: score * 100 })
            });
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-between font-mono text-white p-6">
            {/* Header */}
            <div className="w-full flex items-center justify-between max-w-lg">
                <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-black italic uppercase tracking-tighter">PATTERN MASTER</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Neural Sequence Sync</p>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            {/* Main Game Circle */}
            <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Central Brain Hub */}
                <div className={`absolute w-32 h-32 bg-zinc-900 rounded-full z-10 border-4 border-zinc-800 flex items-center justify-center shadow-inner ${gameState === 'playing' ? 'animate-pulse' : ''}`}>
                    <Brain size={48} className={`${gameState === 'waiting' ? 'text-emerald-500' : 'text-zinc-700'}`} />
                </div>

                {/* Outer Nodes */}
                <div className="grid grid-cols-2 gap-4 w-full h-full max-w-[320px]">
                    {NODES.map((node) => (
                        <button
                            key={node.id}
                            disabled={gameState !== 'waiting' && gameState !== 'idle'}
                            onClick={() => handleNodeClick(node.id)}
                            className={`
                w-full h-full aspect-square rounded-3xl transition-all duration-200
                ${activeNode === node.id ? `${node.activeColor} scale-95 shadow-[0_0_40px_rgba(255,255,255,0.5)]` : `${node.color} opacity-40 hover:opacity-60 scale-100 shadow-none`}
                border-4 border-black/20
              `}
                        />
                    ))}
                </div>
            </div>

            {/* Footer Info */}
            <div className="w-full max-w-sm flex flex-col items-center gap-4">
                {gameState === 'idle' && (
                    <button
                        onClick={startNewGame}
                        className="w-full py-6 bg-violet-600 hover:bg-violet-500 text-white font-black italic uppercase rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_30px_rgba(139,92,246,0.3)] animate-bounce"
                    >
                        INITIATE SEQUENCE <Play size={20} fill="currentColor" />
                    </button>
                )}

                {gameState === 'waiting' && (
                    <div className="flex flex-col items-center animate-bounce">
                        <p className="text-emerald-500 font-black italic uppercase text-lg tracking-tighter">YOUR DRIVE</p>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Replicate the neural link</p>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex flex-col items-center">
                        <p className="text-violet-400 font-black italic uppercase text-lg tracking-tighter">OS DOWNLOAD...</p>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Observe the sequence</p>
                    </div>
                )}

                <div className="flex gap-8 mt-4">
                    <div className="text-center">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Current Round</p>
                        <p className="text-2xl font-black">{sequence.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">High Round</p>
                        <p className="text-2xl font-black text-violet-400">{Math.max(sequence.length, 1)}</p>
                    </div>
                </div>
            </div>

            {/* Game Over Modal */}
            {gameState === 'gameOver' && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border-4 border-rose-500 p-8 rounded-3xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(244,63,94,0.3)]">
                        <div className="mb-6 flex justify-center">
                            <AlertCircle size={64} className="text-rose-500" />
                        </div>
                        <h3 className="text-2xl font-black italic uppercase tracking-wide mb-2">SYNC INTERRUPTED</h3>
                        <p className="text-zinc-500 text-xs mb-6 uppercase font-bold tracking-widest">Neural connection severed at round {sequence.length - 1}.</p>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 mb-8">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                <span>NEURAL XP</span>
                                <span className="text-emerald-400">+{(sequence.length - 1) * 10}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <span>EFFICIENCY</span>
                                <span className="text-rose-400">{Math.round(((sequence.length - 1) / 15) * 100)}%</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={startNewGame}
                                className="w-full py-4 bg-white text-black font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                            >
                                RETRY LINK <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-zinc-800 text-white font-black italic uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-zinc-700"
                            >
                                RETURN TO ARCADE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

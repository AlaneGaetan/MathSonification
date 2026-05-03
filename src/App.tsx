/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Activity, Waves, Settings2, Github } from 'lucide-react';
import * as math from 'mathjs';
import { AudioEngine, SonifyMode } from './lib/AudioEngine';
import { WaveVisualizer } from './components/WaveVisualizer';
import { cn } from './lib/utils';

const PRESETS = [
  { name: 'Sine Sweep', expr: 'sin(x * 3) + cos(x * 5)', mode: 'sweep' as SonifyMode, duration: 4 },
  { name: 'Bouncing Drop', expr: 'abs(sin(x * 8) * exp(-x/2))', mode: 'sweep' as SonifyMode, duration: 3 },
  { name: 'FM Synth', expr: 'sin(2 * pi * 440 * t + 5 * sin(2 * pi * 110 * t))', mode: 'waveform' as SonifyMode, duration: 2 },
  { name: 'A440 Pure Tone', expr: 'sin(t * 440 * 2 * pi)', mode: 'waveform' as SonifyMode, duration: 2 },
];

export default function App() {
  const [expr, setExpr] = useState('sin(x * 3) + cos(x * 5)');
  const [mode, setMode] = useState<SonifyMode>('sweep');
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(10);
  const [duration, setDuration] = useState(4);
  
  const [isValid, setIsValid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => engineRef.current?.stop();
  }, []);

  useEffect(() => {
    try {
      if (!expr) throw new Error();
      math.compile(expr);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  }, [expr]);

  useEffect(() => {
    if (isPlaying && startedAt) {
       const timer = setTimeout(() => {
          setIsPlaying(false);
          setStartedAt(null);
       }, duration * 1000);
       return () => clearTimeout(timer);
    }
  }, [isPlaying, startedAt, duration]);

  const togglePlay = () => {
    if (isPlaying) {
      engineRef.current?.stop();
      setIsPlaying(false);
      setStartedAt(null);
      return;
    }

    if (!isValid || !engineRef.current) return;

    if (mode === 'sweep') {
      engineRef.current.playSweep(expr, xMin, xMax, duration);
    } else {
      engineRef.current.playWaveform(expr, duration);
    }
    
    setIsPlaying(true);
    setStartedAt(Date.now());
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setStartedAt(null);
    setExpr(preset.expr);
    setMode(preset.mode);
    setDuration(preset.duration);
    if (preset.mode === 'sweep') {
        setXMin(0);
        setXMax(10);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      
      <div className="w-full max-w-5xl">
        <header className="mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="title-wrapper">
             <h1 className="font-['Anton'] text-5xl sm:text-7xl uppercase tracking-tight text-[#F27D26] leading-none">
                Math <br/> Sonifier
             </h1>
             <p className="font-mono text-white/50 text-xs tracking-widest uppercase mt-4">
                Hear the shape of equations
             </p>
          </div>
          
          <a href="#" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-mono uppercase">
             <Github size={16} />
             View Source
          </a>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visualizer Panel */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="w-full aspect-[2/1] relative mb-6">
               <WaveVisualizer 
                 expr={expr} 
                 mode={mode} 
                 xMin={xMin} 
                 xMax={xMax} 
                 duration={duration} 
                 startedAt={startedAt} 
                 isValid={isValid} 
               />
               
               {/* Mode Badge */}
               <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                 {mode === 'sweep' ? <Activity size={12} className="text-[#F27D26]" /> : <Waves size={12} className="text-[#00FF00]" />}
                 <span className="font-mono text-[10px] uppercase tracking-wider text-white/80">
                    {mode === 'sweep' ? 'Sweep Mode : Y→Hz' : 'Waveform Mode : Audio Rate'}
                 </span>
               </div>
            </div>

            {/* Input field */}
            <div className="relative">
               <div className="absolute top-0 left-0 w-8 h-full flex items-center justify-center text-white/30 font-mono text-sm border-r border-white/10 bg-white/5 rounded-l-lg">
                 ƒ(x)=
               </div>
               <input 
                 className={cn(
                    "w-full bg-[#151619] border rounded-lg py-4 pl-12 pr-4 font-mono text-lg sm:text-2xl transition-all outline-none",
                    isValid ? "border-white/20 focus:border-[#F27D26]" : "border-red-500/50 text-red-400"
                 )}
                 value={expr}
                 onChange={(e) => setExpr(e.target.value)}
                 placeholder="e.g. sin(x)"
                 spellCheck={false}
               />
               {!isValid && (
                  <span className="absolute -bottom-6 left-0 text-red-500 text-xs font-mono">Syntax Error in expression</span>
               )}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Action Bar */}
            <div className="bg-[#151619] border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center gap-4">
               <button 
                 onClick={togglePlay}
                 disabled={!isValid}
                 className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-50",
                    isPlaying 
                        ? "bg-red-500/20 text-red-500 border border-red-500 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        : "bg-white text-black hover:scale-105"
                 )}
               >
                 {isPlaying ? <Square size={32} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
               </button>
               <div className="font-mono text-xs tracking-widest text-[#8E9299] uppercase">
                 {isPlaying ? 'Playing...' : 'Ready'}
               </div>
            </div>

            {/* Properties */}
            <div className="bg-[#151619] border border-white/10 p-6 rounded-2xl flex flex-col gap-6">
                <div className="flex items-center gap-2 mb-2 pb-4 border-b border-white/10">
                   <Settings2 size={16} className="text-[#8E9299]"/>
                   <h3 className="font-mono text-xs uppercase tracking-widest text-[#8E9299]">Parameters</h3>
                </div>

                {/* Mode Toggle */}
                <div className="flex flex-col gap-3">
                   <label className="font-mono text-[10px] text-white/50 uppercase">Sonification Mode</label>
                   <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-lg">
                      <button 
                         onClick={() => setMode('sweep')}
                         className={cn(
                            "py-2 rounded font-mono text-[11px] uppercase transition-colors",
                            mode === 'sweep' ? "bg-white/10 text-[#F27D26]" : "text-white/40 hover:text-white"
                         )}
                      >
                         Sweep
                      </button>
                      <button 
                         onClick={() => setMode('waveform')}
                         className={cn(
                            "py-2 rounded font-mono text-[11px] uppercase transition-colors",
                            mode === 'waveform' ? "bg-white/10 text-[#00FF00]" : "text-white/40 hover:text-white"
                         )}
                      >
                         Waveform
                      </button>
                   </div>
                </div>

                {/* Sweep config */}
                {mode === 'sweep' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="font-mono text-[10px] text-white/50 uppercase">Domain Start (xMin)</label>
                       <input 
                          type="number" 
                          value={xMin} 
                          onChange={(e) => setXMin(Number(e.target.value))}
                          className="bg-black/40 border border-white/10 py-2 px-3 rounded text-sm font-mono"
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="font-mono text-[10px] text-white/50 uppercase">Domain End (xMax)</label>
                       <input 
                          type="number" 
                          value={xMax} 
                          onChange={(e) => setXMax(Number(e.target.value))}
                          className="bg-black/40 border border-white/10 py-2 px-3 rounded text-sm font-mono"
                       />
                    </div>
                  </div>
                )}
                
                {/* Global Config */}
                <div className="flex flex-col gap-2">
                   <label className="font-mono text-[10px] text-white/50 uppercase">Duration (Seconds)</label>
                   <input 
                      type="range" 
                      min="0.5" 
                      max="10" 
                      step="0.5"
                      value={duration} 
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-[#F27D26]"
                   />
                   <div className="text-right font-mono text-xs text-white/70">{duration.toFixed(1)}s</div>
                </div>
            </div>
            
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                 <button
                   key={preset.name}
                   onClick={() => loadPreset(preset)}
                   className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 rounded-full hover:bg-white border-transparent hover:text-black transition-colors"
                 >
                   {preset.name}
                 </button>
              ))}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

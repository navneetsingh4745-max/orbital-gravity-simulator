import React, { useState, useEffect, useRef } from 'react';
import { PhysicsEngine } from './physics/engine';
import { SimulationView } from './components/SimulationCanvas';
import { EnergyGraph } from './components/EnergyGraph';
import { BottomSheet } from './components/BottomSheet';
import { Body, EnergyData } from './physics/types';
import { ALL_PRESETS } from './physics/presets';
import { Play, Pause, Plus, Settings2, Trash2, Undo2, Redo2, Download } from 'lucide-react';

export default function App() {
  const engineRef = useRef(new PhysicsEngine());
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraScale, setCameraScale] = useState(1);
  const [collisionMode, setCollisionMode] = useState<'none' | 'bounce' | 'merge'>('bounce');

  // Trigger re-renders when history changes or body deletes
  const [tick, setTick] = useState(0); 

  useEffect(() => {
    engineRef.current.loadState(ALL_PRESETS[0].data, { collisionMode: 'bounce' });
    setIsPaused(engineRef.current.isPaused);
  }, []);

  const handleTogglePause = () => {
    engineRef.current.isPaused = !engineRef.current.isPaused;
    setIsPaused(engineRef.current.isPaused);
  };

  const handleBodySelect = (body: Body | null) => {
    setSelectedBodyId(body?.id || null);
  };

  const updateBodyState = (id: string, updates: Partial<Body>) => {
    engineRef.current.saveHistoryState();
    engineRef.current.updateBody(id, updates);
    setTick(t => t + 1); // trigger react refresh
  };

  const addRandomBody = () => {
    engineRef.current.addBody({
      id: Math.random().toString(),
      mass: 50 + Math.random() * 500,
      radius: 10 + Math.random() * 10,
      position: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 },
      velocity: { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 },
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      trail: []
    });
    setTick(t => t + 1);
  };

  const deleteBody = () => {
    if (selectedBodyId) {
      engineRef.current.removeBody(selectedBodyId);
      setSelectedBodyId(null);
      engineRef.current.isPaused = false;
      setIsPaused(false);
      setTick(t => t + 1);
    }
  };

  const exportState = () => {
    const cleanBodies = engineRef.current.bodies.map(b => ({...b, trail: []}));
    const payload = JSON.stringify(cleanBodies, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gravity-preset.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedBody = engineRef.current.bodies.find(b => b.id === selectedBodyId);
  const currentError = energyData.length > 0 ? energyData[energyData.length-1].error : 0;

  return (
    <div className="w-screen h-[100dvh] bg-[#020205] text-[#e2e8f0] relative overflow-hidden select-none font-sans flex flex-col">
      <div className="mesh-bg pointer-events-none"></div>
      
      <header className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl px-4 py-2 glass rounded-2xl z-30 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></div>
          <span className="mono text-[8px] sm:text-[10px] tracking-widest text-teal-400 uppercase hidden sm:block">Engine Active</span>
        </div>
        
        <div className="flex gap-4 sm:gap-8 text-[8px] sm:text-[10px] mono uppercase tracking-tighter text-slate-400">
           {engineRef.current.initialEnergy !== null && (
             <div>ERR: <span className={currentError > 5 ? "text-rose-400 text-shadow-sm" : "text-white"}>{currentError.toFixed(3)}%</span></div>
           )}
           <div>BODIES: <span className="text-white">{engineRef.current.bodies.length}</span></div>
        </div>

        <div className="text-[10px] sm:text-xs font-bold tracking-widest">GRAVITY <span className="text-teal-400">SIM</span></div>
      </header>

      <div className="absolute right-4 top-20 flex flex-col gap-3 z-20">
         <button onClick={() => { engineRef.current.undo(); setTick(t=>t+1); }} className="w-10 h-10 glass rounded-full flex items-center justify-center text-slate-400 hover:text-teal-400 transition-all active:scale-95">
           <Undo2 size={18} />
         </button>
         <button onClick={() => { engineRef.current.redo(); setTick(t=>t+1); }} className="w-10 h-10 glass rounded-full flex items-center justify-center text-slate-400 hover:text-teal-400 transition-all active:scale-95">
           <Redo2 size={18} />
         </button>
      </div>

      <div className="flex-1 relative z-10 w-full h-full">
        <SimulationView 
          engine={engineRef.current}
          onBodySelect={handleBodySelect}
          onEnergyUpdate={setEnergyData}
          selectedBodyId={selectedBodyId}
          cameraScale={cameraScale}
          onCameraScaleChange={setCameraScale}
        />
      </div>

      <EnergyGraph 
        data={energyData}
        expanded={graphExpanded}
        onToggle={() => setGraphExpanded(!graphExpanded)}
      />

      {/* Main Bottom Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 glass p-3 rounded-full shadow-2xl z-20 border border-slate-700/50">
         <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition text-slate-400 hover:text-white border border-slate-700/50">
           <Settings2 size={24} />
         </button>
         
         <button onClick={handleTogglePause} className="w-14 h-14 flex items-center justify-center bg-teal-500/20 hover:bg-teal-500/30 rounded-full transition text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)] border border-teal-500/30">
           {isPaused ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}
         </button>
         
         <button onClick={addRandomBody} className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition text-slate-400 hover:text-teal-400 border border-slate-700/50">
           <Plus size={24} />
         </button>
      </div>

      {/* Selected Body Bottom Sheet */}
      <BottomSheet 
        isOpen={!!selectedBody} 
        onClose={() => {
           setSelectedBodyId(null);
           engineRef.current.isPaused = false;
           setIsPaused(false);
        }}
        title=""
      >
        {selectedBody && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2 mb-6">
              <div className="text-[10px] mono uppercase text-slate-500">Selected Entity</div>
              <div className="text-xl font-light tracking-widest text-white neon-glow mb-2 flex items-center gap-3">
                 <div className="w-4 h-4 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: selectedBody.color, color: selectedBody.color }} />
                 BODY_{selectedBody.id.substring(0,6)}
              </div>
              <button onClick={deleteBody} className="flex items-center justify-center gap-2 px-6 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold uppercase transition hover:bg-rose-500/20">
                <Trash2 size={14} /> Delete
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] mono">
                <span className="text-slate-400 uppercase tracking-widest">Mass</span>
                <span className="text-white">{selectedBody.mass.toFixed(0)} kg</span>
              </div>
              <input 
                type="range" min="1" max="20000" step="10" 
                value={selectedBody.mass}
                onChange={(e) => updateBodyState(selectedBody.id, { mass: Number(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none slider-thumb cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 border border-teal-500/30 rounded-xl">
                <span className="block text-[10px] mono uppercase text-slate-400 mb-1">Velocity X</span>
                <span className="font-mono text-lg text-teal-400">{selectedBody.velocity.x.toFixed(1)}</span>
              </div>
              <div className="p-4 bg-slate-900/50 border border-teal-500/30 rounded-xl">
                <span className="block text-[10px] mono uppercase text-slate-400 mb-1">Velocity Y</span>
                <span className="font-mono text-lg text-teal-400">{selectedBody.velocity.y.toFixed(1)}</span>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-slate-500 mt-4 mono uppercase tracking-widest">
              Drag on canvas to alter vector
            </p>
          </div>
        )}
      </BottomSheet>

      {/* Global Settings Bottom Sheet */}
      <BottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Physics Engine"
      >
        <div className="space-y-6">
          
          <div className="space-y-3">
             <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mono flex items-center justify-between">
                <span>Presets (Load/Save)</span>
                <button onClick={exportState} className="flex gap-1 items-center px-2 py-1 bg-teal-500/10 text-teal-400 rounded-md hover:bg-teal-500/20">
                   <Download size={12}/> EXPORT
                </button>
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               {ALL_PRESETS.map(preset => (
                 <div
                   key={preset.name}
                   onClick={() => {
                     engineRef.current.loadState(preset.data, { collisionMode });
                     setShowSettings(false);
                     setIsPaused(false);
                     setTick(t=>t+1);
                   }}
                   className="p-3 bg-slate-900/50 border border-slate-700 hover:border-teal-500/30 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-teal-500/5 group"
                 >
                   <span className="text-xs font-medium text-slate-300 group-hover:text-teal-400 transition">{preset.name}</span>
                   <span className="text-slate-500 text-lg group-hover:text-teal-400 transition">→</span>
                 </div>
               ))}
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mono">Rules of Engagement</h3>
             <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
               {(['none', 'bounce', 'merge'] as const).map(mode => (
                 <button
                   key={mode}
                   onClick={() => {
                        setCollisionMode(mode); 
                        engineRef.current.config.collisionMode = mode;
                   }}
                   className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                     collisionMode === mode ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50' : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   {mode}
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mono">Viewport Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] mono">
                <span className="text-slate-400 uppercase tracking-widest">Zoom Scale</span>
                <span className="text-white">{cameraScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0.1" max="5" step="0.1" 
                value={cameraScale}
                onChange={(e) => setCameraScale(Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none slider-thumb cursor-pointer"
              />
              <p className="text-slate-500 text-[10px] mono pt-2 text-center">Pinch multi-touch supported</p>
            </div>
          </div>

        </div>
      </BottomSheet>
    </div>
  );
}

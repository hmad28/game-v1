'use client';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store/gameStore';
export default function SettingsScreen() {
  const store = useGameStore();
  const s = store.settings;
  const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center gap-4 mb-3">
      <div className="text-gray-400 text-xs w-32">{label}</div>
      <input type="range" min="0" max="1" step="0.1" value={value} onChange={e=>onChange(parseFloat(e.target.value))} className="flex-1 accent-green-500"/>
      <div className="text-green-400 text-xs w-8">{Math.round(value*100)}%</div>
    </div>
  );
  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="text-gray-400 text-xs">{label}</div>
      <button onClick={()=>onChange(!value)} className={`w-12 h-6 rounded-full transition-colors ${value?'bg-green-500':'bg-gray-700'}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${value?'translate-x-6':'translate-x-0'}`}/>
      </button>
    </div>
  );
  return (
    <div className="w-full h-screen bg-black flex flex-col" style={{fontFamily:'monospace'}}>
      <div className="border-b border-green-900 p-4 flex items-center justify-between">
        <button onClick={()=>store.setScreen('main-menu')} className="text-green-600 hover:text-green-400 text-sm">← BACK</button>
        <div className="text-green-400 text-lg font-bold">⚙ SETTINGS</div>
        <div className="text-green-800 text-xs">CONFIG</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto w-full">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="text-yellow-400 text-xs font-bold mb-3">🔊 AUDIO</div>
          <Slider label="Master Volume" value={s.masterVolume} onChange={v=>store.updateSettings({masterVolume:v})}/>
          <Slider label="Music Volume" value={s.musicVolume} onChange={v=>store.updateSettings({musicVolume:v})}/>
          <Slider label="SFX Volume" value={s.sfxVolume} onChange={v=>store.updateSettings({sfxVolume:v})}/>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="text-blue-400 text-xs font-bold mb-3">🎮 GAMEPLAY</div>
          <Toggle label="Show Damage Numbers" value={s.showDamageNumbers} onChange={v=>store.updateSettings({showDamageNumbers:v})}/>
          <Toggle label="Screen Shake" value={s.screenShake} onChange={v=>store.updateSettings({screenShake:v})}/>
          <Toggle label="Particle Effects" value={s.particleEffects} onChange={v=>store.updateSettings({particleEffects:v})}/>
          <Toggle label="Show FPS" value={s.showFPS} onChange={v=>store.updateSettings({showFPS:v})}/>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="text-purple-400 text-xs font-bold mb-3">🖥 GRAPHICS</div>
          <div className="flex items-center gap-2">
            <div className="text-gray-400 text-xs w-32">Quality</div>
            <div className="flex gap-2">
              {(['low','medium','high'] as const).map(q=>(
                <button key={q} onClick={()=>store.updateSettings({graphicsQuality:q})} className={`px-3 py-1 rounded text-xs border transition-colors ${s.graphicsQuality===q?'border-green-500 text-green-400 bg-green-500/10':'border-gray-700 text-gray-500 hover:border-gray-500'}`}>{q.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
        <motion.button whileHover={{scale:1.02}} onClick={()=>store.resetGame()} className="w-full py-3 border border-red-700 text-red-500 rounded hover:bg-red-500/10 transition-colors text-sm">⚠️ RESET ALL PROGRESS</motion.button>
      </div>
    </div>
  );
}

'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '@/lib/store/gameStore';
import { CHARACTERS } from '@/lib/types/characters';
import { CharacterId } from '@/lib/types/game';
const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
export default function CharacterSelect() {
  const store = useGameStore();
  const [selected, setSelected] = useState<CharacterId>('javascript-fox');
  const [hoveredSkill, setHoveredSkill] = useState<string|null>(null);
  const char = CHARACTERS[selected];
  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden" style={{fontFamily:'monospace'}}>
      <div className="border-b border-green-900 p-4 flex items-center justify-between">
        <button onClick={()=>store.setScreen('main-menu')} className="text-green-600 hover:text-green-400 text-sm">← BACK</button>
        <div className="text-green-400 text-lg font-bold">SELECT YOUR LANGUAGE SPIRIT</div>
        <div className="text-green-800 text-xs">10 CHARACTERS</div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r border-green-900 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {CHARACTER_IDS.map(id=>{
              const c=CHARACTERS[id]; const isSel=selected===id;
              return <motion.button key={id} whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>setSelected(id)} className={`p-3 rounded border text-center transition-all ${isSel?'border-yellow-400 bg-yellow-400/10':'border-gray-700 hover:border-gray-500'}`}>
                <div className="text-2xl mb-1">{c.emoji}</div>
                <div className="text-xs font-bold" style={{color:c.color}}>{c.name}</div>
                <div className="text-xs text-gray-600">{c.language}</div>
              </motion.button>;
            })}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={selected} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}} className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-start gap-6 mb-6">
              <div className="text-8xl">{char.emoji}</div>
              <div>
                <div className="text-3xl font-bold" style={{color:char.color,textShadow:`0 0 20px ${char.color}`}}>{char.name}</div>
                <div className="text-gray-400 text-sm">{char.title}</div>
                <div className="text-xs mt-1" style={{color:char.accentColor}}>Language: {char.language}</div>
                <div className="text-gray-500 text-xs mt-2 max-w-md">{char.description}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                <div className="text-green-400 text-xs font-bold mb-2">BASE STATS</div>
                {[{label:'HP',value:char.stats.maxHp,max:150,color:'#ef4444'},{label:'MP',value:char.stats.maxMana,max:130,color:'#3b82f6'},{label:'ATK',value:char.stats.attack,max:100,color:'#f97316'},{label:'DEF',value:char.stats.defense,max:85,color:'#22c55e'},{label:'SPD',value:char.stats.speed,max:100,color:'#eab308'}].map(s=>(
                  <div key={s.label} className="flex items-center gap-2 mb-1">
                    <div className="text-xs text-gray-500 w-8">{s.label}</div>
                    <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden"><div className="h-full rounded" style={{width:`${(s.value/s.max)*100}%`,backgroundColor:s.color}}/></div>
                    <div className="text-xs text-gray-400 w-8 text-right">{s.value}</div>
                  </div>
                ))}
                <div className="flex gap-4 mt-2 text-xs text-gray-500"><span>CRIT: {(char.stats.critRate*100).toFixed(0)}%</span><span>CRIT DMG: {(char.stats.critDamage*100).toFixed(0)}%</span></div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                <div className="text-purple-400 text-xs font-bold mb-2">PASSIVE: {char.passive.name}</div>
                <div className="text-gray-400 text-xs">{char.passive.description}</div>
                <div className="mt-3 text-yellow-400 text-xs font-bold">LORE</div>
                <div className="text-gray-500 text-xs mt-1">{char.lore}</div>
              </div>
            </div>
            <div className="mb-6">
              <div className="text-yellow-400 text-xs font-bold mb-3">SKILL KIT</div>
              <div className="grid grid-cols-2 gap-3">
                {(['Q','W','E','R'] as const).map(key=>{
                  const skill=char.skills[key];
                  return <motion.div key={key} whileHover={{scale:1.02}} onHoverStart={()=>setHoveredSkill(key)} onHoverEnd={()=>setHoveredSkill(null)} className="bg-gray-900/50 border border-gray-800 rounded p-3 cursor-pointer hover:border-yellow-600 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{skill.icon}</span>
                      <div><div className="text-xs font-bold text-yellow-400">[{key}] {skill.name}</div><div className="text-xs text-gray-600">{skill.manaCost} MP | {(skill.cooldown/1000).toFixed(1)}s CD</div></div>
                    </div>
                    <div className="text-xs text-gray-400">{skill.description}</div>
                    {hoveredSkill===key&&skill.codeSnippet&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="mt-2 bg-black rounded p-2 border border-green-900"><pre className="text-xs text-green-400 overflow-x-auto">{skill.codeSnippet}</pre></motion.div>}
                  </motion.div>;
                })}
              </div>
            </div>
            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>{store.selectCharacter(selected);store.setScreen('game');}} className="w-full py-4 rounded border-2 font-bold text-lg transition-all" style={{borderColor:char.color,color:char.color,background:char.color+'22',textShadow:`0 0 10px ${char.color}`,boxShadow:`0 0 20px ${char.color}44`}}>
              ▶ DEPLOY {char.name.toUpperCase()} INTO THE CORE
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

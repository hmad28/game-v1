'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, usePlayerStats, useSkillCooldowns, useActiveEffects, useNotifications, useDialogueQueue, useDialogueActive } from '@/lib/store/gameStore';
import { CHARACTERS } from '@/lib/types/characters';
import { SkillKey } from '@/lib/types/game';
import { useState, useEffect } from 'react';
export default function GameHUD() {
  const playerStats = usePlayerStats();
  const skillCooldowns = useSkillCooldowns();
  const activeEffects = useActiveEffects();
  const notifications = useNotifications();
  // FIX #185: use separate primitive selectors instead of a combined object selector
  // to prevent infinite re-render loops caused by new object references on every render.
  const dialogueQueue = useDialogueQueue();
  const isDialogueActive = useDialogueActive();
  // FIX #185: use targeted selectors instead of full store subscription to avoid
  // re-rendering GameHUD on every single state change (HP ticks, cooldowns, etc.)
  const selectedCharacter = useGameStore(s => s.selectedCharacter);
  const playerLevel = useGameStore(s => s.playerLevel);
  const gold = useGameStore(s => s.gold);
  const playerXP = useGameStore(s => s.playerXP);
  const playerXPToNext = useGameStore(s => s.playerXPToNext);
  const currentChapter = useGameStore(s => s.currentChapter);
  const defeatedBosses = useGameStore(s => s.defeatedBosses);
  const inventory = useGameStore(s => s.inventory);
  const useSkill = useGameStore(s => s.useSkill);
  const useItem = useGameStore(s => s.useItem);
  const advanceDialogue = useGameStore(s => s.advanceDialogue);
  const setScreen = useGameStore(s => s.setScreen);
  const character = selectedCharacter ? CHARACTERS[selectedCharacter] : null;
  const [showInventory, setShowInventory] = useState(false);
  if (!playerStats || !character) return null;
  const hpPct = (playerStats.hp/playerStats.maxHp)*100;
  const mpPct = (playerStats.mana/playerStats.maxMana)*100;
  const xpPct = (playerXP/playerXPToNext)*100;
  const hpColor = hpPct>50?'#22c55e':hpPct>25?'#eab308':'#ef4444';
  const effIcons: Record<string,string> = {stun:'💫',slow:'🐌',poison:'☠️',burn:'🔥',freeze:'❄️',silence:'🔇',blind:'👁️',haste:'⚡'};
  const chNames = ['Boot Sector','Syntax Forest','Memory Heap','Process Thread','Network Gateway','The Kernel'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={{fontFamily:'monospace'}}>
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black/85 border border-green-500/30 rounded-lg p-3 w-56">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{character.emoji}</span>
            <div className="flex-1"><div className="text-xs font-bold" style={{color:character.color}}>{character.name}</div><div className="text-xs text-gray-500">Lv.{playerLevel} | {gold}G</div></div>
          </div>
          <div className="mb-1"><div className="flex justify-between text-xs mb-0.5"><span className="text-red-400">HP</span><span style={{color:hpColor}}>{playerStats.hp}/{playerStats.maxHp}</span></div><div className="h-2.5 bg-gray-900 rounded border border-red-900/40 overflow-hidden"><motion.div className="h-full rounded" style={{backgroundColor:hpColor}} animate={{width:`${hpPct}%`}} transition={{duration:0.3}}/></div></div>
          <div className="mb-1"><div className="flex justify-between text-xs mb-0.5"><span className="text-blue-400">MP</span><span className="text-blue-300">{playerStats.mana}/{playerStats.maxMana}</span></div><div className="h-2 bg-gray-900 rounded border border-blue-900/40 overflow-hidden"><motion.div className="h-full bg-blue-500 rounded" animate={{width:`${mpPct}%`}} transition={{duration:0.3}}/></div></div>
          <div><div className="flex justify-between text-xs mb-0.5"><span className="text-purple-400">XP</span><span className="text-purple-300">{playerXP}/{playerXPToNext}</span></div><div className="h-1.5 bg-gray-900 rounded border border-purple-900/40 overflow-hidden"><motion.div className="h-full bg-purple-500 rounded" animate={{width:`${xpPct}%`}} transition={{duration:0.3}}/></div></div>
        </div>
        {activeEffects.length>0&&<div className="mt-1 flex gap-1 flex-wrap">{activeEffects.map((e,i)=><div key={i} className="bg-black/80 border border-yellow-500/30 rounded px-1.5 py-0.5 text-xs"><span>{effIcons[e.type]||'❓'}</span><span className="text-gray-400 ml-1">{e.remainingDuration.toFixed(1)}s</span></div>)}</div>}
      </div>
      <div className="absolute top-4 right-4"><div className="bg-black/80 border border-green-500/30 rounded p-2 text-right"><div className="text-green-400 text-xs">CH.{currentChapter} {chNames[currentChapter-1]||'Unknown'}</div><div className="text-gray-600 text-xs">Bosses: {defeatedBosses.length}</div></div></div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex gap-2 items-end justify-center">
          {(['Q','W','E','R'] as SkillKey[]).map(key=>{
            const skill=character.skills[key]; const cd=skillCooldowns[key]; const onCD=cd>0; const cdPct=onCD?(cd/skill.cooldown)*100:0; const canAfford=playerStats.mana>=skill.manaCost;
            return <motion.div key={key} whileHover={{scale:1.05}} className="relative">
              <div className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${onCD?'border-gray-700 opacity-60':canAfford?'border-yellow-500 hover:border-yellow-300':'border-blue-900 opacity-50'}`} style={{background:onCD?'#111':'linear-gradient(135deg,#1a1a2e,#16213e)'}} onClick={()=>!onCD&&canAfford&&useSkill(key)}>
                {onCD&&<div className="absolute bottom-0 left-0 right-0 bg-black/70" style={{height:`${cdPct}%`}}/>}
                <span className="text-xl z-10">{skill.icon}</span>
                <span className="text-xs text-yellow-400 font-bold z-10">[{key}]</span>
                {onCD&&<div className="absolute inset-0 flex items-center justify-center z-20"><span className="text-white text-sm font-bold">{(cd/1000).toFixed(1)}</span></div>}
              </div>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/95 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-max">
                <div className="text-yellow-400 font-bold">{skill.name}</div>
                <div className="text-blue-400">{skill.manaCost} MP | {(skill.cooldown/1000).toFixed(1)}s CD</div>
                <div className="text-gray-400 max-w-48 whitespace-normal">{skill.description}</div>
              </div>
            </motion.div>;
          })}
        </div>
        <div className="text-center mt-1 text-gray-700 text-xs">WASD: Move | Q/W/E/R: Skills | ESC: Pause</div>
      </div>
      <div className="absolute bottom-6 left-4 flex gap-2 pointer-events-auto">
        <button onClick={()=>setShowInventory(!showInventory)} className="bg-black/80 border border-green-500/30 rounded px-2 py-1.5 text-xs text-green-400 hover:border-green-400 transition-colors">📦 [{inventory.length}]</button>
        <button onClick={()=>setScreen('main-menu')} className="bg-black/80 border border-red-500/30 rounded px-2 py-1.5 text-xs text-red-400 hover:border-red-400 transition-colors">⏸ Menu</button>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>{notifications.map(n=><motion.div key={n.id} initial={{opacity:0,y:-20,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-20,scale:0.9}} className={`bg-black/90 border rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${n.type==='success'?'border-green-500 text-green-400':n.type==='warning'?'border-yellow-500 text-yellow-400':n.type==='error'?'border-red-500 text-red-400':'border-blue-500 text-blue-400'}`}>{n.icon&&<span>{n.icon}</span>}<div><div className="font-bold text-xs">{n.title}</div>{n.message&&<div className="text-xs opacity-70">{n.message}</div>}</div></motion.div>)}</AnimatePresence>
      </div>
      <AnimatePresence>{isDialogueActive&&dialogueQueue.length>0&&<DialogueBox entry={dialogueQueue[0]} onAdvance={advanceDialogue}/>}</AnimatePresence>
      <AnimatePresence>{showInventory&&<InventoryPanel onClose={()=>setShowInventory(false)} useItem={useItem}/>}</AnimatePresence>
    </div>
  );
}
function DialogueBox({ entry, onAdvance }: { entry: { speaker: string; text: string; codeSnippet?: string }; onAdvance: () => void }) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplay(''); setDone(false); let i=0;
    const iv = setInterval(() => { if (i<entry.text.length) setDisplay(entry.text.slice(0,++i)); else { setDone(true); clearInterval(iv); } }, 25);
    return () => clearInterval(iv);
  }, [entry.text]);
  return (
    <motion.div initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} exit={{opacity:0,y:50}} className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[580px] max-w-[90vw] pointer-events-auto">
      <div className="bg-black/95 border border-green-500/50 rounded-lg p-4">
        <div className="text-green-400 text-sm font-bold mb-2">{'>'} {entry.speaker}</div>
        <div className="text-gray-200 text-sm leading-relaxed min-h-[3em]">{display}{!done&&<span className="animate-pulse">▋</span>}</div>
        {entry.codeSnippet&&<div className="mt-2 bg-gray-900 rounded p-2 text-xs text-green-300 border border-gray-700"><pre className="overflow-x-auto">{entry.codeSnippet}</pre></div>}
        <div className="mt-2 text-right"><button onClick={done?onAdvance:()=>setDone(true)} className="text-xs text-gray-500 hover:text-white transition-colors">{done?'[ENTER] Continue ▶':'[ENTER] Skip ▶'}</button></div>
      </div>
    </motion.div>
  );
}
function InventoryPanel({ onClose, useItem }: { onClose: () => void; useItem: (id: string) => void }) {
  // FIX #185: use targeted selectors instead of full store subscription
  const gold = useGameStore(s => s.gold);
  const inventory = useGameStore(s => s.inventory);
  return (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[90vw] pointer-events-auto z-60">
      <div className="bg-black/95 border border-green-500/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3"><h2 className="text-green-400 font-bold text-sm">📦 INVENTORY | {gold}G</h2><button onClick={onClose} className="text-gray-500 hover:text-white">✕</button></div>
        {inventory.length===0?<div className="text-gray-700 text-center py-8 text-sm">{'// No items in inventory'}</div>:
        <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">{inventory.map(item=><div key={item.id} className={`border rounded p-2 text-center cursor-pointer hover:border-yellow-400 transition-colors ${item.rarity==='legendary'?'border-yellow-500':item.rarity==='epic'?'border-purple-500':item.rarity==='rare'?'border-blue-500':'border-gray-700'}`} onClick={()=>item.type==='consumable'&&useItem(item.itemId)} title={`${item.name}: ${item.description}`}><div className="text-xl">{item.icon}</div><div className="text-xs text-gray-400 truncate">{item.name}</div><div className="text-xs text-gray-600">x{item.quantity}</div></div>)}</div>}
        <div className="mt-3 text-xs text-gray-700">Click consumables to use them</div>
      </div>
    </motion.div>
  );
}

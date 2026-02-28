'use client';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store/gameStore';
import { CHARACTERS } from '@/lib/types/characters';
import { useState } from 'react';
export default function GameOverScreen() {
  const store = useGameStore();
  const character = store.selectedCharacter ? CHARACTERS[store.selectedCharacter] : null;
  const [playerName, setPlayerName] = useState('PLAYER_01');
  const score = (store.playerLevel*1000)+(store.defeatedBosses.length*5000)+store.gold;
  const handleSave = () => {
    if (store.selectedCharacter) store.addLeaderboardEntry({ playerName, characterId:store.selectedCharacter, score, chapter:store.currentChapter, bossesDefeated:store.defeatedBosses.length, playTime:0, date:new Date().toISOString() });
    store.setScreen('leaderboard');
  };
  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center" style={{fontFamily:'monospace'}}>
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {Array.from({length:15}).map((_,i)=><motion.div key={i} className="absolute text-red-500 text-xs" style={{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}} animate={{opacity:[0,1,0]}} transition={{duration:0.5,repeat:Infinity,delay:Math.random()*2}}>{['SEGFAULT','NULL_PTR','STACK_OVERFLOW','UNDEFINED','ERROR_404'][i%5]}</motion.div>)}
      </div>
      <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} transition={{duration:0.5}} className="relative z-10 text-center max-w-lg">
        <motion.div animate={{opacity:[1,0.5,1]}} transition={{duration:0.5,repeat:Infinity}} className="text-6xl font-bold text-red-500 mb-2" style={{textShadow:'0 0 30px #ff0000'}}>GAME OVER</motion.div>
        <div className="text-red-800 text-sm mb-6">{'// Fatal error: player.hp <= 0'}</div>
        {character&&<div className="bg-gray-900/50 border border-red-900 rounded-lg p-4 mb-6"><div className="text-4xl mb-2">{character.emoji}</div><div className="text-gray-400 text-sm italic">"{character.voiceLines.death[0]}"</div></div>}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{label:'LEVEL',value:store.playerLevel,icon:'⬆️'},{label:'BOSSES',value:store.defeatedBosses.length,icon:'💀'},{label:'SCORE',value:score.toLocaleString(),icon:'⭐'}].map(s=>(
            <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded p-3"><div className="text-xl">{s.icon}</div><div className="text-yellow-400 font-bold">{s.value}</div><div className="text-gray-600 text-xs">{s.label}</div></div>
          ))}
        </div>
        <div className="mb-4">
          <div className="text-gray-500 text-xs mb-1">ENTER NAME FOR LEADERBOARD:</div>
          <input value={playerName} onChange={e=>setPlayerName(e.target.value.toUpperCase().slice(0,12))} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-green-400 text-center w-full focus:outline-none focus:border-green-500" maxLength={12}/>
        </div>
        <div className="flex gap-3">
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={handleSave} className="flex-1 py-3 border border-yellow-500 text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors">💾 SAVE SCORE</motion.button>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>{store.resetGame();store.setScreen('character-select');}} className="flex-1 py-3 border border-green-500 text-green-400 rounded hover:bg-green-500/10 transition-colors">🔄 RETRY</motion.button>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>{store.resetGame();store.setScreen('main-menu');}} className="flex-1 py-3 border border-gray-600 text-gray-400 rounded hover:bg-gray-500/10 transition-colors">🏠 MENU</motion.button>
        </div>
      </motion.div>
    </div>
  );
}

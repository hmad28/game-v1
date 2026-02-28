'use client';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store/gameStore';
import { CHARACTERS } from '@/lib/types/characters';
export default function LeaderboardScreen() {
  const store = useGameStore();
  const entries = store.leaderboard;
  return (
    <div className="w-full h-screen bg-black flex flex-col" style={{fontFamily:'monospace'}}>
      <div className="border-b border-green-900 p-4 flex items-center justify-between">
        <button onClick={()=>store.setScreen('main-menu')} className="text-green-600 hover:text-green-400 text-sm">← BACK</button>
        <div className="text-yellow-400 text-lg font-bold">🏆 LEADERBOARD</div>
        <div className="text-green-800 text-xs">TOP SCORES</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length===0?<div className="text-center text-gray-700 py-20"><div className="text-4xl mb-4">🏆</div><div>No scores yet. Defeat some bosses!</div></div>:
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-6 gap-2 text-xs text-gray-600 mb-2 px-3"><div>#</div><div>PLAYER</div><div>CHARACTER</div><div>SCORE</div><div>CHAPTER</div><div>BOSSES</div></div>
          {entries.map((entry,i)=>{
            const char=CHARACTERS[entry.characterId];
            return <motion.div key={entry.id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className={`grid grid-cols-6 gap-2 items-center p-3 rounded mb-1 border ${i===0?'border-yellow-500 bg-yellow-500/5':i===1?'border-gray-400 bg-gray-400/5':i===2?'border-orange-600 bg-orange-600/5':'border-gray-800'}`}>
              <div className={`font-bold ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-orange-500':'text-gray-600'}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <div className="text-green-400 text-xs">{entry.playerName}</div>
              <div className="flex items-center gap-1"><span>{char?.emoji}</span><span className="text-xs text-gray-500">{char?.name}</span></div>
              <div className="text-yellow-400 font-bold text-xs">{entry.score.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">Ch.{entry.chapter}</div>
              <div className="text-red-400 text-xs">{entry.bossesDefeated} 💀</div>
            </motion.div>;
          })}
        </div>}
      </div>
      <div className="border-t border-green-900 p-4 flex justify-center gap-4">
        <motion.button whileHover={{scale:1.05}} onClick={()=>store.setScreen('character-select')} className="px-6 py-2 border border-green-500 text-green-400 rounded hover:bg-green-500/10 transition-colors text-sm">▶ PLAY AGAIN</motion.button>
        <motion.button whileHover={{scale:1.05}} onClick={()=>store.setScreen('main-menu')} className="px-6 py-2 border border-gray-600 text-gray-400 rounded hover:bg-gray-500/10 transition-colors text-sm">🏠 MAIN MENU</motion.button>
      </div>
    </div>
  );
}

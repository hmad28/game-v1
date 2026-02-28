'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, useGameScreen } from '@/lib/store/gameStore';
import dynamic from 'next/dynamic';
import MainMenu from '@/components/ui/MainMenu';
import CharacterSelect from '@/components/ui/CharacterSelect';
import GameOverScreen from '@/components/ui/GameOverScreen';
import LeaderboardScreen from '@/components/ui/LeaderboardScreen';
import SettingsScreen from '@/components/ui/SettingsScreen';
import GameHUD from '@/components/hud/GameHUD';
import { CHARACTERS } from '@/lib/types/characters';
import { CHAPTERS } from '@/lib/types/game';

const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center" style={{ fontFamily: 'monospace' }}>
      <div className="text-green-400 text-xl animate-pulse">Initializing game engine...</div>
    </div>
  ),
});

// FIX #185: Separate component so PhaserGame only re-renders when currentChapter changes,
// not on every store update (HP ticks, cooldowns, etc.)
function GameScreen() {
  // Subscribe only to the specific slice needed — avoids re-render on every state change
  const currentChapter = useGameStore(s => s.currentChapter);
  return (
    <motion.div key="game" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full relative">
      <PhaserGame chapterId={currentChapter} />
      <GameHUD />
    </motion.div>
  );
}

export default function Home() {
  // FIX #185: useGameScreen uses a selector — only re-renders when `screen` changes
  const screen = useGameScreen();
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {screen === 'main-menu' && <motion.div key="mm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full"><MainMenu /></motion.div>}
        {screen === 'character-select' && <motion.div key="cs" initial={{opacity:0,x:100}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-100}} className="w-full h-full"><CharacterSelect /></motion.div>}
        {screen === 'game' && <GameScreen key="game" />}
        {screen === 'game-over' && <motion.div key="go" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full"><GameOverScreen /></motion.div>}
        {screen === 'leaderboard' && <motion.div key="lb" initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-50}} className="w-full h-full"><LeaderboardScreen /></motion.div>}
        {screen === 'settings' && <motion.div key="st" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full"><SettingsScreen /></motion.div>}
        {screen === 'wiki' && <motion.div key="wiki" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full"><WikiScreen /></motion.div>}
      </AnimatePresence>
    </main>
  );
}

function WikiScreen() {
  const store = useGameStore();
  return (
    <div className="w-full h-screen bg-black flex flex-col" style={{ fontFamily: 'monospace' }}>
      <div className="border-b border-green-900 p-4 flex items-center justify-between">
        <button onClick={() => store.setScreen('main-menu')} className="text-green-600 hover:text-green-400 text-sm">← BACK</button>
        <div className="text-green-400 text-lg font-bold">📖 WIKI: THE CORE ENCYCLOPEDIA</div>
        <div className="text-green-800 text-xs">LORE DATABASE</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-900/50 border border-green-900 rounded-lg p-4 mb-6">
            <div className="text-green-400 font-bold mb-2">🌐 THE CORE</div>
            <div className="text-gray-400 text-sm leading-relaxed">
              The Core is a digital realm functioning as the operating system of all existence. Data flows like blood, processes run like neurons, and memory is stored in crystalline structures floating in the void. Once a harmonious ecosystem of Language Spirits, it was shattered when VOID_EXCEPTION emerged from The Undefined Zone — a manifestation of all bugs, errors, and corrupted data that ever existed, with one goal: System.Collapse().
            </div>
          </div>
          <div className="mb-6">
            <div className="text-yellow-400 font-bold mb-3">📍 SECTORS (6 Chapters)</div>
            <div className="grid grid-cols-2 gap-3">
              {CHAPTERS.map(ch => (
                <div key={ch.id} className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }} />
                    <div className="text-xs font-bold text-gray-300">CH.{ch.id}: {ch.name}</div>
                  </div>
                  <div className="text-xs text-gray-600">{ch.subtitle}</div>
                  <div className="text-xs text-gray-500 mt-1">{ch.description}</div>
                  <div className="text-xs text-red-500 mt-1">Corruption: {ch.corruptionLevel}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <div className="text-purple-400 font-bold mb-3">⚔️ LANGUAGE SPIRITS (10 Characters)</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(CHARACTERS).map(char => (
                <div key={char.id} className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{char.emoji}</span>
                    <div>
                      <div className="text-xs font-bold" style={{ color: char.color }}>{char.name} — {char.language}</div>
                      <div className="text-xs text-gray-600">{char.title}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{char.lore}</div>
                  <div className="text-xs text-gray-700 mt-1 italic">"{char.voiceLines.idle[0]}"</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900/50 border border-red-900 rounded-lg p-4">
            <div className="text-red-400 font-bold mb-2">👾 DATA BEASTS</div>
            <div className="text-gray-400 text-sm leading-relaxed">
              Data Beasts are corrupted database entries that mutated when VOID_EXCEPTION breached The Kernel. They retain the structure of Pokemon entries but are twisted with glitch patterns and aggressive behaviors. Corruption Level (0-100%) determines their power and visual distortion. Fetched live from PokeAPI with procedural corruption applied.
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[{range:'0-30%',label:'Low Corruption',color:'#00ffff',desc:'Slight color shifts, minor glitches'},{range:'30-70%',label:'Medium Corruption',color:'#00ff88',desc:'Severe distortions, missing pixels'},{range:'70-100%',label:'High Corruption',color:'#ff2222',desc:'Extreme glitch, chaotic behavior'}].map(tier=>(
                <div key={tier.range} className="bg-black/50 rounded p-2 border border-gray-800">
                  <div className="text-xs font-bold" style={{color:tier.color}}>{tier.range}</div>
                  <div className="text-xs text-gray-400">{tier.label}</div>
                  <div className="text-xs text-gray-600">{tier.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

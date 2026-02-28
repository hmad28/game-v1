'use client';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store/gameStore';
import { useEffect, useRef, useState } from 'react';
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cols = Math.floor(canvas.width/16);
    const drops = Array(cols).fill(1);
    const chars = '01アイウエオABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const draw = () => {
      ctx.fillStyle='rgba(0,0,0,0.05)'; ctx.fillRect(0,0,canvas.width,canvas.height);
      drops.forEach((y,i) => { const char = chars[Math.floor(Math.random()*chars.length)]; ctx.fillStyle = i%3===0?'#00ff41':'#003300'; ctx.font='14px monospace'; ctx.fillText(char, i*16, y*16); if (y*16>canvas.height&&Math.random()>0.975) drops[i]=0; drops[i]++; });
    };
    const interval = setInterval(draw, 50);
    const resize = () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    window.addEventListener('resize', resize);
    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 opacity-30"/>;
}
export default function MainMenu() {
  const store = useGameStore();
  const [glitch, setGlitch] = useState(false);
  useEffect(() => { const iv = setInterval(() => { setGlitch(true); setTimeout(()=>setGlitch(false),200); }, 4000); return () => clearInterval(iv); }, []);
  const items = [
    { label:'▶ NEW GAME', action:()=>store.setScreen('character-select'), color:'#00ff41' },
    { label:'⚔ CONTINUE', action:()=>store.selectedCharacter?store.setScreen('game'):store.setScreen('character-select'), color:'#00cc33' },
    { label:'🏆 LEADERBOARD', action:()=>store.setScreen('leaderboard'), color:'#ffaa00' },
    { label:'⚙ SETTINGS', action:()=>store.setScreen('settings'), color:'#4488ff' },
    { label:'📖 WIKI', action:()=>store.setScreen('wiki'), color:'#aa44ff' },
  ];
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      <MatrixRain/>
      <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)'}}/>
      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.div initial={{opacity:0,y:-50}} animate={{opacity:1,y:0}} transition={{duration:1}} className="text-center">
          <div className="text-6xl font-bold mb-2" style={{fontFamily:'monospace',color:'#00ff41',textShadow:'0 0 20px #00ff41,0 0 40px #00ff41',filter:glitch?'hue-rotate(90deg) saturate(200%)':'none',transition:'filter 0.1s'}}>CODEBOUND</div>
          <div className="text-xl text-green-600" style={{fontFamily:'monospace',letterSpacing:'0.3em'}}>THE SYNTAX CHRONICLES</div>
          <div className="text-xs text-green-900 mt-2" style={{fontFamily:'monospace'}}>v1.0.0 | CORRUPTION LEVEL: CRITICAL</div>
        </motion.div>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="text-xs text-green-800 text-center" style={{fontFamily:'monospace'}}>
          <div>{'// The Core is under attack'}</div><div>{'while(VOID_EXCEPTION.active) {'}</div><div className="ml-4">{'fight(corruption);'}</div><div>{'}'}</div>
        </motion.div>
        <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.8}} className="flex flex-col gap-3 w-64">
          {items.map((item,i)=>(
            <motion.button key={item.label} initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} transition={{delay:0.8+i*0.1}} whileHover={{scale:1.05,x:10}} whileTap={{scale:0.95}} onClick={item.action}
              className="text-left px-4 py-3 border rounded transition-all duration-200"
              style={{fontFamily:'monospace',color:item.color,borderColor:item.color+'44',background:'rgba(0,0,0,0.8)',textShadow:`0 0 10px ${item.color}`}}
              onMouseEnter={e=>{(e.target as HTMLElement).style.borderColor=item.color;(e.target as HTMLElement).style.background=item.color+'22';}}
              onMouseLeave={e=>{(e.target as HTMLElement).style.borderColor=item.color+'44';(e.target as HTMLElement).style.background='rgba(0,0,0,0.8)';}}>
              {item.label}
            </motion.button>
          ))}
        </motion.div>
        {store.completedChapters.length>0&&<motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5}} className="text-xs text-green-700 text-center" style={{fontFamily:'monospace'}}><div>Progress: Chapter {store.currentChapter}/6</div><div>Bosses Defeated: {store.defeatedBosses.length}</div></motion.div>}
      </div>
    </div>
  );
}

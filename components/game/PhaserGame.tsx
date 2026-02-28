'use client';
import { useEffect, useRef } from 'react';
export default function PhaserGame({ chapterId = 1 }: { chapterId?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const init = async () => {
      const Phaser = (await import('phaser')).default;
      const { PreloadScene } = await import('@/lib/game/scenes/PreloadScene');
      const { GameScene } = await import('@/lib/game/scenes/GameScene');
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO, parent: containerRef.current!, width: window.innerWidth, height: window.innerHeight,
        backgroundColor: '#000000', physics: { default:'arcade', arcade:{ gravity:{x:0,y:0}, debug:false } },
        scene: [PreloadScene, GameScene], scale: { mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH },
        render: { antialias:false, pixelArt:true },
      };
      gameRef.current = new Phaser.Game(config);
      gameRef.current.events.once('ready', () => { setTimeout(() => { const s = gameRef.current?.scene.getScene('GameScene'); if (s) s.scene.restart({ chapterId }); }, 100); });
    };
    init();
    return () => { if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; } };
  }, [chapterId]);
  return <div ref={containerRef} className="w-full h-full" style={{ position:'absolute', top:0, left:0 }} />;
}

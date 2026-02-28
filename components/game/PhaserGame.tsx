'use client';
import React, { useEffect, useRef, Component, ReactNode } from 'react';

// #3 FIX: valid chapter range
const MIN_CHAPTER = 1;
const MAX_CHAPTER = 6;

function clampChapterId(id: number): number {
  if (!Number.isInteger(id) || id < MIN_CHAPTER || id > MAX_CHAPTER) {
    console.warn(`[PhaserGame] Invalid chapterId "${id}", clamping to range [${MIN_CHAPTER}, ${MAX_CHAPTER}].`);
    return Math.max(MIN_CHAPTER, Math.min(MAX_CHAPTER, Math.round(id) || MIN_CHAPTER));
  }
  return id;
}

// #8 FIX: error boundary so a Phaser crash shows a message instead of a white screen
interface ErrorBoundaryState { hasError: boolean; message: string }
class PhaserErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PhaserGame] Caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="w-full h-screen bg-black flex flex-col items-center justify-center gap-4"
          style={{ fontFamily: 'monospace' }}
        >
          <div className="text-red-500 text-2xl">⚠ GAME ENGINE ERROR</div>
          <div className="text-red-400 text-sm max-w-md text-center opacity-70">{this.state.message}</div>
          <button
            className="mt-4 px-6 py-2 border border-green-700 text-green-400 rounded hover:bg-green-900/30 transition-colors text-sm"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            ↺ RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PhaserGameInner({ chapterId = 1 }: { chapterId?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);

  // #3 FIX: validate before passing to Phaser
  const safeChapterId = clampChapterId(chapterId);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const init = async () => {
      const Phaser = (await import('phaser')).default;
      const { PreloadScene } = await import('@/lib/game/scenes/PreloadScene');
      const { GameScene } = await import('@/lib/game/scenes/GameScene');
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#000000',
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [PreloadScene, GameScene],
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: false, pixelArt: true },
      };
      gameRef.current = new Phaser.Game(config);
      gameRef.current.events.once('ready', () => {
        setTimeout(() => {
          const s = gameRef.current?.scene.getScene('GameScene');
          // #3 FIX: pass validated chapterId
          if (s) s.scene.restart({ chapterId: safeChapterId });
        }, 100);
      });
    };
    init();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [safeChapterId]);

  return <div ref={containerRef} className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }} />;
}

export default function PhaserGame({ chapterId = 1 }: { chapterId?: number }) {
  return (
    // #8 FIX: wrap in error boundary
    <PhaserErrorBoundary>
      <PhaserGameInner chapterId={chapterId} />
    </PhaserErrorBoundary>
  );
}

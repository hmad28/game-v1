import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  GameState, GameScreen, CharacterId, PlayerStats, InventoryItem,
  SkillKey, StatusEffect, DialogueEntry, GameNotification, GameSettings, LeaderboardEntry,
} from '../types/game';
import { CHARACTERS } from '../types/characters';

// FIX #185: Move gameEventListeners OUTSIDE the Zustand store so mutations to this Map
// never trigger Zustand state comparisons or React re-renders.
// Previously it was stored inside the store state, causing every emitGameEvent / onGameEvent
// call to potentially trigger a re-render cascade.
const _gameEventListeners: Map<string, ((d: unknown) => void)[]> = new Map();

interface GameStore extends GameState {
  setScreen: (s: GameScreen) => void;
  selectCharacter: (id: CharacterId) => void;
  updatePlayerStats: (s: Partial<PlayerStats>) => void;
  takeDamage: (a: number, t?: string) => void;
  healPlayer: (a: number) => void;
  useMana: (a: number) => boolean;
  restoreMana: (a: number) => void;
  gainXP: (a: number) => void;
  levelUp: () => void;
  useSkill: (k: SkillKey) => boolean;
  tickCooldowns: (d: number) => void;
  addStatusEffect: (e: StatusEffect) => void;
  removeStatusEffect: (t: string) => void;
  tickStatusEffects: (d: number) => void;
  addItem: (i: InventoryItem) => void;
  removeItem: (id: string, q?: number) => void;
  useItem: (id: string) => void;
  addGold: (a: number) => void;
  spendGold: (a: number) => boolean;
  completeChapter: (id: number) => void;
  defeatBoss: (id: number) => void;
  showDialogue: (e: DialogueEntry[]) => void;
  advanceDialogue: () => void;
  closeDialogue: () => void;
  addNotification: (n: Omit<GameNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  updateSettings: (s: Partial<GameSettings>) => void;
  addLeaderboardEntry: (e: Omit<LeaderboardEntry, 'id'>) => void;
  emitGameEvent: (e: string, d?: unknown) => void;
  onGameEvent: (e: string, cb: (d: unknown) => void) => () => void;
  resetGame: () => void;
}

const DS: GameSettings = {
  masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8,
  graphicsQuality: 'high', showDamageNumbers: true, showFPS: false,
  particleEffects: true, screenShake: true, language: 'en',
};

// #7 FIX: load persisted settings from localStorage (safe — falls back to defaults)
function loadPersistedSettings(): GameSettings {
  if (typeof window === 'undefined') return DS;
  try {
    const raw = localStorage.getItem('gameSettings');
    if (!raw) return DS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    // Merge with defaults so new keys added in future are always present
    return { ...DS, ...parsed };
  } catch {
    return DS;
  }
}

// #7 FIX: persist settings to localStorage whenever they change
function persistSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded, etc.)
  }
}

const IS: GameState = {
  screen: 'main-menu', selectedCharacter: null, currentChapter: 1,
  playerStats: null, playerLevel: 1, playerXP: 0, playerXPToNext: 100,
  inventory: [], gold: 0, skills: null, skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
  activeStatusEffects: [], defeatedBosses: [], completedChapters: [],
  settings: loadPersistedSettings(), // #7 FIX: load from localStorage
  leaderboard: [], dialogueQueue: [], isDialogueActive: false, notifications: [],
};

export const useGameStore = create<GameStore>()(subscribeWithSelector((set, get) => ({
  ...IS,

  setScreen: (screen) => set({ screen }),

  // #9 FIX: emit a notification when character id is not found instead of silently returning
  selectCharacter: (id) => {
    const c = CHARACTERS[id];
    if (!c) {
      console.error(`[gameStore] selectCharacter: unknown character id "${id}"`);
      get().addNotification({
        type: 'error',
        title: '⚠ Character Not Found',
        message: `Character "${id}" does not exist. Please select a valid character.`,
        duration: 4000,
        icon: '⚠',
      });
      return;
    }
    set({
      selectedCharacter: id,
      playerStats: { ...c.stats },
      skills: { ...c.skills },
      skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
      playerLevel: 1, playerXP: 0, playerXPToNext: 100,
      inventory: [], gold: 50, activeStatusEffects: [],
      defeatedBosses: [], completedChapters: [],
    });
  },

  updatePlayerStats: (stats) => set(s => ({ playerStats: s.playerStats ? { ...s.playerStats, ...stats } : null })),

  takeDamage: (amount, damageType) => {
    const st = get();
    if (!st.playerStats) return;
    let fd = amount;
    if (damageType === 'physical') fd = Math.max(1, amount - st.playerStats.defense * 0.3);
    const nh = Math.max(0, st.playerStats.hp - fd);
    set(s => ({ playerStats: s.playerStats ? { ...s.playerStats, hp: nh } : null }));
    get().emitGameEvent('player-damage', { amount: fd, damageType });
    if (nh <= 0) { get().emitGameEvent('player-death', {}); set({ screen: 'game-over' }); }
  },

  healPlayer: (a) => set(s => ({ playerStats: s.playerStats ? { ...s.playerStats, hp: Math.min(s.playerStats.maxHp, s.playerStats.hp + a) } : null })),

  useMana: (a) => {
    const st = get();
    if (!st.playerStats || st.playerStats.mana < a) return false;
    set(s => ({ playerStats: s.playerStats ? { ...s.playerStats, mana: s.playerStats.mana - a } : null }));
    return true;
  },

  restoreMana: (a) => set(s => ({ playerStats: s.playerStats ? { ...s.playerStats, mana: Math.min(s.playerStats.maxMana, s.playerStats.mana + a) } : null })),

  gainXP: (a) => {
    const st = get();
    const nx = st.playerXP + a;
    if (nx >= st.playerXPToNext) { set({ playerXP: nx - st.playerXPToNext }); get().levelUp(); }
    else set({ playerXP: nx });
  },

  levelUp: () => {
    const st = get();
    const nl = st.playerLevel + 1;
    set(s => ({
      playerLevel: nl,
      playerXPToNext: Math.floor(s.playerXPToNext * 1.5),
      playerStats: s.playerStats ? {
        ...s.playerStats,
        maxHp: Math.floor(s.playerStats.maxHp * 1.1), hp: Math.floor(s.playerStats.maxHp * 1.1),
        maxMana: Math.floor(s.playerStats.maxMana * 1.08), mana: Math.floor(s.playerStats.maxMana * 1.08),
        attack: Math.floor(s.playerStats.attack * 1.08), defense: Math.floor(s.playerStats.defense * 1.08),
      } : null,
    }));
    get().addNotification({ type: 'success', title: `Level Up! → ${nl}`, message: 'All stats increased!', duration: 3000, icon: '⬆️' });
    get().emitGameEvent('player-levelup', { level: nl });
  },

  useSkill: (key) => {
    const st = get();
    if (!st.skills || !st.playerStats) return false;
    const sk = st.skills[key];
    if (!sk || st.skillCooldowns[key] > 0) return false;
    if (!get().useMana(sk.manaCost)) return false;
    set(s => ({ skillCooldowns: { ...s.skillCooldowns, [key]: sk.cooldown } }));
    get().emitGameEvent('skill-used', { key, skill: sk });
    return true;
  },

  tickCooldowns: (d) => set(s => ({
    skillCooldowns: {
      Q: Math.max(0, s.skillCooldowns.Q - d), W: Math.max(0, s.skillCooldowns.W - d),
      E: Math.max(0, s.skillCooldowns.E - d), R: Math.max(0, s.skillCooldowns.R - d),
    },
  })),

  addStatusEffect: (e) => set(s => {
    const ex = s.activeStatusEffects.findIndex(x => x.type === e.type);
    if (ex >= 0 && !e.stackable) {
      const u = [...s.activeStatusEffects];
      u[ex] = { ...e, remainingDuration: e.duration };
      return { activeStatusEffects: u };
    }
    return { activeStatusEffects: [...s.activeStatusEffects, { ...e, remainingDuration: e.duration }] };
  }),

  removeStatusEffect: (t) => set(s => ({ activeStatusEffects: s.activeStatusEffects.filter(e => e.type !== t) })),

  tickStatusEffects: (d) => {
    const ds = d / 1000;
    const u = get().activeStatusEffects
      .map(e => ({ ...e, remainingDuration: e.remainingDuration - ds }))
      .filter(e => e.remainingDuration > 0);
    const p = u.find(e => e.type === 'poison');
    if (p) get().takeDamage(p.value * ds, 'magical');
    set({ activeStatusEffects: u });
  },

  addItem: (item) => set(s => {
    const ex = s.inventory.findIndex(i => i.itemId === item.itemId);
    if (ex >= 0) {
      const u = [...s.inventory];
      u[ex] = { ...u[ex], quantity: u[ex].quantity + item.quantity };
      return { inventory: u };
    }
    return { inventory: [...s.inventory, item] };
  }),

  removeItem: (id, q = 1) => set(s => ({
    inventory: s.inventory.map(i => i.itemId === id ? { ...i, quantity: i.quantity - q } : i).filter(i => i.quantity > 0),
  })),

  useItem: (id) => {
    const i = get().inventory.find(x => x.itemId === id);
    if (!i || i.type !== 'consumable') return;
    if (i.stats?.hp) get().healPlayer(i.stats.hp);
    if (i.stats?.mana) get().restoreMana(i.stats.mana);
    get().removeItem(id, 1);
    get().emitGameEvent('item-used', { item: i });
  },

  addGold: (a) => set(s => ({ gold: s.gold + a })),
  spendGold: (a) => { if (get().gold < a) return false; set(s => ({ gold: s.gold - a })); return true; },

  completeChapter: (id) => set(s => ({ completedChapters: [...new Set([...s.completedChapters, id])], currentChapter: Math.min(6, id + 1) })),
  defeatBoss: (id) => set(s => ({ defeatedBosses: [...new Set([...s.defeatedBosses, id])] })),

  showDialogue: (e) => set({ dialogueQueue: e, isDialogueActive: true }),
  advanceDialogue: () => set(s => { const q = s.dialogueQueue.slice(1); return { dialogueQueue: q, isDialogueActive: q.length > 0 }; }),
  closeDialogue: () => set({ dialogueQueue: [], isDialogueActive: false }),

  addNotification: (n) => {
    const id = `n_${Date.now()}_${Math.random()}`;
    set(s => ({ notifications: [...s.notifications, { ...n, id }] }));
    // FIX #185: use get() inside the timeout callback so it always reads the latest store
    // reference — this is safe because get() is a stable reference from Zustand's closure.
    // The notification is removed by id so even if the component unmounts the state update
    // is a no-op (filtering an already-absent id produces the same array shape).
    const duration = typeof n.duration === 'number' && n.duration > 0 ? n.duration : 3000;
    setTimeout(() => get().removeNotification(id), duration);
  },
  removeNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  // #7 FIX: persist settings to localStorage on every update
  updateSettings: (s) => {
    const next = { ...get().settings, ...s };
    persistSettings(next);
    set({ settings: next });
  },

  addLeaderboardEntry: (e) => {
    const id = `lb_${Date.now()}`;
    set(s => ({ leaderboard: [...s.leaderboard, { ...e, id }].sort((a, b) => b.score - a.score).slice(0, 100) }));
  },

  // FIX #185: use module-level _gameEventListeners Map (outside Zustand state) so
  // registering/emitting events never triggers a Zustand state update or React re-render.
  emitGameEvent: (ev, d) => {
    const ls = _gameEventListeners.get(ev) || [];
    ls.forEach(cb => {
      try { cb(d); } catch (err) { console.error(`[gameStore] emitGameEvent "${ev}" listener threw:`, err); }
    });
  },

  onGameEvent: (ev, cb) => {
    const ls = _gameEventListeners.get(ev) || [];
    _gameEventListeners.set(ev, [...ls, cb]);
    // Return unsubscribe function — callers MUST call this on unmount to prevent memory leaks
    return () => {
      const c = _gameEventListeners.get(ev) || [];
      _gameEventListeners.set(ev, c.filter(x => x !== cb));
    };
  },

  resetGame: () => {
    // FIX #185: also clear module-level event listeners on full reset to prevent stale callbacks
    _gameEventListeners.clear();
    set({ ...IS, settings: get().settings, leaderboard: get().leaderboard });
  },
})));

export const usePlayerStats = () => useGameStore(s => s.playerStats);
export const useSkillCooldowns = () => useGameStore(s => s.skillCooldowns);
export const useActiveEffects = () => useGameStore(s => s.activeStatusEffects);
export const useInventory = () => useGameStore(s => s.inventory);
export const useGameScreen = () => useGameStore(s => s.screen);
export const useSelectedCharacter = () => useGameStore(s => s.selectedCharacter);
export const useNotifications = () => useGameStore(s => s.notifications);
export const useDialogue = () => useGameStore(s => ({ queue: s.dialogueQueue, isActive: s.isDialogueActive }));

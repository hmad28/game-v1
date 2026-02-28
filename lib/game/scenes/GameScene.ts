import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { SkillKey } from '../../types/game';
import { PokeAPIService } from '../services/PokeAPIService';
import { PlayerEntity } from '../entities/PlayerEntity';
import { EnemyEntity } from '../entities/EnemyEntity';

const VALID_CHAPTER_IDS = new Set([1, 2, 3, 4, 5, 6]);

export class GameScene extends Phaser.Scene {
  private player!: PlayerEntity;
  private enemies: EnemyEntity[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private skillKeys!: Record<SkillKey, Phaser.Input.Keyboard.Key>;
  private chapterId = 1;
  private spawnTimer = 0;
  private spawnInterval = 5000;
  private maxEnemies = 8;
  private bossSpawned = false;
  private killCount = 0;
  private bossThreshold = 10;
  private fpsText!: Phaser.GameObjects.Text;
  // FPS smoothing: rolling average over last N samples
  private fpsSamples: number[] = [];
  private readonly FPS_SAMPLE_SIZE = 20;
  // #2 FIX: track unsub functions for store event listeners
  private unsubs: (() => void)[] = [];
  private isPaused = false;
  private worldW = 0;
  private worldH = 0;
  // #5 FIX: particle pool for death/spawn effects
  private particlePool: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly POOL_SIZE = 10;

  constructor() { super({ key: 'GameScene' }); }

  init(data: { chapterId?: number }) {
    // #3 FIX: validate chapterId — fall back to 1 if invalid
    const raw = data.chapterId ?? 1;
    this.chapterId = VALID_CHAPTER_IDS.has(raw) ? raw : 1;
    if (!VALID_CHAPTER_IDS.has(raw)) {
      console.warn(`[GameScene] Invalid chapterId "${raw}", defaulting to 1.`);
    }
    this.enemies = [];
    this.bossSpawned = false;
    this.killCount = 0;
    this.spawnTimer = 0;
    this.fpsSamples = [];
    // #2 FIX: clean up any leftover unsubs from a previous run of this scene
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  create() {
    // #1 FIX: guard — if no character selected, redirect back to character select
    const store = useGameStore.getState();
    if (!store.selectedCharacter || !store.playerStats) {
      console.warn('[GameScene] No character selected — redirecting to character-select.');
      store.setScreen('character-select');
      return;
    }

    const { width, height } = this.cameras.main;
    this.worldW = width * 3;
    this.worldH = height * 3;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.createBackground();
    this.createPlayer();

    // #1 FIX: guard — createPlayer may fail if character data is corrupt
    if (!this.player) {
      console.error('[GameScene] Failed to create player entity.');
      store.setScreen('character-select');
      return;
    }

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5).setBounds(0, 0, this.worldW, this.worldH);
    this.setupInput();
    this.setupAmbient();
    this.fpsText = this.add.text(10, 10, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00ff41'
    }).setScrollFactor(0).setDepth(100);
    // #5 FIX: pre-warm particle pool
    this.initParticlePool();
    this.setupEventListeners();
    this.spawnWave();
    store.emitGameEvent('scene-ready', { scene: 'GameScene' });
  }

  // #5 FIX: pre-allocate a pool of particle emitters for reuse
  private initParticlePool() {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const emitter = this.add.particles(0, 0, 'particle_corruption', {
        speed: { min: 80, max: 200 },
        scale: { start: 1, end: 0 },
        lifespan: 800,
        quantity: 0,
        blendMode: 'ADD',
      });
      emitter.setVisible(false).setActive(false);
      this.particlePool.push(emitter);
    }
  }

  // #5 FIX: get a pooled emitter, or create a new one if pool is exhausted
  private getPooledEmitter(x: number, y: number, tint: number, quantity: number, lifespan = 800): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.particlePool.find(e => !e.active);
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.setActive(true).setVisible(true);
      emitter.setParticleTint(tint);
      emitter.setParticleLifespan(lifespan);
      emitter.setQuantity(quantity);
      emitter.explode(quantity, x, y);
      // Return to pool after lifespan
      this.time.delayedCall(lifespan + 100, () => {
        emitter.setActive(false).setVisible(false);
        emitter.setQuantity(0);
      });
      return emitter;
    }
    // Pool exhausted — create a temporary one-shot emitter
    const tmp = this.add.particles(x, y, 'particle_corruption', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan,
      quantity,
      tint,
      blendMode: 'ADD',
    });
    this.time.delayedCall(lifespan + 100, () => tmp.destroy());
    return tmp;
  }

  private createBackground() {
    const keys = ['boot', 'syntax', 'memory', 'process', 'network', 'kernel'];
    const key = `tile_${keys[this.chapterId - 1] || 'boot'}`;
    const bgColors: Record<number, number> = { 1: 0x111111, 2: 0x001100, 3: 0x000011, 4: 0x110011, 5: 0x001111, 6: 0x110000 };
    this.add.tileSprite(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, `${key}_floor`).setDepth(-2);
    this.cameras.main.setBackgroundColor(bgColors[this.chapterId] || 0x111111);
    const wt = 32;
    this.add.tileSprite(this.worldW / 2, wt / 2, this.worldW, wt, `${key}_wall`).setDepth(-1);
    this.add.tileSprite(this.worldW / 2, this.worldH - wt / 2, this.worldW, wt, `${key}_wall`).setDepth(-1);
    this.add.tileSprite(wt / 2, this.worldH / 2, wt, this.worldH, `${key}_wall`).setDepth(-1);
    this.add.tileSprite(this.worldW - wt / 2, this.worldH / 2, wt, this.worldH, `${key}_wall`).setDepth(-1);
  }

  private createPlayer() {
    const store = useGameStore.getState();
    // #1 FIX: selectedCharacter is guaranteed non-null here (checked in create())
    this.player = new PlayerEntity(this, this.worldW / 2, this.worldH / 2, store.selectedCharacter!);
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.skillKeys = {
      Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      R: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.togglePause());
  }

  private setupAmbient() {
    const colors: Record<number, number> = { 1: 0x444444, 2: 0x004400, 3: 0x000044, 4: 0x220044, 5: 0x004444, 6: 0x440000 };
    this.add.particles(this.worldW / 2, this.worldH / 2, 'particle_corruption', {
      speed: { min: 5, max: 20 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.3, end: 0 },
      lifespan: 3000, frequency: 200, quantity: 2, tint: colors[this.chapterId] || 0x222222, blendMode: 'ADD',
    }).setDepth(-1);
  }

  private setupEventListeners() {
    // #2 FIX: store unsub functions so they can be called in shutdown()
    const store = useGameStore.getState();
    this.unsubs.push(
      store.onGameEvent('skill-used', (data: unknown) => {
        // #1 FIX: guard player before calling methods on it
        if (!this.player) return;
        const { key } = data as { key: SkillKey };
        this.player.executeSkill(key);
      }),
      store.onGameEvent('item-used', (data: unknown) => {
        // #1 FIX: guard player before accessing sprite position
        if (!this.player?.sprite?.active) return;
        const { item } = data as { item: { itemId: string } };
        if (item.itemId === 'health_potion') {
          this.add.particles(this.player.sprite.x, this.player.sprite.y, 'particle_heal', {
            speed: { min: 30, max: 80 }, scale: { start: 0.6, end: 0 },
            lifespan: 1000, quantity: 20, tint: 0x00ff88, blendMode: 'ADD', gravityY: -50,
          });
        }
      })
    );
  }

  // #4 FIX: spawn enemies concurrently with Promise.all instead of sequential await
  private async spawnWave() {
    if (this.enemies.length >= this.maxEnemies) return;
    const count = Math.min(3, this.maxEnemies - this.enemies.length);
    const spawns: Promise<void>[] = [];
    for (let i = 0; i < count; i++) spawns.push(this.spawnEnemy(false));
    await Promise.all(spawns);
  }

  private async spawnEnemy(isBoss: boolean) {
    // #1 FIX: guard player before using its position
    if (!this.player?.sprite?.active) return;
    let x: number, y: number;
    do {
      x = 64 + Math.random() * (this.worldW - 128);
      y = 64 + Math.random() * (this.worldH - 128);
    } while (Phaser.Math.Distance.Between(x, y, this.player.sprite.x, this.player.sprite.y) < 300);
    try {
      const pokemonId = PokeAPIService.selectPokemon(this.chapterId);
      const beast = await PokeAPIService.createDataBeast(pokemonId, this.chapterId, isBoss);
      // Guard: scene may have been shut down while awaiting
      if (!this.scene.isActive()) return;
      const enemy = new EnemyEntity(this, x, y, beast);
      this.enemies.push(enemy);
      // #5 FIX: use pooled emitter for spawn effect
      this.getPooledEmitter(x, y, beast.tintColor, 15, 600);
    } catch (e) {
      console.warn('[GameScene] Spawn failed:', e);
    }
  }

  update(time: number, delta: number) {
    if (this.isPaused) return;
    // #1 FIX: guard player before calling update
    if (!this.player?.sprite?.active) return;

    const store = useGameStore.getState();

    // #10 FIX: smooth FPS using rolling average
    if (store.settings.showFPS) {
      const fps = 1000 / delta;
      this.fpsSamples.push(fps);
      if (this.fpsSamples.length > this.FPS_SAMPLE_SIZE) this.fpsSamples.shift();
      const avgFps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      this.fpsText.setText(`FPS: ${Math.round(avgFps)}`).setVisible(true);
    } else {
      this.fpsText.setVisible(false);
    }

    this.player.update(delta, this.cursors, this.wasd, this.skillKeys);

    // #4 FIX: swap-and-pop instead of filter() to avoid creating a new array every frame
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.isAlive()) {
        this.handleDeath(e);
        // swap with last element and pop — O(1) removal
        this.enemies[i] = this.enemies[this.enemies.length - 1];
        this.enemies.pop();
      } else {
        e.update(delta, this.player);
      }
    }

    store.tickCooldowns(delta);
    store.tickStatusEffects(delta);
    if (time % 1000 < delta) store.restoreMana(5);
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) { this.spawnTimer = 0; this.spawnWave(); }
    if (!this.bossSpawned && this.killCount >= this.bossThreshold) { this.bossSpawned = true; this.spawnBoss(); }
    this.checkCollisions();
  }

  private handleDeath(enemy: EnemyEntity) {
    const store = useGameStore.getState();
    const beast = enemy.dataBeast;
    store.gainXP(beast.xpReward);
    const gold = Math.floor(beast.corruptionLevel / 10) + (beast.isBoss ? 50 : 5);
    store.addGold(gold);
    beast.dropTable.forEach(drop => {
      if (Math.random() * 100 < drop.dropChance) {
        const qty = drop.quantity.min + Math.floor(Math.random() * (drop.quantity.max - drop.quantity.min + 1));
        store.addItem({
          id: `item_${Date.now()}_${Math.random()}`, itemId: drop.itemId, name: drop.name,
          description: `Dropped by ${beast.corruptedName}`,
          type: drop.itemId === 'health_potion' ? 'consumable' : 'material',
          rarity: beast.isBoss ? 'rare' : 'common', quantity: qty, icon: this.getItemIcon(drop.itemId),
        });
      }
    });
    // #5 FIX: use pooled emitter for death effect
    this.getPooledEmitter(enemy.sprite.x, enemy.sprite.y, beast.tintColor, 25, 800);
    if (useGameStore.getState().settings.screenShake) {
      this.cameras.main.flash(200, 255, 255, 255, false);
    }
    store.addNotification({ type: 'info', title: `${beast.corruptedName} defeated!`, message: `+${beast.xpReward} XP | +${gold}G`, duration: 2000, icon: '💀' });
    this.killCount++;
    if (beast.isBoss) {
      store.defeatBoss(beast.pokemonId);
      store.addNotification({ type: 'success', title: '🏆 BOSS DEFEATED!', message: `${beast.corruptedName} purified!`, duration: 5000, icon: '🏆' });
      this.time.delayedCall(3000, () => this.completeChapter());
    }
    enemy.destroy();
  }

  private async spawnBoss() {
    useGameStore.getState().showDialogue([{ speaker: 'SYSTEM', text: `⚠️ WARNING: BOSS ENTITY DETECTED IN SECTOR ${this.chapterId}. CORRUPTION LEVEL: CRITICAL.` }]);
    this.cameras.main.shake(1000, 0.02);
    this.time.delayedCall(2000, () => this.spawnEnemy(true));
  }

  private completeChapter() {
    const store = useGameStore.getState();
    store.completeChapter(this.chapterId);
    store.showDialogue([{ speaker: 'SYSTEM', text: `✅ CHAPTER ${this.chapterId} COMPLETE! Sector corruption reduced. Proceeding...` }]);
    this.time.delayedCall(3000, () => store.setScreen('main-menu'));
  }

  private checkCollisions() {
    if (!this.player?.sprite.active) return;
    const pb = this.player.sprite.getBounds();
    // #6 NOTE: O(n²) collision is acceptable for current enemy counts (≤8).
    // For larger scale, replace with a spatial hash or Phaser arcade overlap groups.
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy.isAlive() || !enemy.sprite.active) continue;
      const eb = enemy.sprite.getBounds();

      // Player-enemy contact damage
      if (Phaser.Geom.Intersects.RectangleToRectangle(pb, eb)) {
        if (!enemy.contactDamageCooldown || enemy.contactDamageCooldown <= 0) {
          const dmg = Math.floor(enemy.dataBeast.stats.attack * 0.3);
          useGameStore.getState().takeDamage(dmg, 'physical');
          this.showDmgNum(this.player.sprite.x, this.player.sprite.y - 20, dmg, '#ff4444');
          enemy.contactDamageCooldown = 1000;
          const a = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, this.player.sprite.x, this.player.sprite.y);
          (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
        }
      }

      // Skill hitbox vs enemy
      for (let j = 0; j < this.player.skillHitboxes.length; j++) {
        const hb = this.player.skillHitboxes[j];
        if (!hb.active) continue;
        const hbb = hb.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(hbb, eb)) {
          const hitSet: Set<string> = hb.getData('hitEnemies') || new Set();
          if (!hitSet.has(enemy.id)) {
            hitSet.add(enemy.id);
            hb.setData('hitEnemies', hitSet);
            const dmg = hb.getData('damage') || 10;
            const stats = useGameStore.getState().playerStats;
            const isCrit = Math.random() < (stats?.critRate || 0.1);
            const final = isCrit ? Math.floor(dmg * (stats?.critDamage || 1.5)) : dmg;
            enemy.takeDamage(final);
            this.showDmgNum(enemy.sprite.x + (Math.random() - 0.5) * 30, enemy.sprite.y - 30, final, isCrit ? '#ffff00' : '#ffffff', isCrit);
          }
        }
      }
    }
  }

  showDmgNum(x: number, y: number, dmg: number, color = '#ffffff', isCrit = false) {
    if (!useGameStore.getState().settings.showDamageNumbers) return;
    const t = this.add.text(x, y, isCrit ? `${dmg}!` : `${dmg}`, {
      fontSize: isCrit ? '18px' : '14px', fontFamily: 'monospace', color, stroke: '#000000', strokeThickness: 2,
    }).setDepth(50);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1200, ease: 'Power2', onComplete: () => t.destroy() });
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    this.isPaused ? this.physics.pause() : this.physics.resume();
    useGameStore.getState().emitGameEvent('game-paused', { paused: this.isPaused });
  }

  private getItemIcon(itemId: string): string {
    const icons: Record<string, string> = {
      code_fragment: '📄', data_crystal: '💎', corrupted_core: '🔴',
      legendary_shard: '⭐', system_key: '🔑', health_potion: '🧪',
    };
    return icons[itemId] || '📦';
  }

  // #2 FIX: shutdown() is called by Phaser when the scene is stopped/restarted.
  // All store event listeners are unsubscribed here to prevent accumulation.
  shutdown() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    this.player?.destroy();
    // Return pooled emitters to a clean state
    this.particlePool.forEach(e => { try { e.destroy(); } catch {} });
    this.particlePool = [];
  }
}

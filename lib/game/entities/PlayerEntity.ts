import Phaser from 'phaser';
import { CharacterId, SkillKey } from '../../types/game';
import { CHARACTERS } from '../../types/characters';
import { useGameStore } from '../../store/gameStore';
export class PlayerEntity {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public skillHitboxes: Phaser.GameObjects.Rectangle[] = [];
  private scene: Phaser.Scene;
  private characterId: CharacterId;
  private isDashing = false;
  private dashTimer = 0;
  private facingRight = true;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shieldVisual?: Phaser.GameObjects.Ellipse;
  constructor(scene: Phaser.Scene, x: number, y: number, characterId: CharacterId) {
    this.scene = scene; this.characterId = characterId;
    const char = CHARACTERS[characterId];
    const spriteKey = `player_${characterId.split('-')[0]}`;
    this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    this.sprite.setCollideWorldBounds(true).setDepth(10).setScale(2);
    this.sprite.setTint(parseInt(char.color.replace('#',''), 16));
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(20,30).setMaxVelocity(300,300);
    this.trailEmitter = scene.add.particles(x, y, 'particle_white', { speed:{min:5,max:20}, scale:{start:0.4,end:0}, alpha:{start:0.5,end:0}, lifespan:300, frequency:50, quantity:1, tint:parseInt(char.color.replace('#',''),16), blendMode:'ADD' }).setDepth(9);
    this.trailEmitter.startFollow(this.sprite);
  }
  update(delta: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: Record<string, Phaser.Input.Keyboard.Key>, skillKeys: Record<SkillKey, Phaser.Input.Keyboard.Key>) {
    const store = useGameStore.getState();
    if (!store.playerStats) return;
    if (this.dashTimer > 0) { this.dashTimer -= delta; if (this.dashTimer <= 0) this.isDashing = false; }
    if (!this.isDashing) this.handleMovement(cursors, wasd, store.playerStats.speed);
    this.handleSkillInput(skillKeys, store);
    this.cleanHitboxes(delta);
    if (this.characterId === 'php-elephant') {
      const rate = store.playerStats.hp < store.playerStats.maxHp * 0.3 ? 0.04 : 0.02;
      if (Math.random() < rate * delta / 1000) store.healPlayer(1);
    }
  }
  private handleMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: Record<string, Phaser.Input.Keyboard.Key>, speed: number) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const store = useGameStore.getState();
    const slow = store.activeStatusEffects.find(e => e.type === 'slow');
    const stun = store.activeStatusEffects.find(e => e.type === 'stun');
    if (stun) { body.setVelocity(0,0); return; }
    const spd = (150+speed)*(slow?1-slow.value:1);
    let vx=0, vy=0;
    if (cursors.left.isDown||wasd.A?.isDown) { vx=-spd; this.facingRight=false; }
    if (cursors.right.isDown||wasd.D?.isDown) { vx=spd; this.facingRight=true; }
    if (cursors.up.isDown||wasd.W?.isDown) vy=-spd;
    if (cursors.down.isDown||wasd.S?.isDown) vy=spd;
    if (vx&&vy) { vx*=0.707; vy*=0.707; }
    body.setVelocity(vx,vy);
    this.sprite.setFlipX(!this.facingRight);
    this.trailEmitter.setVisible(vx!==0||vy!==0);
  }
  private handleSkillInput(skillKeys: Record<SkillKey, Phaser.Input.Keyboard.Key>, store: ReturnType<typeof useGameStore.getState>) {
    (['Q','W','E','R'] as SkillKey[]).forEach(key => { if (Phaser.Input.Keyboard.JustDown(skillKeys[key])) { if (store.useSkill(key)) this.executeSkill(key); } });
  }
  executeSkill(key: SkillKey) {
    const char = CHARACTERS[this.characterId];
    const skill = char.skills[key];
    const dmg = skill.damage || 30;
    const range = skill.range || 150;
    const color = parseInt(char.color.replace('#',''), 16);
    switch (key) {
      case 'Q': this.createComboAttack(3, dmg, range, color); break;
      case 'W': this.executeDash(180, dmg*0.8, color); break;
      case 'E': this.createAOE(dmg, range, color); break;
      case 'R': this.createUltimate(dmg, color); break;
    }
    if (this.characterId === 'cpp-rhino') { const stats = useGameStore.getState().playerStats; if (stats) useGameStore.getState().takeDamage(Math.floor(stats.hp*0.05), 'true'); }
  }
  private createHitbox(x: number, y: number, w: number, h: number, damage: number, color: number, lifetime: number) {
    const hb = this.scene.add.rectangle(x, y, w, h, color, 0.3).setDepth(15);
    hb.setData('damage', damage); hb.setData('hitEnemies', new Set()); hb.setData('lifetime', lifetime);
    this.skillHitboxes.push(hb); return hb;
  }
  private createComboAttack(hits: number, dmg: number, range: number, color: number) {
    for (let i=0; i<hits; i++) {
      this.scene.time.delayedCall(i*150, () => {
        const dir = this.facingRight?1:-1;
        this.createHitbox(this.sprite.x+dir*range/2, this.sprite.y, range, 40, dmg, color, 300);
        this.spawnParticles(this.sprite.x+dir*range/2, this.sprite.y, color, 8);
        if (useGameStore.getState().settings.screenShake) this.scene.cameras.main.shake(50, 0.003);
      });
    }
  }
  private executeDash(distance: number, damage: number, color: number) {
    this.isDashing = true; this.dashTimer = 300;
    const dir = this.facingRight?1:-1;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(dir*distance*5, 0);
    this.createHitbox(this.sprite.x+dir*distance/2, this.sprite.y, distance, 30, damage, color, 300);
    this.spawnParticles(this.sprite.x, this.sprite.y, color, 20);
    this.scene.tweens.add({ targets:this.sprite, alpha:0.3, duration:100, yoyo:true, repeat:2 });
    this.scene.time.delayedCall(300, () => { (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0,0); });
  }
  private createAOE(damage: number, range: number, color: number) {
    const cx=this.sprite.x, cy=this.sprite.y;
    this.createHitbox(cx, cy, range*2, range*2, damage, color, 400);
    this.spawnParticles(cx, cy, color, 25);
    const ring = this.scene.add.circle(cx, cy, range, color, 0.2).setStrokeStyle(2, color, 0.8);
    this.scene.tweens.add({ targets:ring, scaleX:1.5, scaleY:1.5, alpha:0, duration:400, onComplete:()=>ring.destroy() });
    if (useGameStore.getState().settings.screenShake) this.scene.cameras.main.shake(150, 0.008);
  }
  private createUltimate(damage: number, color: number) {
    const cx=this.sprite.x, cy=this.sprite.y;
    this.scene.cameras.main.flash(100, 255, 255, 0, false);
    [60,120,180,240,300].forEach((radius, i) => {
      this.scene.time.delayedCall(i*250, () => {
        this.createHitbox(cx, cy, radius*2, radius*2, Math.floor(damage/5), color, 400);
        this.spawnParticles(cx, cy, color, 15+i*5);
        const ring = this.scene.add.circle(cx, cy, radius, color, 0.3).setStrokeStyle(3, color, 1);
        this.scene.tweens.add({ targets:ring, scaleX:1.5, scaleY:1.5, alpha:0, duration:400, onComplete:()=>ring.destroy() });
        if (useGameStore.getState().settings.screenShake) this.scene.cameras.main.shake(100*(i+1), 0.005*(i+1));
      });
    });
    useGameStore.getState().addNotification({ type:'success', title:'💥 ULTIMATE!', message:'Massive AOE unleashed!', duration:2000 });
  }
  private spawnParticles(x: number, y: number, color: number, count: number) {
    if (!useGameStore.getState().settings.particleEffects) return;
    const p = this.scene.add.particles(x, y, 'particle_white', { speed:{min:50,max:150}, scale:{start:0.5,end:0}, alpha:{start:0.8,end:0}, lifespan:400, quantity:count, tint:color, blendMode:'ADD' });
    this.scene.time.delayedCall(500, () => p.destroy());
  }
  activateShield(duration: number, color: number) {
    this.shieldVisual?.destroy();
    this.shieldVisual = this.scene.add.ellipse(this.sprite.x, this.sprite.y, 80, 100, color, 0.2).setStrokeStyle(3, color, 0.8).setDepth(9);
    const follow = this.scene.time.addEvent({ delay:16, repeat:Math.floor(duration/16), callback:()=>this.shieldVisual?.setPosition(this.sprite.x, this.sprite.y) });
    this.scene.time.delayedCall(duration, () => { this.shieldVisual?.destroy(); this.shieldVisual=undefined; follow.destroy(); });
  }
  private cleanHitboxes(delta: number) {
    this.skillHitboxes = this.skillHitboxes.filter(hb => {
      if (!hb.active) return false;
      const lt = hb.getData('lifetime') - delta;
      hb.setData('lifetime', lt);
      if (lt <= 0) { hb.destroy(); return false; }
      return true;
    });
  }
  isAlive() { return (useGameStore.getState().playerStats?.hp||0) > 0; }
  destroy() { this.sprite.destroy(); this.trailEmitter?.destroy(); this.shieldVisual?.destroy(); this.skillHitboxes.forEach(h => h.destroy()); }
}

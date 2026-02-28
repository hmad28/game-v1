import Phaser from 'phaser';
import { DataBeast, AIState, Attack } from '../../types/game';
import { PlayerEntity } from './PlayerEntity';
import { useGameStore } from '../../store/gameStore';
export class EnemyEntity {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public dataBeast: DataBeast;
  public id: string;
  public contactDamageCooldown = 0;
  private scene: Phaser.Scene;
  private state: AIState = 'patrol';
  private hp: number;
  private maxHp: number;
  private aggroRange = 250;
  private attackRange = 80;
  private attackCooldowns = new Map<string, number>();
  private patrolPath: Phaser.Math.Vector2[] = [];
  private patrolIdx = 0;
  private patrolWait = 0;
  private isStunned = false;
  private stunTimer = 0;
  private hpBar!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private corruptionEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private phaseIdx = 0;
  private isEnraged = false;
  private attackAnimTimer = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, dataBeast: DataBeast) {
    this.scene = scene; this.dataBeast = dataBeast; this.id = dataBeast.id;
    this.hp = dataBeast.stats.hp; this.maxHp = dataBeast.stats.maxHp;
    const spriteKeys = ['player_javascript','player_python','player_php','player_cpp','player_java','player_csharp','player_go','player_rust','player_typescript','player_swift'];
    this.sprite = scene.physics.add.sprite(x, y, spriteKeys[dataBeast.pokemonId % 10]);
    this.sprite.setCollideWorldBounds(true).setDepth(8).setScale(dataBeast.isBoss?3:2).setTint(dataBeast.tintColor);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(24,24);
    this.loadSprite(dataBeast.spriteUrl, dataBeast.pokemonId);
    this.hpBar = scene.add.graphics().setDepth(13);
    this.nameText = scene.add.text(x, y-40, dataBeast.corruptedName, { fontSize:dataBeast.isBoss?'12px':'9px', fontFamily:'monospace', color:dataBeast.isBoss?'#ff4444':'#ff8888', stroke:'#000000', strokeThickness:2 }).setOrigin(0.5).setDepth(12);
    if (dataBeast.corruptionLevel > 50) this.createCorruptionFX();
    this.generatePatrol();
    dataBeast.attacks.forEach(a => this.attackCooldowns.set(a.name, 0));
    if (dataBeast.isBoss) this.bossEntrance();
  }
  private loadSprite(url: string, id: number) {
    const key = `pokemon_${id}`;
    if (this.scene.textures.exists(key)) { this.sprite.setTexture(key); this.applyShaders(); return; }
    this.scene.load.image(key, url);
    this.scene.load.once('complete', () => { if (this.sprite.active) { this.sprite.setTexture(key); this.applyShaders(); } });
    this.scene.load.start();
  }
  private applyShaders() {
    const c = this.dataBeast.corruptionLevel;
    this.sprite.setTint(this.dataBeast.tintColor);
    if (c > 30 && this.sprite.postFX) { try { this.sprite.postFX.addGlow(this.dataBeast.tintColor, 4, 0, false); } catch {} }
    if (c > 60 && this.sprite.postFX) { try { this.sprite.postFX.addPixelate(2); } catch {} }
    if (c > 80) { this.scene.tweens.add({ targets:this.sprite, alpha:{from:1,to:0.7}, duration:100, yoyo:true, repeat:-1 }); }
  }
  private createCorruptionFX() {
    this.corruptionEmitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle_corruption', { speed:{min:10,max:30}, scale:{start:0.3,end:0}, alpha:{start:0.6,end:0}, lifespan:500, frequency:Math.max(50,200-this.dataBeast.corruptionLevel*1.5), quantity:Math.floor(this.dataBeast.corruptionLevel/20), tint:this.dataBeast.tintColor, blendMode:'ADD' }).setDepth(7);
    this.corruptionEmitter.startFollow(this.sprite);
  }
  private generatePatrol() {
    const r=100;
    for (let i=0; i<4; i++) { const a=(i/4)*Math.PI*2; this.patrolPath.push(new Phaser.Math.Vector2(this.sprite.x+Math.cos(a)*r, this.sprite.y+Math.sin(a)*r)); }
  }
  private bossEntrance() {
    this.sprite.setAlpha(0).setScale(0.5);
    this.scene.tweens.add({ targets:this.sprite, alpha:1, scaleX:3, scaleY:3, duration:1000, ease:'Back.easeOut' });
    this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle_void', { speed:{min:100,max:300}, scale:{start:1,end:0}, lifespan:1000, quantity:50, tint:this.dataBeast.tintColor, blendMode:'ADD', angle:{min:0,max:360} });
    const t = this.scene.add.text(this.sprite.x, this.sprite.y-100, `⚠️ BOSS: ${this.dataBeast.corruptedName} ⚠️`, { fontSize:'16px', fontFamily:'monospace', color:'#ff0000', stroke:'#000000', strokeThickness:3 }).setOrigin(0.5).setDepth(50);
    this.scene.tweens.add({ targets:t, y:t.y-50, alpha:0, duration:3000, onComplete:()=>t.destroy() });
  }
  update(delta: number, player: PlayerEntity) {
    if (!this.sprite.active || this.hp <= 0) return;
    this.contactDamageCooldown = Math.max(0, this.contactDamageCooldown-delta);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer-delta);
    this.attackCooldowns.forEach((cd,name) => this.attackCooldowns.set(name, Math.max(0,cd-delta)));
    if (this.isStunned) { this.stunTimer -= delta; if (this.stunTimer <= 0) { this.isStunned=false; this.sprite.setTint(this.dataBeast.tintColor); } (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0,0); this.updateUI(); return; }
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
    this.evaluateState(dist, dist < this.aggroRange);
    this.executeState(delta, player, dist);
    if (this.dataBeast.isBoss) this.checkPhases();
    this.updateUI();
  }
  private evaluateState(dist: number, hasAggro: boolean) {
    const hpPct = this.hp/this.maxHp;
    if (!hasAggro) { if (this.state!=='patrol') this.state='patrol'; return; }
    if (this.dataBeast.behavior==='defensive'&&hpPct<0.3&&this.state!=='retreat') { this.state='retreat'; return; }
    if (this.isEnraged||dist<=this.attackRange) this.state=dist<=this.attackRange?'attack':'chase';
    else this.state='chase';
  }
  private executeState(delta: number, player: PlayerEntity, dist: number) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const spd = this.dataBeast.stats.speed*0.8;
    switch (this.state) {
      case 'patrol': this.doPatrol(body,spd); break;
      case 'chase': this.doChase(body,spd,player); break;
      case 'attack': body.setVelocity(0,0); if (this.attackAnimTimer<=0&&this.canAttack()) { this.doAttack(player); this.attackAnimTimer=500; } break;
      case 'retreat': this.doRetreat(body,spd,player); break;
    }
  }
  private doPatrol(body: Phaser.Physics.Arcade.Body, spd: number) {
    if (!this.patrolPath.length) return;
    if (this.patrolWait>0) { this.patrolWait-=16; body.setVelocity(0,0); return; }
    const t=this.patrolPath[this.patrolIdx];
    const d=Phaser.Math.Distance.Between(this.sprite.x,this.sprite.y,t.x,t.y);
    if (d<15) { this.patrolIdx=(this.patrolIdx+1)%this.patrolPath.length; this.patrolWait=1000; body.setVelocity(0,0); }
    else { const a=Phaser.Math.Angle.Between(this.sprite.x,this.sprite.y,t.x,t.y); body.setVelocity(Math.cos(a)*spd*0.3,Math.sin(a)*spd*0.3); }
  }
  private doChase(body: Phaser.Physics.Arcade.Body, spd: number, player: PlayerEntity) {
    const a=Phaser.Math.Angle.Between(this.sprite.x,this.sprite.y,player.sprite.x,player.sprite.y);
    if (this.dataBeast.behavior==='ranged') {
      const d=Phaser.Math.Distance.Between(this.sprite.x,this.sprite.y,player.sprite.x,player.sprite.y);
      if (d<120) body.setVelocity(-Math.cos(a)*spd*0.7,-Math.sin(a)*spd*0.7);
      else if (d>180) body.setVelocity(Math.cos(a)*spd*0.5,Math.sin(a)*spd*0.5);
      else body.setVelocity(Math.cos(a+Math.PI/2)*spd*0.6,Math.sin(a+Math.PI/2)*spd*0.6);
    } else body.setVelocity(Math.cos(a)*spd,Math.sin(a)*spd);
    this.sprite.setFlipX(player.sprite.x<this.sprite.x);
  }
  private doRetreat(body: Phaser.Physics.Arcade.Body, spd: number, player: PlayerEntity) {
    const a=Phaser.Math.Angle.Between(this.sprite.x,this.sprite.y,player.sprite.x,player.sprite.y);
    body.setVelocity(-Math.cos(a)*spd,-Math.sin(a)*spd);
    if (this.hp/this.maxHp>0.5) this.state='chase';
  }
  private canAttack() { return this.dataBeast.attacks.some(a=>(this.attackCooldowns.get(a.name)||0)<=0); }
  private doAttack(player: PlayerEntity) {
    const available = this.dataBeast.attacks.filter(a=>(this.attackCooldowns.get(a.name)||0)<=0);
    if (!available.length) return;
    const attack = this.dataBeast.isBoss ? available.reduce((b,a)=>a.damage>b.damage?a:b) : available[Math.floor(Math.random()*available.length)];
    this.attackCooldowns.set(attack.name, attack.cooldown);
    if (attack.telegraph) { const w=this.scene.add.text(this.sprite.x,this.sprite.y-60,`⚠️ ${attack.name}`,{fontSize:'10px',fontFamily:'monospace',color:'#ff0000'}).setOrigin(0.5).setDepth(20); this.scene.time.delayedCall(attack.telegraph,()=>{w.destroy();this.executeAttack(attack,player);}); }
    else this.executeAttack(attack,player);
  }
  private executeAttack(attack: Attack, player: PlayerEntity) {
    const dist=Phaser.Math.Distance.Between(this.sprite.x,this.sprite.y,player.sprite.x,player.sprite.y);
    const maxRange={melee:100,mid:200,long:400,screen:9999}[attack.range];
    if (dist>maxRange) return;
    const store=useGameStore.getState();
    store.takeDamage(attack.damage,'physical');
    if (attack.statusEffect) store.addStatusEffect(attack.statusEffect);
    if (attack.range==='screen') this.scene.cameras.main.flash(200,255,0,0,false);
    else { const proj=this.scene.add.circle(this.sprite.x,this.sprite.y,8,this.dataBeast.tintColor,1).setDepth(15); this.scene.tweens.add({targets:proj,x:player.sprite.x,y:player.sprite.y,duration:300,onComplete:()=>{proj.destroy();this.scene.add.particles(player.sprite.x,player.sprite.y,'particle_corruption',{speed:{min:50,max:100},scale:{start:0.5,end:0},lifespan:300,quantity:10,tint:this.dataBeast.tintColor,blendMode:'ADD'});}}); }
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(100,()=>{if(this.sprite.active)this.sprite.setTint(this.isEnraged?0xff0000:this.dataBeast.tintColor);});
  }
  private checkPhases() {
    if (!this.dataBeast.bossPhases) return;
    const hpPct=(this.hp/this.maxHp)*100;
    while (this.phaseIdx<this.dataBeast.bossPhases.length&&hpPct<=this.dataBeast.bossPhases[this.phaseIdx].hpThreshold) {
      const phase=this.dataBeast.bossPhases[this.phaseIdx];
      if (phase.newAttacks) { this.dataBeast.attacks.push(...phase.newAttacks); phase.newAttacks.forEach(a=>this.attackCooldowns.set(a.name,0)); }
      if (phase.behaviorChange==='berserker') this.isEnraged=true;
      if (phase.visualChange==='rage_mode') { this.sprite.setTint(0xff0000); this.sprite.setScale(3.5); }
      if (phase.dialogue) useGameStore.getState().showDialogue([{speaker:this.dataBeast.corruptedName,text:phase.dialogue}]);
      if (phase.environmentEffect==='screen_shake') this.scene.cameras.main.shake(500,0.02);
      this.scene.add.particles(this.sprite.x,this.sprite.y,'particle_void',{speed:{min:100,max:250},scale:{start:0.8,end:0},lifespan:600,quantity:30,tint:0xff0000,blendMode:'ADD',angle:{min:0,max:360}});
      this.phaseIdx++;
    }
  }
  private updateUI() {
    const x=this.sprite.x, y=this.sprite.y-30;
    const w=this.dataBeast.isBoss?80:40, h=5;
    const pct=this.hp/this.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x330000,0.8).fillRect(x-w/2,y,w,h);
    this.hpBar.fillStyle(pct>0.5?0x00ff00:pct>0.25?0xffff00:0xff0000,1).fillRect(x-w/2,y,w*pct,h);
    this.hpBar.lineStyle(1,0x666666,0.8).strokeRect(x-w/2,y,w,h);
    this.nameText.setPosition(x,y-12);
  }
  takeDamage(amount: number) {
    if (this.hp<=0) return;
    this.hp=Math.max(0,this.hp-amount);
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(100,()=>{if(this.sprite.active)this.sprite.setTint(this.isEnraged?0xff0000:this.dataBeast.tintColor);});
    this.scene.tweens.add({targets:this.sprite,x:this.sprite.x+(Math.random()-0.5)*10,duration:50,yoyo:true});
  }
  applyStun(duration: number) { this.isStunned=true; this.stunTimer=duration*1000; this.sprite.setTint(0x8888ff); }
  isAlive() { return this.hp>0; }
  destroy() { this.sprite.destroy(); this.hpBar.destroy(); this.nameText.destroy(); this.corruptionEmitter?.destroy(); }
}

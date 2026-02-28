import Phaser from 'phaser';
export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }
  preload() {
    const { width, height } = this.cameras.main;
    const cx = width/2, cy = height/2;
    this.add.rectangle(cx, cy, width, height, 0x000000);
    this.add.text(cx, cy-80, 'CODEBOUND', { fontSize:'32px', fontFamily:'monospace', color:'#00ff41', stroke:'#003300', strokeThickness:2 }).setOrigin(0.5);
    this.add.text(cx, cy-45, 'THE SYNTAX CHRONICLES', { fontSize:'14px', fontFamily:'monospace', color:'#00aa22' }).setOrigin(0.5);
    this.add.rectangle(cx, cy+20, 400, 20, 0x111111).setStrokeStyle(1, 0x00ff41);
    const bar = this.add.graphics();
    const lt = this.add.text(cx, cy+55, 'Initializing...', { fontSize:'12px', fontFamily:'monospace', color:'#00ff41' }).setOrigin(0.5);
    const pt = this.add.text(cx, cy+75, '0%', { fontSize:'11px', fontFamily:'monospace', color:'#008822' }).setOrigin(0.5);
    this.load.on('progress', (v: number) => { bar.clear(); bar.fillStyle(0x00ff41,1); bar.fillRect(cx-198,cy+11,396*v,18); pt.setText(`${Math.floor(v*100)}%`); });
    this.load.on('fileprogress', (f: { key: string }) => lt.setText(`Loading: ${f.key}`));
    this.load.on('complete', () => lt.setText('Complete!'));
    this.generateAssets();
  }
  private generateAssets() {
    const pc: [string, number][] = [['particle_white',0xffffff],['particle_corruption',0x00ff41],['particle_fire',0xff4400],['particle_electric',0xffff00],['particle_void',0xff0000],['particle_heal',0x00ff88],['skill_explosion',0xff8800]];
    pc.forEach(([k,c]) => this.genParticle(k,c));
    const chars: [string,string,string][] = [['player_javascript','#F7DF1E','#3B82F6'],['player_python','#3776AB','#FFD43B'],['player_php','#8892BF','#4F5B93'],['player_cpp','#00599C','#F34B7D'],['player_java','#ED8B00','#5382A1'],['player_csharp','#9B4F96','#68217A'],['player_go','#00ADD8','#FFFFFF'],['player_rust','#CE422B','#F74C00'],['player_typescript','#3178C6','#F7DF1E'],['player_swift','#FA7343','#FFFFFF']];
    chars.forEach(([k,c1,c2]) => this.genSprite(k,c1,c2));
    const tiles: [string,string,string][] = [['tile_boot','#1a1a1a','#2a2a2a'],['tile_syntax','#0a1a0a','#0d2a0d'],['tile_memory','#0a0a1a','#0d0d2a'],['tile_process','#1a0a1a','#2a0d2a'],['tile_network','#0a1a1a','#0d2a2a'],['tile_kernel','#1a0000','#2a0000']];
    tiles.forEach(([k,c1,c2]) => { this.genTile(`${k}_floor`,c1,c2); this.genTile(`${k}_wall`,c2,c1); });
  }
  private genParticle(key: string, color: number) {
    const c = document.createElement('canvas'); c.width=8; c.height=8;
    const ctx = c.getContext('2d')!;
    const r=(color>>16)&0xff, g=(color>>8)&0xff, b=color&0xff;
    const grad = ctx.createRadialGradient(4,4,0,4,4,4);
    grad.addColorStop(0,`rgba(${r},${g},${b},1)`); grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.fillStyle=grad; ctx.fillRect(0,0,8,8);
    this.textures.addCanvas(key,c);
  }
  private genSprite(key: string, primary: string, accent: string) {
    const c = document.createElement('canvas'); c.width=32; c.height=48;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle=primary; ctx.fillRect(8,16,16,20); ctx.fillRect(10,4,12,14);
    ctx.fillStyle='#000000'; ctx.fillRect(12,8,3,3); ctx.fillRect(17,8,3,3);
    ctx.fillStyle=accent; ctx.fillRect(10,18,12,4);
    ctx.fillStyle=primary; ctx.fillRect(9,36,6,10); ctx.fillRect(17,36,6,10); ctx.fillRect(2,18,6,14); ctx.fillRect(24,18,6,14);
    this.textures.addCanvas(key,c);
  }
  private genTile(key: string, c1: string, c2: string) {
    const c = document.createElement('canvas'); c.width=32; c.height=32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle=c1; ctx.fillRect(0,0,32,32);
    ctx.fillStyle=c2; ctx.fillRect(0,0,16,16); ctx.fillRect(16,16,16,16);
    ctx.strokeStyle=c2; ctx.lineWidth=0.5; ctx.strokeRect(0,0,32,32);
    this.textures.addCanvas(key,c);
  }
  create() { this.scene.start('GameScene'); }
}

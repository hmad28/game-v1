import { PokemonAPIResponse, DataBeast, Attack, EnemyStats, BossPhase, DropItem, BehaviorPattern, ElementType, CHAPTER_GEN_MAP, CORRUPTION_PREFIXES, CORRUPTION_SUFFIXES, TYPE_ELEMENT_MAP } from '../../types/game';
const cache = new Map<number, { data: PokemonAPIResponse; exp: number }>();
const API = 'https://pokeapi.co/api/v2';
class PokeAPIServiceClass {
  private q = new Map<number, Promise<PokemonAPIResponse>>();
  async fetch(id: number): Promise<PokemonAPIResponse> {
    const c = cache.get(id);
    if (c && c.exp > Date.now()) return c.data;
    if (this.q.has(id)) return this.q.get(id)!;
    const p = this.fetchAPI(id);
    this.q.set(id, p);
    try { const d = await p; cache.set(id, { data:d, exp:Date.now()+7*24*60*60*1000 }); return d; }
    finally { this.q.delete(id); }
  }
  private async fetchAPI(id: number): Promise<PokemonAPIResponse> {
    try { const r = await fetch(`${API}/pokemon/${id}`); if (!r.ok) throw new Error(); return r.json(); }
    catch { return this.fallback(id); }
  }
  private fallback(id: number): PokemonAPIResponse {
    const names = ['Glitchmon','Errormon','Nullmon','Voidmon','Corruptmon'];
    const types = ['normal','fire','water','electric','grass','psychic','dark','ghost'];
    return { id, name:names[id%names.length], base_experience:50+(id%200), stats:[{base_stat:45+(id%60),stat:{name:'hp'}},{base_stat:40+(id%80),stat:{name:'attack'}},{base_stat:35+(id%70),stat:{name:'defense'}},{base_stat:40+(id%80),stat:{name:'special-attack'}},{base_stat:35+(id%70),stat:{name:'special-defense'}},{base_stat:45+(id%60),stat:{name:'speed'}}], types:[{type:{name:types[id%types.length]}}], abilities:[{ability:{name:'glitch'},is_hidden:false}], sprites:{front_default:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,front_shiny:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`}, moves:[] };
  }
  selectPokemon(chapterId: number): number {
    const g = CHAPTER_GEN_MAP[chapterId]||{min:1,max:151};
    return g.min+Math.floor(Math.random()*(g.max-g.min+1));
  }
  async createDataBeast(pokemonId: number, chapterId: number, isBoss=false): Promise<DataBeast> {
    const data = await this.fetch(pokemonId);
    const bc = (chapterId-1)*15+15;
    const corr = Math.min(100,Math.max(10,isBoss?bc+20:bc+Math.floor(Math.random()*20)-10));
    const level = chapterId*5+Math.floor(Math.random()*5);
    const bs = this.extractStats(data);
    const stats = this.transformStats(bs,level,corr);
    const pt = data.types[0]?.type.name||'normal';
    const st = data.types[1]?.type.name;
    const element = (TYPE_ELEMENT_MAP[pt]||'normal') as ElementType;
    const subElement = st?(TYPE_ELEMENT_MAP[st]||undefined) as ElementType:undefined;
    const attacks = this.genAttacks(corr,element);
    const behavior = this.assignBehavior(stats);
    const corruptedName = this.corruptName(data.name,corr);
    const spriteUrl = data.sprites.other?.['official-artwork']?.front_default||data.sprites.front_default||`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    const tintColor = this.getTint(corr);
    const dropTable = this.genDrops(corr,isBoss);
    const bossPhases = isBoss?this.genPhases(corr,corruptedName):undefined;
    const xpReward = Math.floor((data.base_experience||50)*(1+corr/100)*(isBoss?5:1));
    return { id:`beast_${pokemonId}_${Date.now()}`, pokemonId, originalName:data.name, corruptedName, corruptionLevel:corr, stats, attacks, behavior, element, subElement, spriteUrl, tintColor, isBoss, bossPhases, dropTable, xpReward, level };
  }
  private extractStats(p: PokemonAPIResponse) {
    const s: Record<string,number> = {};
    p.stats.forEach(st => { s[st.stat.name]=st.base_stat; });
    return { hp:s['hp']||45, attack:s['attack']||45, defense:s['defense']||45, specialAttack:s['special-attack']||45, speed:s['speed']||45 };
  }
  private transformStats(b: ReturnType<typeof this.extractStats>, level: number, corr: number): EnemyStats {
    const lm=1+level*0.1, cm=1+corr/100;
    return { hp:Math.floor(b.hp*lm*cm*2), maxHp:Math.floor(b.hp*lm*cm*2), attack:Math.floor(b.attack*lm*cm), defense:Math.floor(b.defense*lm*cm*0.8), speed:Math.floor(b.speed*lm*Math.min(cm,1.3)), specialAttack:Math.floor(b.specialAttack*lm*cm) };
  }
  corruptName(original: string, corr: number): string {
    const pre = corr>70?CORRUPTION_PREFIXES[Math.floor(Math.random()*CORRUPTION_PREFIXES.length)]:corr>40?CORRUPTION_PREFIXES[Math.floor(Math.random()*3)]:'';
    const suf = corr>50?CORRUPTION_SUFFIXES[Math.floor(Math.random()*CORRUPTION_SUFFIXES.length)]:'';
    let name = original.toUpperCase();
    if (corr>30) { const gm: Record<string,string>={'A':'4','E':'3','I':'1','O':'0','S':'5','T':'7','L':'1'}; name=name.split('').map(c=>gm[c]&&Math.random()<corr/100?gm[c]:c).join(''); }
    if (corr>60) { const gc=['█','▓','░','▒']; const pos=Math.floor(Math.random()*name.length); name=name.slice(0,pos)+gc[Math.floor(Math.random()*gc.length)]+name.slice(pos); }
    return `${pre}${name}${suf}`;
  }
  private genAttacks(corr: number, element: ElementType): Attack[] {
    const attacks: Attack[] = [
      { name:'Corrupted Strike', damage:10+Math.floor(corr/5), element:'corrupted', range:'melee', cooldown:1500, animation:'attack_basic' },
      { name:`${element.charAt(0).toUpperCase()+element.slice(1)} Glitch`, damage:15+Math.floor(corr/3), element, range:corr>50?'mid':'melee', cooldown:3000, statusEffect:this.getElemStatus(element), animation:`attack_${element}` },
    ];
    if (corr>70) attacks.push({ name:'Buffer Overflow', damage:30+Math.floor(corr/2), element:'void', range:'long', cooldown:8000, statusEffect:{type:'stun',value:0,duration:1.5,stackable:false}, animation:'attack_overflow' });
    if (corr>90) attacks.push({ name:'System Crash', damage:100+corr, element:'void', range:'screen', cooldown:20000, statusEffect:{type:'slow',value:0.8,duration:5,stackable:false}, animation:'attack_ultimate', telegraph:3000 });
    return attacks;
  }
  private getElemStatus(element: ElementType): Attack['statusEffect'] {
    const m: Partial<Record<ElementType,Attack['statusEffect']>> = { fire:{type:'burn',value:5,duration:3,stackable:false}, ice:{type:'freeze',value:0,duration:1.5,stackable:false}, electric:{type:'stun',value:0,duration:0.5,stackable:false}, poison:{type:'poison',value:8,duration:4,stackable:true}, psychic:{type:'slow',value:0.3,duration:2,stackable:false}, dark:{type:'blind',value:0,duration:2,stackable:false} };
    return m[element];
  }
  private assignBehavior(stats: EnemyStats): BehaviorPattern {
    const { attack, defense, speed, hp } = stats;
    const off = attack/(attack+defense), surv = (defense+hp)/(attack+defense+hp);
    if (speed>90) return 'stalker';
    if (off>0.7&&defense<60) return 'aggressive';
    if (surv>0.6) return 'defensive';
    if (attack<60&&speed<60) return 'swarm';
    if ((stats.specialAttack||0)>attack) return 'ranged';
    return 'aggressive';
  }
  getTint(level: number): number {
    if (level>80) return 0xff2222;
    if (level>60) return 0xff6600;
    if (level>40) return 0x00ff88;
    if (level>20) return 0x00ffff;
    return 0xffffff;
  }
  private genDrops(corr: number, isBoss: boolean): DropItem[] {
    const drops: DropItem[] = [
      { itemId:'code_fragment', name:'Code Fragment', dropChance:100, quantity:{min:1,max:2+Math.floor(corr/25)} },
      { itemId:'data_crystal', name:'Data Crystal', dropChance:30+(corr/2), quantity:{min:1,max:Math.max(1,Math.floor(corr/40))} },
      { itemId:'health_potion', name:'Health Potion', dropChance:20+(isBoss?30:0), quantity:{min:1,max:isBoss?3:1} },
    ];
    if (corr>70) drops.push({ itemId:'corrupted_core', name:'Corrupted Core', dropChance:5+(corr-70)/3, quantity:{min:1,max:1} });
    if (isBoss) { drops.push({ itemId:'legendary_shard', name:'Legendary Shard', dropChance:100, quantity:{min:1,max:1} }); drops.push({ itemId:'system_key', name:'System Key', dropChance:100, quantity:{min:1,max:1} }); }
    return drops;
  }
  private genPhases(corr: number, name: string): BossPhase[] {
    return [
      { hpThreshold:75, newAttacks:[{name:'Memory Corruption',damage:25+Math.floor(corr/4),element:'corrupted',range:'mid',cooldown:5000,animation:'phase1_special'}], dialogue:`${name}: INITIALIZING DEFENSIVE PROTOCOLS...`, environmentEffect:'spawn_adds' },
      { hpThreshold:50, newAttacks:[{name:'Stack Overflow',damage:40+Math.floor(corr/2),element:'void',range:'long',cooldown:7000,statusEffect:{type:'stun',value:0,duration:2,stackable:false},animation:'phase2_special'}], behaviorChange:'aggressive', dialogue:'ERROR: STABILITY_COMPROMISED.', visualChange:'increase_tint', environmentEffect:'screen_shake' },
      { hpThreshold:25, newAttacks:[{name:'SYSTEM FAILURE',damage:60+corr,element:'void',range:'screen',cooldown:10000,statusEffect:{type:'slow',value:0.8,duration:3,stackable:false},animation:'phase3_ultimate',telegraph:2000}], behaviorChange:'berserker', dialogue:'CRITICAL ERROR: FINAL PROTOCOL INITIATED.', visualChange:'rage_mode', environmentEffect:'danger_zone' },
    ];
  }
}
export const PokeAPIService = new PokeAPIServiceClass();

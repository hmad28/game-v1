export type GameScreen = 'main-menu'|'character-select'|'game'|'game-over'|'victory'|'leaderboard'|'settings'|'wiki';
export type CharacterId = 'javascript-fox'|'python-serpent'|'php-elephant'|'cpp-rhino'|'java-lion'|'csharp-wolf'|'go-panda'|'rust-eagle'|'typescript-fox'|'swift-cheetah';
export type ElementType = 'normal'|'fire'|'water'|'electric'|'grass'|'ice'|'fighting'|'poison'|'earth'|'wind'|'psychic'|'bug'|'ghost'|'dragon'|'dark'|'metal'|'fairy'|'corrupted'|'void'|'true';
export type DamageType = 'physical'|'magical'|'true';
export type StatusEffectType = 'stun'|'slow'|'poison'|'burn'|'freeze'|'silence'|'blind'|'haste';
export type BehaviorPattern = 'patrol'|'aggressive'|'defensive'|'stalker'|'ranged'|'swarm'|'berserker';
export type AIState = 'patrol'|'chase'|'attack'|'retreat'|'stunned'|'dead';
export type SkillKey = 'Q'|'W'|'E'|'R';
export interface StatusEffect { type: StatusEffectType; value: number; duration: number; stackable: boolean; }
export interface Attack { name: string; damage: number; element: ElementType; damageType?: DamageType; range: 'melee'|'mid'|'long'|'screen'; cooldown: number; statusEffect?: StatusEffect; animation: string; telegraph?: number; }
export interface PlayerStats { hp: number; maxHp: number; mana: number; maxMana: number; attack: number; defense: number; speed: number; critRate: number; critDamage: number; }
export interface EnemyStats { hp: number; maxHp: number; attack: number; defense: number; speed: number; specialAttack?: number; }
export interface Skill { key: SkillKey; name: string; description: string; manaCost: number; cooldown: number; currentCooldown: number; damage?: number; element?: ElementType; damageType?: DamageType; range?: number; statusEffect?: StatusEffect; codeSnippet?: string; animation: string; icon: string; }
export interface Character { id: CharacterId; name: string; title: string; language: string; description: string; lore: string; stats: PlayerStats; skills: Record<SkillKey, Skill>; passive: { name: string; description: string; effect: string; }; color: string; accentColor: string; emoji: string; voiceLines: { idle: string[]; attack: string[]; hit: string[]; death: string[]; victory: string[]; skill: Record<SkillKey, string>; }; }
export interface PokemonAPIResponse { id: number; name: string; base_experience: number; stats: Array<{ base_stat: number; stat: { name: string } }>; types: Array<{ type: { name: string } }>; abilities: Array<{ ability: { name: string }; is_hidden: boolean }>; sprites: { front_default: string; front_shiny: string; other?: { 'official-artwork'?: { front_default: string } } }; moves: Array<{ move: { name: string } }>; }
export interface DataBeast { id: string; pokemonId: number; originalName: string; corruptedName: string; corruptionLevel: number; stats: EnemyStats; attacks: Attack[]; behavior: BehaviorPattern; element: ElementType; subElement?: ElementType; spriteUrl: string; tintColor: number; isBoss: boolean; bossPhases?: BossPhase[]; dropTable: DropItem[]; xpReward: number; level: number; }
export interface BossPhase { hpThreshold: number; newAttacks: Attack[]; behaviorChange?: BehaviorPattern; visualChange?: string; dialogue?: string; environmentEffect?: string; }
export interface DropItem { itemId: string; name: string; dropChance: number; quantity: { min: number; max: number }; }
export interface InventoryItem { id: string; itemId: string; name: string; description: string; type: 'consumable'|'equipment'|'key'|'material'|'quest'; rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary'; quantity: number; icon: string; stats?: Partial<PlayerStats>; effect?: string; }
export interface GameSettings { masterVolume: number; musicVolume: number; sfxVolume: number; graphicsQuality: 'low'|'medium'|'high'; showDamageNumbers: boolean; showFPS: boolean; particleEffects: boolean; screenShake: boolean; language: string; }
export interface LeaderboardEntry { id: string; playerName: string; characterId: CharacterId; score: number; chapter: number; bossesDefeated: number; playTime: number; date: string; }
export interface DialogueEntry { speaker: string; text: string; portrait?: string; choices?: DialogueChoice[]; codeSnippet?: string; onComplete?: () => void; }
export interface DialogueChoice { text: string; consequence?: string; nextDialogue?: DialogueEntry[]; action?: () => void; }
export interface GameNotification { id: string; type: 'info'|'success'|'warning'|'error'|'achievement'; title: string; message: string; duration: number; icon?: string; }
export interface GameState { screen: GameScreen; selectedCharacter: CharacterId|null; currentChapter: number; playerStats: PlayerStats|null; playerLevel: number; playerXP: number; playerXPToNext: number; inventory: InventoryItem[]; gold: number; skills: Record<SkillKey, Skill>|null; skillCooldowns: Record<SkillKey, number>; activeStatusEffects: Array<StatusEffect & { remainingDuration: number }>; defeatedBosses: number[]; completedChapters: number[]; settings: GameSettings; leaderboard: LeaderboardEntry[]; dialogueQueue: DialogueEntry[]; isDialogueActive: boolean; notifications: GameNotification[]; }
export const CHAPTER_GEN_MAP: Record<number, { min: number; max: number }> = { 1:{min:1,max:151}, 2:{min:152,max:251}, 3:{min:252,max:386}, 4:{min:387,max:493}, 5:{min:494,max:649}, 6:{min:650,max:898} };
export const CORRUPTION_PREFIXES = ['Glitch_','Null_','Segfault_','Void_','Error_','NaN_'];
export const CORRUPTION_SUFFIXES = ['.exe','.dll','_BROKEN','.tmp','_404','_v2'];
export const TYPE_ELEMENT_MAP: Record<string, ElementType> = { normal:'normal',fire:'fire',water:'water',electric:'electric',grass:'grass',ice:'ice',fighting:'fighting',poison:'poison',ground:'earth',flying:'wind',psychic:'psychic',bug:'bug',rock:'earth',ghost:'ghost',dragon:'dragon',dark:'dark',steel:'metal',fairy:'fairy' };
export const ELEMENT_COLORS: Record<ElementType, string> = { normal:'#A8A878',fire:'#F08030',water:'#6890F0',electric:'#F8D030',grass:'#78C850',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',earth:'#E0C068',wind:'#A890F0',psychic:'#F85888',bug:'#A8B820',ghost:'#705898',dragon:'#7038F8',dark:'#705848',metal:'#B8B8D0',fairy:'#EE99AC',corrupted:'#00FF41',void:'#FF0000',true:'#FFFFFF' };
export const CHAPTERS = [
  { id:1, name:'Boot Sector', subtitle:'System Initialization', corruptionLevel:30, color:'#333333', description:'The beginning. Monochrome landscape with flickering terminals.' },
  { id:2, name:'Syntax Forest', subtitle:'Parsing Stage', corruptionLevel:45, color:'#003300', description:'Algorithmic maze of decision trees and recursive vines.' },
  { id:3, name:'Memory Heap', subtitle:'Data Storage', corruptionLevel:60, color:'#000033', description:'Vast wasteland of floating memory blocks and dangling pointers.' },
  { id:4, name:'Process Thread', subtitle:'Concurrent Execution', corruptionLevel:75, color:'#220033', description:'Labyrinthine network of parallel pathways with time dilation zones.' },
  { id:5, name:'Network Gateway', subtitle:'External Boundary', corruptionLevel:85, color:'#003333', description:'Dynamic firewall with packet platforms and protocol portals.' },
  { id:6, name:'The Kernel', subtitle:'Root Access', corruptionLevel:100, color:'#330000', description:'Pure abstraction. Reality itself distorted. VOID_EXCEPTION awaits.' },
];

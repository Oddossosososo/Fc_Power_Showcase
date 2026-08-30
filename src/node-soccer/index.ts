export type TeamId = 0 | 1;
export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'ATT';
export type MatchPhase = 'PRE_MATCH' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME';
export type RefereeDecision = 'PLAY_ON' | 'FOUL' | 'OFFSIDE' | 'YELLOW_CARD' | 'RED_CARD' | 'PENALTY' | 'GOAL';

export interface Vec2 { x: number; y: number }
export interface PlayerRatings {
  pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number;
}
export interface PlayerConfig { id: string; name: string; team: TeamId; role: PlayerRole; ovr: number; ratings?: Partial<PlayerRatings>; }
export interface TeamConfig { id: string; name: string; players: PlayerConfig[] }
export interface MatchEvent { time: number; type: RefereeDecision | 'KICK_OFF' | 'HALF_TIME' | 'FULL_TIME'; playerId?: string; team?: TeamId; text: string }

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const len = (v: Vec2) => Math.hypot(v.x, v.y);
const norm = (v: Vec2): Vec2 => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l }; };
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export class Player {
  readonly id: string; readonly name: string; readonly team: TeamId; readonly role: PlayerRole; readonly ovr: number;
  readonly ratings: PlayerRatings;
  position: Vec2 = { x: 0, y: 0 }; velocity: Vec2 = { x: 0, y: 0 };
  stamina = 100; hasBall = false; yellowCards = 0; sentOff = false;

  constructor(config: PlayerConfig) {
    this.id = config.id; this.name = config.name; this.team = config.team; this.role = config.role; this.ovr = config.ovr;
    const r = config.ratings ?? {};
    this.ratings = {
      pace: r.pace ?? config.ovr, shooting: r.shooting ?? config.ovr, passing: r.passing ?? config.ovr,
      dribbling: r.dribbling ?? config.ovr, defending: r.defending ?? config.ovr, physical: r.physical ?? config.ovr
    };
  }
}

export class Ball {
  position: Vec2 = { x: 0, y: 0 }; velocity: Vec2 = { x: 0, y: 0 };
  height = 0; verticalVelocity = 0; owner: Player | null = null;

  kick(direction: Vec2, power: number, lift = 0) {
    const d = norm(direction); this.owner = null;
    this.velocity = { x: d.x * power, y: d.y * power };
    this.verticalVelocity = lift;
  }

  update(dt: number) {
    if (this.owner) { this.position = { ...this.owner.position }; return; }
    this.position.x += this.velocity.x * dt; this.position.y += this.velocity.y * dt;
    this.height += this.verticalVelocity * dt; this.verticalVelocity -= 9.81 * dt;
    this.velocity.x *= Math.pow(0.985, dt * 60); this.velocity.y *= Math.pow(0.985, dt * 60);
    if (this.height <= 0) { this.height = 0; if (this.verticalVelocity < -0.5) this.verticalVelocity *= -0.32; else this.verticalVelocity = 0; }
  }
}

export class Referee {
  lastDecision: RefereeDecision = 'PLAY_ON';
  decisions: MatchEvent[] = [];
  decide(decision: RefereeDecision, time: number, text: string, player?: Player): MatchEvent {
    this.lastDecision = decision;
    const event: MatchEvent = { time, type: decision, playerId: player?.id, team: player?.team, text };
    this.decisions.push(event); return event;
  }
}

export class FootballMatch {
  readonly ball = new Ball(); readonly referee = new Referee();
  readonly players: Player[]; readonly events: MatchEvent[] = [];
  score: [number, number] = [0, 0]; clock = 0; phase: MatchPhase = 'PRE_MATCH';
  private running = false;
  private lastKickTeam: TeamId = 0;

  constructor(config: { teams: [TeamConfig, TeamConfig] }) {
    this.players = [...config.teams[0].players, ...config.teams[1].players].map(p => new Player(p));
    this.resetPositions();
  }

  start() { if (this.running) return; this.running = true; this.phase = 'FIRST_HALF'; this.emit('KICK_OFF', 'Kick-off'); }
  pause() { this.running = false; }
  resume() { if (this.phase !== 'FULL_TIME') this.running = true; }

  update(dt: number) {
    if (!this.running || this.phase === 'FULL_TIME') return;
    const step = clamp(dt, 0, 0.05); this.clock += step;
    if (this.phase === 'FIRST_HALF' && this.clock >= 45 * 60) { this.phase = 'HALF_TIME'; this.running = false; this.emit('HALF_TIME', 'Half time'); return; }
    if (this.phase === 'SECOND_HALF' && this.clock >= 90 * 60) { this.phase = 'FULL_TIME'; this.running = false; this.emit('FULL_TIME', 'Full time'); return; }
    this.ball.update(step); this.updateAI(step); this.resolvePossession(); this.checkRules();
  }

  startSecondHalf() { if (this.phase !== 'HALF_TIME') return; this.phase = 'SECOND_HALF'; this.clock = 45 * 60; this.resetPositions(); this.running = true; this.emit('KICK_OFF', 'Second half'); }

  pass(player: Player, target: Player, power = 7) {
    if (!player.hasBall || player.sentOff || target.team !== player.team) return false;
    const direction = { x: target.position.x - player.position.x, y: target.position.y - player.position.y };
    player.hasBall = false; this.ball.position = { ...player.position }; this.ball.kick(direction, clamp(power, 2, 12), 0.1);
    return true;
  }

  shoot(player: Player, target: Vec2, power = 10, lift = 1.5) {
    if (!player.hasBall || player.sentOff) return false;
    const accuracy = clamp(player.ratings.shooting / 100, 0.55, 1);
    const d = norm({ x: target.x - player.position.x, y: target.y - player.position.y });
    d.x += (Math.random() - 0.5) * (1 - accuracy) * 0.25; d.y += (Math.random() - 0.5) * (1 - accuracy) * 0.25;
    player.hasBall = false; this.ball.position = { ...player.position }; this.ball.kick(d, clamp(power, 3, 18), lift);
    return true;
  }

  tackle(tackler: Player, victim: Player) {
    if (tackler.sentOff || victim.team === tackler.team || dist(tackler.position, victim.position) > 1.1) return false;
    const clean = Math.random() < clamp((tackler.ratings.defending + tackler.ratings.physical - victim.ratings.dribbling) / 150, 0.18, 0.92);
    if (!clean) this.foul(tackler, victim); else { victim.hasBall = false; this.ball.owner = null; this.emit('PLAY_ON', `${tackler.name} wins the tackle`); }
    return clean;
  }

  foul(player: Player, victim?: Player) {
    this.emit('FOUL', `Foul by ${player.name}`, player);
    const serious = Math.random() < 0.15;
    if (serious) {
      player.yellowCards++;
      if (player.yellowCards >= 2) { player.sentOff = true; this.emit('RED_CARD', `${player.name} is sent off`, player); }
      else this.emit('YELLOW_CARD', `Yellow card for ${player.name}`, player);
    }
    if (victim && victim.team !== player.team && victim.position.x * (victim.team ? -1 : 1) > 3.8 && Math.random() < 0.12) this.emit('PENALTY', 'Penalty awarded');
  }

  private updateAI(dt: number) {
    for (const p of this.players) {
      if (p.sentOff || p.hasBall) continue;
      const opponents = this.players.filter(q => q.team !== p.team && !q.sentOff);
      const closest = opponents.sort((a, b) => dist(a.position, this.ball.position) - dist(b.position, this.ball.position))[0];
      let target = { ...p.position };
      if (closest === p || dist(p.position, this.ball.position) < 1.5) target = { ...this.ball.position };
      else if (p.role === 'GK') target = { x: p.team ? 5.0 : -5.0, y: clamp(this.ball.position.y, -2.2, 2.2) };
      else if (this.ball.owner?.team === p.team && p.role === 'ATT') target = { x: p.team ? -4.7 : 4.7, y: this.ball.position.y };
      const d = norm({ x: target.x - p.position.x, y: target.y - p.position.y });
      const speed = 2 + p.ratings.pace / 45; p.velocity.x += (d.x * speed - p.velocity.x) * clamp(dt * 5, 0, 1); p.velocity.y += (d.y * speed - p.velocity.y) * clamp(dt * 5, 0, 1);
      p.position.x = clamp(p.position.x + p.velocity.x * dt, -5.4, 5.4); p.position.y = clamp(p.position.y + p.velocity.y * dt, -3.4, 3.4);
      p.stamina = clamp(p.stamina - (len(p.velocity) > 3 ? 5 : -1) * dt, 0, 100);
    }
  }

  private resolvePossession() {
    if (this.ball.owner || this.ball.height > 0.18) return;
    const candidates = this.players.filter(p => !p.sentOff && dist(p.position, this.ball.position) < 0.42);
    if (!candidates.length) return;
    const p = candidates.sort((a, b) => dist(a.position, this.ball.position) - dist(b.position, this.ball.position))[0];
    this.players.forEach(q => q.hasBall = false); p.hasBall = true; this.ball.owner = p;
  }

  private checkRules() {
    const owner = this.ball.owner; if (!owner || owner.team !== 0) return;
    const defenders = this.players.filter(p => p.team === 1 && !p.sentOff).sort((a, b) => b.position.x - a.position.x);
    const secondLast = defenders[1];
    if (secondLast && owner.position.x > secondLast.position.x + 0.08 && owner.position.x > 0) {
      if (Math.random() < 0.008) { owner.hasBall = false; this.ball.owner = null; this.emit('OFFSIDE', `Offside: ${owner.name}`, owner); }
    }
  }

  private emit(type: MatchEvent['type'], text: string, player?: Player) {
    const event = this.referee.decide(type === 'KICK_OFF' || type === 'HALF_TIME' || type === 'FULL_TIME' ? 'PLAY_ON' : type as RefereeDecision, this.clock, text, player);
    this.events.push({ ...event, type });
    if (type === 'GOAL' && player) this.score[player.team]++;
  }

  private resetPositions() {
    for (const p of this.players) { p.hasBall = false; p.stamina = 100; p.position = { x: p.team ? 1.5 : -1.5, y: (p.role === 'GK' ? 0 : (Math.random() - 0.5) * 5) }; p.velocity = { x: 0, y: 0 }; }
    const kickoff = this.players.find(p => p.team === this.lastKickTeam && p.role === 'ATT' && !p.sentOff) ?? this.players.find(p => p.team === this.lastKickTeam && !p.sentOff);
    if (kickoff) { kickoff.position = { x: this.lastKickTeam ? 0.15 : -0.15, y: 0 }; kickoff.hasBall = true; this.ball.owner = kickoff; this.ball.position = { ...kickoff.position }; }
    this.lastKickTeam = this.lastKickTeam === 0 ? 1 : 0;
  }
}

export const NodeSoccer = { FootballMatch, Player, Ball, Referee };

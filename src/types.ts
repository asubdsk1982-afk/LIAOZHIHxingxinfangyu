export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  NEXT_ROUND = 'NEXT_ROUND'
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  id: string;
}

export interface Rocket extends Entity {
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface Interceptor extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  expanding: boolean;
  life: number; // 0 to 1
}

export interface City extends Entity {
  active: boolean;
}

export interface Turret extends Entity {
  ammo: number;
  maxAmmo: number;
  active: boolean;
}

export interface GameState {
  score: number;
  level: number;
  status: GameStatus;
  rockets: Rocket[];
  interceptors: Interceptor[];
  explosions: Explosion[];
  cities: City[];
  turrets: Turret[];
}

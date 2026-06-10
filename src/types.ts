export type GameColor = 'red' | 'blue' | 'green' | 'yellow' | 'white';

export interface ColorConfig {
  id: GameColor;
  name: string;
  hex: string;
  glow: string;
  textColor: string;
  bgClass: string;
  borderClass: string;
}

export const COLORS: Record<GameColor, ColorConfig> = {
  red: {
    id: 'red',
    name: 'マゼンタ',
    hex: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.6)',
    textColor: 'text-pink-500',
    bgClass: 'bg-[#ec4899]',
    borderClass: 'border-[#ec4899]',
  },
  blue: {
    id: 'blue',
    name: 'シアン',
    hex: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.6)',
    textColor: 'text-cyan-400',
    bgClass: 'bg-[#22d3ee]',
    borderClass: 'border-[#22d3ee]',
  },
  green: {
    id: 'green',
    name: 'ライム',
    hex: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.6)',
    textColor: 'text-lime-500',
    bgClass: 'bg-[#84cc16]',
    borderClass: 'border-[#84cc16]',
  },
  yellow: {
    id: 'yellow',
    name: 'イエロー',
    hex: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.6)',
    textColor: 'text-amber-400',
    bgClass: 'bg-[#fbbf24]',
    borderClass: 'border-[#fbbf24]',
  },
  white: {
    id: 'white',
    name: 'マルチ',
    hex: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.6)',
    textColor: 'text-gray-100',
    bgClass: 'bg-white',
    borderClass: 'border-white',
  },
};

export interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: GameColor;
  points: number;
  isAlive: boolean;
  shining?: boolean; // temporary flash on wrong color hit
  shineEndTime?: number;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: GameColor;
  rainbowMode?: boolean; // if true, breaches any brick
  rainbowEndTime?: number;
}

export type PowerUpType = 'multiball' | 'extralife' | 'widerpaddle' | 'rainbow' | 'slowball';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  type: PowerUpType;
  color: string;
  isActive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WIN' | 'LEVEL_COMPLETED';

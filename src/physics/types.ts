export interface Vector2 {
  x: number;
  y: number;
}

export interface Body {
  id: string;
  position: Vector2;
  velocity: Vector2;
  mass: number;
  radius: number;
  color: string;
  trail: Vector2[];
}

export interface EnergyData {
  time: number;
  ke: number;
  pe: number;
  total: number;
  error: number;
}

export interface SimulationConfig {
  dt: number;
  substeps: number;
  G: number;
  softening: number;
  trailLength: number;
  collisionMode: 'none' | 'bounce' | 'merge';
}

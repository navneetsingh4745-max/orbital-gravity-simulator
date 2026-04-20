import { Body, SimulationConfig, Vector2, EnergyData } from './types';

export class PhysicsEngine {
  bodies: Body[] = [];
  config: SimulationConfig = {
    dt: 0.016, // Adaptive bounds
    substeps: 6,
    G: 1000, 
    softening: 2, 
    trailLength: 200,
    collisionMode: 'bounce'
  };
  
  time: number = 0;
  energyHistory: EnergyData[] = [];
  isPaused: boolean = false;
  initialEnergy: number | null = null;
  
  history: string[] = [];
  historyIndex: number = -1;

  private accelerations: Vector2[] = [];
  private accumulator: number = 0;

  constructor() {}
  
  loadState(bodies: Body[], config?: Partial<SimulationConfig>) {
    this.bodies = JSON.parse(JSON.stringify(bodies));
    if (config) this.config = { ...this.config, ...config };
    
    this.accelerations = new Array(this.bodies.length).fill(null).map(() => ({ x: 0, y: 0 }));
    this.time = 0;
    this.accumulator = 0;
    this.energyHistory = [];
    this.initialEnergy = null;
    this.computeAccelerations(); 
    
    this.history = [];
    this.historyIndex = -1;
    this.saveHistoryState();
  }

  saveHistoryState() {
    const state = JSON.stringify(this.bodies);
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === state) return;
    this.history.splice(this.historyIndex + 1);
    this.history.push(state);
    if (this.history.length > 40) {
        this.history.shift();
    } else {
        this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
        this.historyIndex--;
        this.bodies = JSON.parse(this.history[this.historyIndex]);
        this.accelerations = new Array(this.bodies.length).fill(null).map(() => ({ x: 0, y: 0 }));
        this.computeAccelerations();
        this.initialEnergy = null; // re-baseline
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.bodies = JSON.parse(this.history[this.historyIndex]);
        this.accelerations = new Array(this.bodies.length).fill(null).map(() => ({ x: 0, y: 0 }));
        this.computeAccelerations();
        this.initialEnergy = null;
    }
  }

  addBody(body: Body) {
    this.saveHistoryState();
    this.bodies.push(body);
    this.accelerations.push({ x: 0, y: 0 });
    this.computeAccelerations();
    this.initialEnergy = null;
  }

  removeBody(id: string) {
    this.saveHistoryState();
    const index = this.bodies.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bodies.splice(index, 1);
      this.accelerations.splice(index, 1);
      this.initialEnergy = null;
      this.computeAccelerations();
    }
  }

  updateBody(id: string, updates: Partial<Body>) {
    const body = this.bodies.find(b => b.id === id);
    if (body) {
      Object.assign(body, updates);
      this.computeAccelerations();
    }
  }

  private computeAccelerations() {
    for (let i = 0; i < this.bodies.length; i++) {
        this.accelerations[i] = { x: 0, y: 0 };
    }
    
    // N^2 with soft spatial optimization (mobile bounds usually small)
    for (let i = 0; i < this.bodies.length; i++) {
      const b1 = this.bodies[i];
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b2 = this.bodies[j];
        
        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        
        // Fast cutoff for very distant bodies to save math ops
        if (Math.abs(dx) > 10000 || Math.abs(dy) > 10000) continue;

        const distSq = dx * dx + dy * dy + this.config.softening * this.config.softening;
        const dist = Math.sqrt(distSq);
        const forceMag = this.config.G / (distSq * dist);
        
        const forceX = forceMag * dx;
        const forceY = forceMag * dy;
        
        this.accelerations[i].x += forceX * b2.mass;
        this.accelerations[i].y += forceY * b2.mass;
        
        this.accelerations[j].x -= forceX * b1.mass;
        this.accelerations[j].y -= forceY * b1.mass;
      }
    }
  }

  private resolveCollisions() {
     if (this.config.collisionMode === 'none') return;
     
     const bodies = this.bodies;
     for (let i = 0; i < bodies.length; i++) {
       for (let j = i + 1; j < bodies.length; j++) {
         const b1 = bodies[i];
         const b2 = bodies[j];
         const dx = b2.position.x - b1.position.x;
         const dy = b2.position.y - b1.position.y;
         const distSq = dx*dx + dy*dy;
         const rSum = b1.radius + b2.radius;
         
         if (distSq < rSum * rSum) {
           const dist = Math.sqrt(distSq) || 0.001; // Avoid divide by 0
           
           if (this.config.collisionMode === 'merge') {
               // Conservation of momentum & mass
               const totalMass = b1.mass + b2.mass;
               b1.velocity.x = (b1.velocity.x * b1.mass + b2.velocity.x * b2.mass) / totalMass;
               b1.velocity.y = (b1.velocity.y * b1.mass + b2.velocity.y * b2.mass) / totalMass;
               // Center of mass mapping
               b1.position.x = (b1.position.x * b1.mass + b2.position.x * b2.mass) / totalMass;
               b1.position.y = (b1.position.y * b1.mass + b2.position.y * b2.mass) / totalMass;
               
               b1.mass = totalMass;
               // Volumetric area mapping
               b1.radius = Math.sqrt(b1.radius*b1.radius + b2.radius*b2.radius); 
               
               bodies.splice(j, 1);
               this.accelerations.splice(j, 1);
               j--; 
               this.initialEnergy = null; 
           } 
           else if (this.config.collisionMode === 'bounce') {
               // 1D Elastic Collision
               const nx = dx / dist; 
               const ny = dy / dist;
               const vx = b1.velocity.x - b2.velocity.x;
               const vy = b1.velocity.y - b2.velocity.y;
               const velAlongNormal = vx * nx + vy * ny;
               
               if (velAlongNormal > 0) continue; // Separating
               
               const restitution = 0.8; // Dampening
               const jForce = -(1 + restitution) * velAlongNormal;
               const impulse = jForce / (1 / b1.mass + 1 / b2.mass);
               
               b1.velocity.x += (impulse / b1.mass) * nx;
               b1.velocity.y += (impulse / b1.mass) * ny;
               b2.velocity.x -= (impulse / b2.mass) * nx;
               b2.velocity.y -= (impulse / b2.mass) * ny;
               
               // Anti-overlap positioning correction
               const penetration = Math.max(rSum - dist - 0.1, 0);
               const correctionAmount = (penetration / (1 / b1.mass + 1 / b2.mass)) * 0.8;
               
               b1.position.x += (correctionAmount / b1.mass) * nx;
               b1.position.y += (correctionAmount / b1.mass) * ny;
               b2.position.x -= (correctionAmount / b2.mass) * nx;
               b2.position.y -= (correctionAmount / b2.mass) * ny;
           }
         }
       }
     }
  }

  step(frameDt: number) {
    if (this.isPaused || this.bodies.length === 0) return;

    // Frame-rate independent accumulator
    this.accumulator += frameDt;
    const maxAccumulator = 0.1; // Limit spiraling 
    if (this.accumulator > maxAccumulator) this.accumulator = maxAccumulator;

    const stepTime = this.config.dt;
    const subDt = stepTime / this.config.substeps;

    while (this.accumulator >= stepTime) {
      for (let s = 0; s < this.config.substeps; s++) {
        // Kick 1
        for (let i = 0; i < this.bodies.length; i++) {
          this.bodies[i].velocity.x += this.accelerations[i].x * subDt * 0.5;
          this.bodies[i].velocity.y += this.accelerations[i].y * subDt * 0.5;
        }
        // Drift
        for (let i = 0; i < this.bodies.length; i++) {
          this.bodies[i].position.x += this.bodies[i].velocity.x * subDt;
          this.bodies[i].position.y += this.bodies[i].velocity.y * subDt;
        }
        
        this.resolveCollisions();
        this.computeAccelerations();
        
        // Kick 2
        for (let i = 0; i < this.bodies.length; i++) {
          this.bodies[i].velocity.x += this.accelerations[i].x * subDt * 0.5;
          this.bodies[i].velocity.y += this.accelerations[i].y * subDt * 0.5;
        }
        this.time += subDt;
      }
      this.accumulator -= stepTime;
    }

    this.updateTrails();
    this.calculateEnergy();
  }

  private updateTrails() {
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const last = b.trail[b.trail.length - 1];
      if (!last || Math.abs(last.x - b.position.x) > 2 || Math.abs(last.y - b.position.y) > 2) {
        b.trail.push({ x: b.position.x, y: b.position.y });
        if (b.trail.length > this.config.trailLength) {
          b.trail.shift();
        }
      }
    }
  }

  private calculateEnergy() {
    let ke = 0;
    let pe = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      const b1 = this.bodies[i];
      ke += 0.5 * b1.mass * (b1.velocity.x * b1.velocity.x + b1.velocity.y * b1.velocity.y);
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b2 = this.bodies[j];
        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy + this.config.softening * this.config.softening);
        pe -= (this.config.G * b1.mass * b2.mass) / dist;
      }
    }
    
    const total = ke + pe;
    if (this.initialEnergy === null) {
        this.initialEnergy = total;
    }
    
    let error = 0;
    if (this.initialEnergy !== 0) {
        error = Math.abs((total - this.initialEnergy) / this.initialEnergy) * 100;
    }

    this.energyHistory.push({ time: this.time, ke, pe, total, error });
    if (this.energyHistory.length > 50) this.energyHistory.shift();
  }
}

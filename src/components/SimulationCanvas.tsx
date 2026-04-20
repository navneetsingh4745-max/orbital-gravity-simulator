import React, { useEffect, useRef, useState } from 'react';
import { PhysicsEngine } from '../physics/engine';
import { Body, EnergyData } from '../physics/types';

interface SimulationViewProps {
  engine: PhysicsEngine;
  onBodySelect: (body: Body | null) => void;
  onEnergyUpdate: (energy: EnergyData[]) => void;
  selectedBodyId: string | null;
  cameraScale: number;
  onCameraScaleChange: (scale: number) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  engine,
  onBodySelect,
  onEnergyUpdate,
  selectedBodyId,
  cameraScale,
  onCameraScaleChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const draggingBodyId = useRef<string | null>(null);
  const isSettingVelocity = useRef<boolean>(false);
  const cameraOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pointer tracking for multi-touch (pinch to zoom / pan)
  const pointers = useRef<{ [id: number]: { x: number; y: number } }>({});
  const initialPinchDist = useRef<number | null>(null);
  const initialCamScale = useRef<number>(1);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);

  // Draw loop
  const lastTimeRef = useRef(performance.now());
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationFrameId: number;
    let lastGraphUpdate = 0;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      // Calculate actual delta time in seconds
      const frameDt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      
      // Step physics using real delta time
      engine.step(frameDt);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const centerX = canvas.width / 2 + cameraOffset.current.x;
      const centerY = canvas.height / 2 + cameraOffset.current.y;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw trails
      ctx.lineWidth = 1;
      for (const body of engine.bodies) {
        if (body.trail.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = body.color; // Using actual body color
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([4, 4]); // immersive UI trail dash
        ctx.moveTo(
          centerX + body.trail[0].x * cameraScale,
          centerY + body.trail[0].y * cameraScale
        );
        for (let i = 1; i < body.trail.length; i++) {
          ctx.lineTo(
            centerX + body.trail[i].x * cameraScale,
            centerY + body.trail[i].y * cameraScale
          );
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      }

      // Draw bodies
      for (const body of engine.bodies) {
        ctx.beginPath();
        const screenX = centerX + body.position.x * cameraScale;
        const screenY = centerY + body.position.y * cameraScale;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = body.color; // Planet glow
        
        ctx.arc(screenX, screenY, Math.max(body.radius * cameraScale, 2), 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
        
        ctx.shadowBlur = 0; // reset
        
        if (body.id === selectedBodyId) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(body.radius * cameraScale + 4, 6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw velocity vector if dragging
      if (isSettingVelocity.current && pointerStartPos.current && draggingBodyId.current) {
        const body = engine.bodies.find(b => b.id === draggingBodyId.current);
        if (body && Object.keys(pointers.current).length > 0) {
           const screenX = centerX + body.position.x * cameraScale;
           const screenY = centerY + body.position.y * cameraScale;
           
           const activePt = Object.values(pointers.current)[0];
           
           ctx.beginPath();
           ctx.moveTo(screenX, screenY);
           ctx.lineTo(activePt.x, activePt.y);
           ctx.strokeStyle = '#4fd1c5'; // teal glow vector
           ctx.setLineDash([2, 2]);
           ctx.lineWidth = 1.5;
           ctx.stroke();
           
           // tip point
           ctx.beginPath();
           ctx.arc(activePt.x, activePt.y, 4, 0, Math.PI * 2);
           ctx.fillStyle = '#ffffff';
           ctx.fill();
           ctx.setLineDash([]);
        }
      }

      // Update React state sparsely
      if (time - lastGraphUpdate > 160) {
        onEnergyUpdate([...engine.energyHistory]);
        lastGraphUpdate = time;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [engine, selectedBodyId, cameraScale, onEnergyUpdate]);

  // Touch & Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    // Capture to detect events outside bounds
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointers.current[e.pointerId] = { x, y };
    const pKeys = Object.keys(pointers.current);

    if (pKeys.length === 1) {
       // Single touch - check selection
       const centerX = canvasRef.current.width / 2 + cameraOffset.current.x;
       const centerY = canvasRef.current.height / 2 + cameraOffset.current.y;
       const worldX = (x - centerX) / cameraScale;
       const worldY = (y - centerY) / cameraScale;

       let foundBody = null;
       for (const body of engine.bodies) {
         const dx = body.position.x - worldX;
         const dy = body.position.y - worldY;
         const hitRadius = Math.max(body.radius, 15 / cameraScale);
         if (dx * dx + dy * dy < hitRadius * hitRadius) {
           foundBody = body;
           break;
         }
       }

       if (foundBody) {
          onBodySelect(foundBody);
          draggingBodyId.current = foundBody.id;
          pointerStartPos.current = { x, y };
       } else {
          onBodySelect(null);
          draggingBodyId.current = null;
          pointerStartPos.current = { x, y };
       }
    } else if (pKeys.length === 2) {
       // Two fingers down for pinch/pan. Cancel body drag.
       draggingBodyId.current = null;
       isSettingVelocity.current = false;
       initialPinchDist.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!pointers.current[e.pointerId]) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate delta for the specific pointer
    const dx = x - pointers.current[e.pointerId].x;
    const dy = y - pointers.current[e.pointerId].y;
    
    pointers.current[e.pointerId] = { x, y };
    const pKeys = Object.keys(pointers.current);

    if (pKeys.length === 1) {
        if (draggingBodyId.current) {
            // Dragging a body sets velocity visually
            isSettingVelocity.current = true;
        } else {
            // Pan camera with 1 finger
            cameraOffset.current.x += dx;
            cameraOffset.current.y += dy;
        }
    } else if (pKeys.length === 2) {
        // Pinch & Two-Finger Pan
        const pts = Object.values(pointers.current);
        const diffX = pts[0].x - pts[1].x;
        const diffY = pts[0].y - pts[1].y;
        const dist = Math.sqrt(diffX*diffX + diffY*diffY);
        
        // Handle Zoom
        if (initialPinchDist.current === null) {
            initialPinchDist.current = dist;
            initialCamScale.current = cameraScale;
        } else {
            const scaleFactor = dist / initialPinchDist.current;
            let newScale = initialCamScale.current * scaleFactor;
            newScale = Math.max(0.05, Math.min(newScale, 5)); // bounds
            onCameraScaleChange(newScale);
        }
        
        // Handle Two Finger Pan (Average translation)
        // For simplicity, we just add the delta of the moving pointer / 2
        cameraOffset.current.x += dx / 2;
        cameraOffset.current.y += dy / 2;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (draggingBodyId.current && isSettingVelocity.current && canvasRef.current) {
        // Apply new velocity and push history state
        const lastPt = pointers.current[e.pointerId];
        if (lastPt) {
           const centerX = canvasRef.current.width / 2 + cameraOffset.current.x;
           const centerY = canvasRef.current.height / 2 + cameraOffset.current.y;

           const body = engine.bodies.find(b => b.id === draggingBodyId.current);
           if (body) {
              const screenX = centerX + body.position.x * cameraScale;
              const screenY = centerY + body.position.y * cameraScale;
              
              const vx = (lastPt.x - screenX) / cameraScale * 0.1; 
              const vy = (lastPt.y - screenY) / cameraScale * 0.1;
              
              // save history before changing
              engine.saveHistoryState();
              engine.updateBody(body.id, { velocity: { x: vx, y: vy }, trail: [] });
           }
        }
    }

    delete pointers.current[e.pointerId];
    
    if (Object.keys(pointers.current).length === 0) {
        pointerStartPos.current = null;
        draggingBodyId.current = null;
        isSettingVelocity.current = false;
        initialPinchDist.current = null;
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent overflow-hidden touch-none relative z-10">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};

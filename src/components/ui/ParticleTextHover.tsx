"use client";

import React, { useRef, useEffect } from 'react';

interface ParticleTextHoverProps {
  children: React.ReactNode;
  colorHex?: string;
  className?: string;
  text?: string;
  font?: string;
  textAlign?: "center" | "left" | "right";
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

export function ParticleTextHover({ 
  children, 
  colorHex = "#ffffff", 
  className = ""
}: ParticleTextHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const animationRef = useRef<number | undefined>(undefined);
  
  // Store target and current values for smooth interpolation (spring physics)
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  const rgb = hexToRgb(colorHex);

  useEffect(() => {
    // Highly optimized render loop bypassing React state for 60FPS performance
    const render = () => {
      if (!containerRef.current || !textRef.current) return;

      // Smoothly interpolate towards the target position
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.2;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.2;

      if (isHovering.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const dx = (currentPos.current.x - centerX) * 0.8;
        const dy = (currentPos.current.y - centerY) * 0.8;

        let shadows = [];
        // Reduced steps from 50 to 15 for massive performance gain, 
        // relying on larger blur to fill the gaps smoothly.
        const steps = 15; 
        for (let i = 1; i <= steps; i++) {
          const factor = i / steps;
          const easeFactor = Math.pow(factor, 1.2); 
          
          const x = dx * easeFactor;
          const y = dy * easeFactor;
          
          const blur = i * 2.5; // Larger blur
          
          // Reduced opacity by ~60% (from 0.4 max to 0.15 max)
          const opacity = Math.max(0, (1 - factor) * 0.15);
          
          shadows.push(`${x}px ${y}px ${blur}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
        }

        textRef.current.style.textShadow = shadows.join(', ');
      } else {
        textRef.current.style.textShadow = "none";
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [rgb.r, rgb.g, rgb.b]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    targetPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerEnter = () => {
    isHovering.current = true;
  };

  const handlePointerLeave = () => {
    isHovering.current = false;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative block w-full ${className}`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={{ touchAction: 'pan-y' }}
    >
      <div 
        ref={textRef}
        style={{ 
          transition: isHovering.current ? "none" : "text-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        className="relative z-10 w-full"
      >
        {children}
      </div>
    </div>
  );
}

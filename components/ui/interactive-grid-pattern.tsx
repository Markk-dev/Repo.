'use client';

import React, { useState } from 'react';

interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  squares?: [number, number];
  className?: string;
  squaresClassName?: string;
}

export function InteractiveGridPattern({
  width = 44,
  height = 44,
  squares = [32, 32],
  className = '',
  squaresClassName = '',
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares;
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width * horizontal} ${height * vertical}`}
      className={`interactive-grid-svg ${className}`}
      {...props}
    >
      <defs>
        <pattern
          id="magic-grid-pattern"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={-1}
          y={-1}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#magic-grid-pattern)"
        pointerEvents="none"
      />
      <g className="grid-interactive-cells">
        {Array.from({ length: horizontal * vertical }).map((_, index) => {
          const x = (index % horizontal) * width;
          const y = Math.floor(index / horizontal) * height;
          const isHovered = hoveredSquare === index;
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={width}
              height={height}
              className={`grid-cell ${isHovered ? 'grid-cell-active' : ''} ${squaresClassName}`}
              onMouseEnter={() => setHoveredSquare(index)}
              onMouseLeave={() => setHoveredSquare(null)}
            />
          );
        })}
      </g>
    </svg>
  );
}

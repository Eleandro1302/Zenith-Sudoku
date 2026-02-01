import React from 'react';

interface AbacusDisplayProps {
  value: number;
  className?: string;
}

interface BeadProps {
  x: number;
  y: number;
  active: boolean;
}

// Componente Conta (Bead) isolado para performance
const Bead: React.FC<BeadProps> = ({ x, y, active }) => {
  const beadActiveColor = "fill-indigo-600 dark:fill-indigo-400 stroke-indigo-700 dark:stroke-indigo-300 stroke-1";
  const beadInactiveColor = "fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600 stroke-1 opacity-60";

  return (
    <path 
      d={`M ${x - 12} ${y} L ${x} ${y - 5} L ${x + 12} ${y} L ${x} ${y + 5} Z`} 
      className={active ? beadActiveColor : beadInactiveColor}
    />
  );
};

const AbacusDisplay: React.FC<AbacusDisplayProps> = ({ value, className = "" }) => {
  const hasFive = value >= 5;
  const ones = value % 5;

  // Geometria Soroban
  // ViewBox 0 0 40 100
  
  const rodColor = "stroke-slate-300 dark:stroke-slate-600";
  const beamColor = "stroke-slate-800 dark:stroke-slate-200";

  return (
    <svg viewBox="0 0 40 100" className={`${className} select-none w-full h-full`}>
       {/* Haste Central */}
       <line x1="20" y1="5" x2="20" y2="95" strokeWidth="2" className={rodColor} strokeLinecap="round" />
       
       {/* Viga Divisória */}
       <line x1="2" y1="30" x2="38" y2="30" strokeWidth="3" className={beamColor} strokeLinecap="round" />
       
       {/* Conta do Céu (Vale 5) */}
       {/* Ativa (Baixada, tocando a viga): y=23. Inativa (Levantada): y=10 */}
       <Bead x={20} y={hasFive ? 23 : 10} active={hasFive} />
       
       {/* Contas da Terra (Valem 1 cada) */}
       {[0, 1, 2, 3].map(i => {
          const isActive = i < ones;
          // Contas ativas sobem em direção à viga (y=30)
          // Posições base (empilhadas embaixo): 38, 49, 60, 71
          let y = 38 + i * 11;
          if (!isActive) {
             y += 20; // Espaço quando inativo (descidas)
          }
          return <Bead key={i} x={20} y={y} active={isActive} />
       })}
    </svg>
  );
};

export default React.memo(AbacusDisplay);
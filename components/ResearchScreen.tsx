
import React, { useRef, useLayoutEffect, useState, useMemo } from 'react';
import { GameState, Technology } from '../types';
import { CloseIcon, ResearchIcon, FoodIcon, MiningIcon, BuildingIcon, ForgingIcon, FishingIcon, SailingIcon, MountaineeringIcon, FireMasteryIcon, SimpleStorageIcon } from './Icons';
import { TECH_TREE } from '../techtree';

interface ResearchScreenProps {
  gameState: GameState;
  onClose: () => void;
  onSetResearch: (techId: string) => void;
}

const TechIcon: React.FC<{ techId: string; className?: string }> = ({ techId, className }) => {
    switch(techId) {
        case 'fire_mastery': return <FireMasteryIcon className={className} />;
        case 'simple_storage': return <SimpleStorageIcon className={className} />;
        case 'agriculture': return <FoodIcon className={className} />;
        case 'mining': return <MiningIcon className={className} />;
        case 'construction': return <BuildingIcon className={className} />;
        case 'forging': return <ForgingIcon className={className} />;
        case 'fishing': return <FishingIcon className={className} />;
        case 'sailing': return <SailingIcon className={className} />;
        case 'mountaineering': return <MountaineeringIcon className={className} />;
        default: return <ResearchIcon className={className} />;
    }
}

interface TechNodeProps {
    tech: Technology;
    isUnlocked: boolean;
    canSelect: boolean;
    isCurrentResearch: boolean;
    researchProgress: number;
    onSelect: () => void;
}

const TechNode = React.forwardRef<HTMLDivElement, TechNodeProps>(({ tech, isUnlocked, canSelect, isCurrentResearch, researchProgress, onSelect }, ref) => {
    let borderColor = 'border-gray-600';

    if (isUnlocked) {
        borderColor = 'border-green-500';
    } else if (isCurrentResearch) {
        borderColor = 'border-blue-500';
    } else if (canSelect) {
        borderColor = 'border-gray-500 hover:border-blue-400';
    }

    const progressPercentage = isCurrentResearch ? (researchProgress / tech.cost) * 100 : 0;

    return (
        <div 
            ref={ref}
            className={`bg-gray-700/50 rounded-lg p-4 w-64 border-2 ${borderColor} transition-colors duration-300 flex flex-col`}
            data-tech-id={tech.id}
        >
            <div className="flex items-center gap-3 mb-2">
                <TechIcon techId={tech.id} className="w-8 h-8 text-cyan-300" />
                <div>
                    <h4 className="text-lg font-bold">{tech.name}</h4>
                    <p className="text-sm text-cyan-400 flex items-center gap-1">
                        <ResearchIcon className="w-4 h-4" /> {tech.cost}
                    </p>
                </div>
            </div>
            <p className="text-sm text-gray-300 flex-grow">{tech.description}</p>
            
            <div className="mt-3">
                {isUnlocked ? (
                    <div className="w-full py-1.5 rounded text-sm font-semibold text-center bg-green-800 text-green-300">
                        Researched
                    </div>
                ) : isCurrentResearch ? (
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-semibold text-blue-300">In Progress</span>
                            <span className="text-xs text-gray-400">{Math.floor(researchProgress)} / {tech.cost}</span>
                        </div>
                        <div className="w-full h-3 bg-gray-900 rounded overflow-hidden border border-black">
                            <div className="bg-blue-500 h-full rounded transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={onSelect}
                        disabled={!canSelect}
                        className="w-full py-1.5 rounded text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600"
                    >
                        {canSelect ? 'Select Research' : 'Requires Prerequisite'}
                    </button>
                )}
            </div>
        </div>
    );
});


const ResearchScreen: React.FC<ResearchScreenProps> = ({ gameState, onClose, onSetResearch }) => {
  const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [lines, setLines] = useState<{key: string, x1: number, y1: number, x2: number, y2: number, isUnlocked: boolean}[]>([]);

  const techTiers = useMemo(() => {
    const tiers: Technology[][] = [];
    Object.values(TECH_TREE).forEach(tech => {
        if (!tiers[tech.tier -1]) {
            tiers[tech.tier-1] = [];
        }
        tiers[tech.tier-1].push(tech);
    });
    return tiers;
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];
    
    for (const tech of Object.values(TECH_TREE)) {
        if (tech.prerequisites.length > 0) {
            const childNode = nodeRefs.current.get(tech.id);
            if (!childNode) continue;
            
            const childRect = childNode.getBoundingClientRect();
            const childX = childNode.offsetLeft + childRect.width / 2;
            const childY = childNode.offsetTop + childRect.height / 2;
            
            for (const prereqId of tech.prerequisites) {
                const parentNode = nodeRefs.current.get(prereqId);
                if (!parentNode) continue;

                const parentRect = parentNode.getBoundingClientRect();
                const parentX = parentNode.offsetLeft + parentRect.width / 2;
                const parentY = parentNode.offsetTop + parentRect.height / 2;
                
                newLines.push({
                    key: `${prereqId}-${tech.id}`,
                    x1: parentX,
                    y1: parentY,
                    x2: childX,
                    y2: childY,
                    isUnlocked: player?.unlockedTechs.includes(tech.id) ?? false
                });
            }
        }
    }
    setLines(newLines);
  }, [techTiers, player?.unlockedTechs]);
  

  if (!player) return null;

  return (
    <div 
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] border-2 border-gray-600 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-20"
          aria-label="Close research screen"
        >
          <CloseIcon className="w-8 h-8" />
        </button>
        
        <div className="p-6 border-b-2" style={{ borderColor: player.color }}>
            <h2 className="text-3xl font-bold">Technology Tree</h2>
            <div className="flex items-center gap-2 text-cyan-300 mt-2">
                <ResearchIcon className="w-6 h-6" />
                <span className="text-xl font-semibold">{player.researchPoints} Unassigned RP</span>
            </div>
        </div>
        
        <div ref={containerRef} className="relative flex-grow p-8 overflow-auto">
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{minWidth: `${techTiers.length * 350}px`, minHeight: '600px'}}>
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4a5568" />
                    </marker>
                    <marker id="arrowhead-unlocked" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                </defs>
                {lines.map(line => (
                    <line
                        key={line.key}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke={line.isUnlocked ? '#3b82f6' : '#4a5568'}
                        strokeWidth="2"
                        markerEnd={line.isUnlocked ? "url(#arrowhead-unlocked)" : "url(#arrowhead)"}
                    />
                ))}
            </svg>
            <div className="relative z-10 flex items-start justify-around min-h-full" style={{minWidth: `${techTiers.length * 350}px`}}>
                {techTiers.map((tier, index) => (
                    <div key={index} className="flex flex-col items-center justify-center gap-8 pt-16">
                        <h3 className="absolute top-4 text-xl font-bold text-gray-400">Tier {index + 1}</h3>
                        {tier.map(tech => {
                            const isUnlocked = player.unlockedTechs.includes(tech.id);
                            const prereqsMet = tech.prerequisites.every(p => player.unlockedTechs.includes(p));
                            const isCurrentResearch = player.currentResearchId === tech.id;
                            const canSelect = !isUnlocked && prereqsMet && !isCurrentResearch;

                            return (
                                <TechNode
                                    // FIX: The ref callback was returning a value, which is not allowed. Wrapped in braces to ensure it returns undefined.
                                    ref={node => { nodeRefs.current.set(tech.id, node); }}
                                    key={tech.id}
                                    tech={tech}
                                    isUnlocked={isUnlocked}
                                    canSelect={canSelect}
                                    isCurrentResearch={isCurrentResearch}
                                    researchProgress={isCurrentResearch ? player.researchProgress : 0}
                                    onSelect={() => onSetResearch(tech.id)}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchScreen;
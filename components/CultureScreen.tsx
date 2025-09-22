import React from 'react';
import { GameState, CulturalAspect, CultureAxis } from '../types';
import { CloseIcon, CultureIcon } from './Icons';
import { CULTURAL_ASPECTS } from '../culture';
import { useGameStore } from '../store/gameStore';

interface CultureScreenProps {
  onClose: () => void;
}

const CultureAxisBar: React.FC<{
    axis: CultureAxis;
    value: number;
    labels: { negative: string; positive: string; };
    colors: { negative: string; positive: string; };
}> = ({ axis, value, labels, colors }) => {
    const percentage = (value + 100) / 2; // Convert -100 to 100 range to 0 to 100 range

    return (
        <div className="mb-6">
            <div className="flex justify-between items-baseline mb-1 text-lg">
                <span className="font-semibold" style={{ color: colors.negative }}>{labels.negative}</span>
                <span className="font-semibold" style={{ color: colors.positive }}>{labels.positive}</span>
            </div>
            <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-900 relative">
                <div className="absolute inset-0 flex">
                    <div className="w-1/2 h-full" style={{ backgroundColor: colors.negative + '80' }}></div>
                    <div className="w-1/2 h-full" style={{ backgroundColor: colors.positive + '80' }}></div>
                </div>
                <div 
                    className="absolute top-1/2 left-0 h-6 w-1 bg-white rounded -translate-y-1/2 shadow-lg"
                    style={{ left: `calc(${percentage}% - 2px)` }}
                ></div>
            </div>
             <p className="text-center text-sm mt-1 text-gray-300">Tendency: {Math.round(value)}</p>
        </div>
    );
};


const AspectCard: React.FC<{ aspect: CulturalAspect; isUnlocked: boolean; }> = ({ aspect, isUnlocked }) => (
    <div className={`p-4 rounded-lg border-2 ${isUnlocked ? 'bg-purple-900/40 border-purple-500' : 'bg-gray-700/50 border-gray-600'} transition-all`}>
        <h4 className={`font-bold text-lg ${isUnlocked ? 'text-purple-300' : 'text-gray-300'}`}>{aspect.name}</h4>
        <p className="text-sm text-gray-400">{aspect.description}</p>
    </div>
);


const CultureScreen: React.FC<CultureScreenProps> = ({ onClose }) => {
    const gameState = useGameStore(state => state.gameState);
    const player = gameState?.players.find(p => p.id === gameState.currentPlayerId);

    if (!gameState || !player) return null;

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
                aria-label="Close culture screen"
                >
                    <CloseIcon className="w-8 h-8" />
                </button>
                
                <div className="p-6 border-b-2" style={{ borderColor: player.color }}>
                    <h2 className="text-3xl font-bold">Cultural Identity</h2>
                    <p className="text-gray-400">Your civilization's values, shaped by your actions.</p>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    {/* Left: Cultural Axes */}
                    <div>
                        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-300">Societal Values</h3>
                        <CultureAxisBar 
                            axis={CultureAxis.Nomadism}
                            value={player.culture.nomadism}
                            labels={{ negative: 'Settled', positive: 'Nomadic' }}
                            colors={{ negative: '#3b82f6', positive: '#ca8a04' }}
                        />
                         <CultureAxisBar 
                            axis={CultureAxis.GenderRoles}
                            value={player.culture.genderRoles}
                            labels={{ negative: 'Patriarchal', positive: 'Matriarchal' }}
                            colors={{ negative: '#60a5fa', positive: '#f472b6' }}
                        />
                         <CultureAxisBar 
                            axis={CultureAxis.Militarism}
                            value={player.culture.militarism}
                            labels={{ negative: 'Defensive', positive: 'Aggressive' }}
                            colors={{ negative: '#4ade80', positive: '#ef4444' }}
                        />
                    </div>
                    {/* Right: Unlocked Aspects */}
                    <div>
                        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-300">Cultural Aspects</h3>
                        <div className="space-y-3">
                            {Object.values(CULTURAL_ASPECTS).map(aspect => (
                                <AspectCard 
                                    key={aspect.id}
                                    aspect={aspect}
                                    isUnlocked={player.culture.unlockedAspects.includes(aspect.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CultureScreen;

import React from 'react';
import { Technology, TechEffectType, UnitType, BuildingType, CampBuildingType } from '../types';
import { TECH_TREE } from '../techtree';
import { CloseIcon, ResearchIcon, FoodIcon, MiningIcon, BuildingIcon, ForgingIcon, FishingIcon, SailingIcon, MountaineeringIcon, FireMasteryIcon, SimpleStorageIcon, HerbalLoreIcon, InfantryIcon, TankIcon, ShamanIcon, MarketplaceIcon, GranaryIcon, FirePitIcon, StoragePitIcon, DryingRackIcon, HealersTentIcon } from './Icons';

interface TechUnlockedScreenProps {
  techId: string;
  onClose: () => void;
  onChooseNewResearch: () => void;
}

const TechIcon: React.FC<{ techId: string; className?: string }> = ({ techId, className }) => {
    switch(techId) {
        case 'fire_mastery': return <FireMasteryIcon className={className} />;
        case 'simple_storage': return <SimpleStorageIcon className={className} />;
        case 'herbal_lore': return <HerbalLoreIcon className={className} />;
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

const EffectIcon: React.FC<{ effectType: TechEffectType; payload: any; className?: string }> = ({ effectType, payload, className }) => {
    if (effectType === TechEffectType.UnlockUnit) {
        switch(payload as UnitType) {
            case UnitType.Infantry: return <InfantryIcon className={className} />;
            case UnitType.Tank: return <TankIcon className={className} />;
            case UnitType.Shaman: return <ShamanIcon className={className} />;
            default: return <ResearchIcon className={className} />;
        }
    }
    if (effectType === TechEffectType.UnlockBuilding) {
        switch(payload as BuildingType | CampBuildingType) {
            case BuildingType.Marketplace: return <MarketplaceIcon className={className} />;
            case BuildingType.Granary: return <GranaryIcon className={className} />;
            case CampBuildingType.FirePit: return <FirePitIcon className={className} />;
            case CampBuildingType.StoragePit: return <StoragePitIcon className={className} />;
            case CampBuildingType.DryingRack: return <DryingRackIcon className={className} />;
            case CampBuildingType.HealersTent: return <HealersTentIcon className={className} />;
            default: return <BuildingIcon className={className} />;
        }
    }
    if (effectType === TechEffectType.GlobalBonus) {
        if (payload.bonus === 'food_from_water') return <FoodIcon className={className} />;
        if (payload.bonus === 'gold_from_hills') return <MiningIcon className={className} />;
    }
    return <ResearchIcon className={className} />;
};

const getEffectDescription = (effectType: TechEffectType, payload: any): string => {
    switch (effectType) {
        case TechEffectType.UnlockUnit:
            return `New Unit Unlocked: ${payload}`;
        case TechEffectType.UnlockBuilding:
            return `New Building Unlocked: ${payload}`;
        case TechEffectType.GlobalBonus:
            return `Global Bonus: +${payload.value} ${payload.bonus.replace(/_/g, ' ')}`;
        default:
            return "New ability unlocked.";
    }
};

const TechUnlockedScreen: React.FC<TechUnlockedScreenProps> = ({ techId, onClose, onChooseNewResearch }) => {
    const tech = TECH_TREE[techId];
    if (!tech) return null;

    return (
        <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
            aria-modal="true"
            role="dialog"
        >
            <div className="relative bg-gray-900 text-white rounded-lg shadow-2xl w-full max-w-3xl border-2 border-cyan-500/50 flex flex-col overflow-hidden animate-slide-up"
                style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}
            >
                {/* Header */}
                <div className="p-6 text-center bg-gradient-to-b from-gray-800 to-gray-900 border-b-2 border-cyan-500/50">
                    <h2 className="text-2xl font-semibold text-gray-400 tracking-widest">RESEARCH COMPLETE</h2>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <TechIcon techId={tech.id} className="w-12 h-12 text-cyan-300" />
                        <h1 className="text-5xl font-bold text-cyan-300">{tech.name}</h1>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 flex-grow overflow-y-auto max-h-[60vh] whitespace-pre-wrap">
                    <p className="text-lg text-gray-300 italic leading-relaxed text-center mb-8">{tech.narrative}</p>
                    
                    <div className="border-t border-cyan-500/30 pt-6">
                        <h3 className="text-xl font-semibold text-center text-cyan-400 mb-4">Unlocks & Benefits</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tech.effects.map((effect, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg flex items-center gap-4 border border-gray-700">
                                    <EffectIcon effectType={effect.type} payload={effect.payload} className="w-10 h-10 text-cyan-400 flex-shrink-0" />
                                    <p className="font-semibold">{getEffectDescription(effect.type, effect.payload)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-6 bg-gray-800/50 border-t-2 border-cyan-500/50 flex justify-center items-center gap-6">
                    <button 
                        onClick={onClose} 
                        className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-lg font-semibold rounded-lg transition-colors">
                        Continue
                    </button>
                     <button 
                        onClick={onChooseNewResearch} 
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-lg font-bold rounded-lg transition-colors shadow-lg hover:shadow-cyan-500/50">
                        Choose New Research
                    </button>
                </div>
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                .animate-slide-up { animation: slideUp 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default TechUnlockedScreen;

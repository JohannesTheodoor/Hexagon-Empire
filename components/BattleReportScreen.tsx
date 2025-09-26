import React from 'react';
import { BattleReport, BattleParticipantReport, BattleReportUnit, UnitType } from '../types';
import { InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, StoneWarriorIcon, HunterIcon } from './Icons';

interface BattleReportScreenProps {
  report: BattleReport;
  onClose: () => void;
}

const UnitIcon: React.FC<{ unitType: UnitType, className?: string }> = ({ unitType, className }) => {
    switch (unitType) {
        case UnitType.Infantry: return <InfantryIcon className={className} />;
        case UnitType.Tank: return <TankIcon className={className} />;
        case UnitType.Tribesman: return <TribesmanIcon className={className} />;
        case UnitType.Tribeswoman: return <TribeswomanIcon className={className} />;
        case UnitType.Child: return <ChildIcon className={className} />;
        case UnitType.Shaman: return <ShamanIcon className={className} />;
        case UnitType.StoneWarrior: return <StoneWarriorIcon className={className} />;
        case UnitType.Hunter: return <HunterIcon className={className} />;
        default: return null;
    }
};

const ReportUnitList: React.FC<{ units: BattleReportUnit[] }> = ({ units }) => {
    if (units.length === 0) {
        return <p className="text-center text-gray-500 italic py-4">None</p>;
    }
    return (
        <div className="space-y-2">
            {units.map(({ unitType, count }) => (
                <div key={unitType} className="bg-gray-700/50 p-2 rounded-lg flex items-center gap-3">
                    <UnitIcon unitType={unitType} className="w-8 h-8 flex-shrink-0" />
                    <p className="font-semibold">{count} x {unitType}</p>
                </div>
            ))}
        </div>
    );
};

const ParticipantPanel: React.FC<{ report: BattleParticipantReport, title: string }> = ({ report, title }) => {
    const outcomeText = report.isWinner ? "VICTORY" : "DEFEAT";
    const outcomeColor = report.isWinner ? 'text-green-400' : 'text-red-400';
    
    return (
        <div className="bg-gray-900/50 rounded-lg p-4 w-full h-full flex flex-col">
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-400">{title}</h3>
                <h2 className="text-3xl font-bold" style={{ color: report.color }}>{report.name}</h2>
                <p className={`text-4xl font-extrabold mt-2 ${outcomeColor}`} style={{ textShadow: `0 0 10px ${report.isWinner ? '#22c55e80' : '#ef444480'}` }}>
                    {outcomeText}
                </p>
            </div>
            <div className="overflow-y-auto space-y-4 flex-grow p-2">
                <div>
                    <h4 className="text-lg font-semibold text-red-400 mb-2 border-b-2 border-red-500/30 pb-1">Casualties</h4>
                    <ReportUnitList units={report.lostUnits} />
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-green-400 mb-2 border-b-2 border-green-500/30 pb-1">Survivors</h4>
                    <ReportUnitList units={report.remainingUnits} />
                </div>
            </div>
        </div>
    );
};

const BattleReportScreen: React.FC<BattleReportScreenProps> = ({ report, onClose }) => {
    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" style={{ backdropFilter: 'blur(5px)'}} aria-modal="true" role="dialog">
            <div className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border-2 border-gray-600 animate-slide-up">
                 <div className="p-4 text-center border-b-2 border-gray-600">
                    <h2 className="text-4xl font-bold">Battle Report</h2>
                </div>
                <div className="p-6 flex-grow grid grid-cols-2 gap-6 overflow-y-hidden">
                    <ParticipantPanel report={report.attacker} title="Attacking Force" />
                    <ParticipantPanel report={report.defender} title="Defending Force" />
                </div>
                 <div className="p-6 border-t-2 border-gray-600 flex-shrink-0 flex justify-center items-center">
                    <button onClick={onClose} className="px-12 py-3 bg-blue-600 hover:bg-blue-500 text-lg font-bold rounded-lg transition-colors">
                        Continue
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

export default BattleReportScreen;
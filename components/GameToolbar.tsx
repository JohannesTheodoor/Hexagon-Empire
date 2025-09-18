
import React from 'react';
import { EyeIcon, EyeSlashIcon, GearIcon, HomeIcon } from './Icons';

interface GameToolbarProps {
  fogOfWarEnabled: boolean;
  onToggleFogOfWar: () => void;
  onToggleSettings: () => void;
  onGoHome: () => void;
}

const GameToolbar: React.FC<GameToolbarProps> = ({ fogOfWarEnabled, onToggleFogOfWar, onToggleSettings, onGoHome }) => {
  return (
    <div className="absolute top-1/2 left-0 -translate-y-1/2 z-20">
      <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-2 rounded-r-lg shadow-lg border-r-2 border-t-2 border-b-2 border-gray-700 flex flex-col gap-2">
        <button
          onClick={onToggleFogOfWar}
          className="w-12 h-12 flex items-center justify-center rounded-md text-white hover:bg-gray-700 transition-colors"
          title={fogOfWarEnabled ? 'Disable Fog of War' : 'Enable Fog of War'}
          aria-label="Toggle Fog of War"
        >
          {fogOfWarEnabled ? <EyeSlashIcon className="w-7 h-7" /> : <EyeIcon className="w-7 h-7" />}
        </button>
        <button
          onClick={onGoHome}
          className="w-12 h-12 flex items-center justify-center rounded-md text-white hover:bg-gray-700 transition-colors"
          title="Center on Capital"
          aria-label="Center camera on capital"
        >
          <HomeIcon className="w-7 h-7" />
        </button>
        <button
          onClick={onToggleSettings}
          className="w-12 h-12 flex items-center justify-center rounded-md text-white hover:bg-gray-700 transition-colors"
          title="Open Settings"
          aria-label="Open Settings"
        >
          <GearIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default GameToolbar;
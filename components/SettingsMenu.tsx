import React from 'react';
import { SoundOnIcon, SoundOffIcon } from './Icons';

interface SettingsMenuProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onClose: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-96 border-2 border-gray-700 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sound Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="volume-slider" className="font-semibold">Volume</label>
            <span className="text-sm text-gray-300">{Math.round(volume * 100)}%</span>
          </div>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            disabled={isMuted}
          />

          <div className="flex items-center justify-between pt-4">
            <span className="font-semibold">Mute All Sounds</span>
            <button
              onClick={onMuteToggle}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <SoundOffIcon className="w-6 h-6 text-red-500" /> : <SoundOnIcon className="w-6 h-6 text-green-500" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;

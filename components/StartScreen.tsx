import React, { useState } from 'react';

type WorldSize = 'small' | 'medium' | 'large';

interface StartScreenProps {
  onStartGame: (size: WorldSize, numAIPlayers: number, seed?: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [seed, setSeed] = useState('');
  const [aiPlayers, setAiPlayers] = useState(1);

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="text-center bg-gray-800/50 backdrop-blur-sm p-12 rounded-xl shadow-2xl border border-gray-700">
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 tracking-wider" style={{ textShadow: '0 0 15px rgba(72, 187, 255, 0.5)' }}>
          HexGrid Empires
        </h1>
        <p className="text-xl text-gray-300 mb-12">A turn-based hexagonal strategy game.</p>

        {!showSizeSelector ? (
          <button
            onClick={() => setShowSizeSelector(true)}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 animate-pulse"
          >
            Create New World
          </button>
        ) : (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-semibold mb-6 text-gray-200">Select World Size</h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button
                onClick={() => onStartGame('small', aiPlayers, seed)}
                className="px-8 py-4 bg-gray-700 hover:bg-green-600 rounded-lg text-xl font-bold transition-colors duration-300 transform hover:scale-105"
              >
                Small <span className="block text-sm font-normal text-gray-400">(40 x 28)</span>
              </button>
              <button
                onClick={() => onStartGame('medium', aiPlayers, seed)}
                className="px-8 py-4 bg-gray-700 hover:bg-yellow-600 rounded-lg text-xl font-bold transition-colors duration-300 transform hover:scale-105"
              >
                Medium <span className="block text-sm font-normal text-gray-400">(60 x 42)</span>
              </button>
              <button
                onClick={() => onStartGame('large', aiPlayers, seed)}
                className="px-8 py-4 bg-gray-700 hover:bg-red-600 rounded-lg text-xl font-bold transition-colors duration-300 transform hover:scale-105"
              >
                Large <span className="block text-sm font-normal text-gray-400">(80 x 56)</span>
              </button>
            </div>
             <div className="mt-8">
                <label htmlFor="ai-players-slider" className="block text-gray-300 mb-2">Number of AI Opponents: <span className="font-bold text-white">{aiPlayers}</span></label>
                <input
                    id="ai-players-slider"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={aiPlayers}
                    onChange={(e) => setAiPlayers(parseInt(e.target.value, 10))}
                    className="w-72 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
            </div>
             <div className="mt-8">
                <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Enter Map Seed (optional)"
                    className="px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-center w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>
          </div>
        )}
      </div>
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 10px 10px rgba(59, 130, 246, 0);
          }
        }
        .animate-pulse {
            animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default StartScreen;
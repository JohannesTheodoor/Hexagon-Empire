import React from 'react';
import { TerrainType } from '../types';

export const terrainPatternIds: Record<TerrainType, string> = {
    [TerrainType.Plains]: 'plains',
    [TerrainType.Forest]: 'forest',
    [TerrainType.Hills]: 'hills',
    [TerrainType.Mountains]: 'mountains',
    [TerrainType.Desert]: 'desert',
    [TerrainType.Lake]: 'lake',
    [TerrainType.Swamp]: 'swamp',
    [TerrainType.Steppe]: 'steppe',
    [TerrainType.Volcanic]: 'volcanic',
    [TerrainType.Sea]: 'sea',
};

const TerrainPatterns: React.FC = () => (
    <defs>
        {/* Helper pattern for water waves */}
        <g id="waves">
            <path d="M -20 10 Q 0 0 20 10 T 60 10 T 100 10" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.15" strokeLinecap="round" />
            <path d="M -20 25 Q 0 15 20 25 T 60 25 T 100 25" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.15" strokeLinecap="round" />
            <path d="M -20 40 Q 0 30 20 40 T 60 40 T 100 40" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.15" strokeLinecap="round" />
        </g>
        
        <pattern id="plains" patternUnits="userSpaceOnUse" width="80" height="80">
            <rect width="80" height="80" fill="#A7D397" />
            <path d="M0 10 L80 10 M0 30 L80 30 M0 50 L80 50 M0 70 L80 70" stroke="#BDE4A8" strokeWidth="2" opacity="0.4" />
            <circle cx="15" cy="25" r="2" fill="#82B366" opacity="0.5"/>
            <circle cx="65" cy="55" r="2" fill="#82B366" opacity="0.5"/>
            <circle cx="40" cy="75" r="2" fill="#82B366" opacity="0.5"/>
        </pattern>
        
        <pattern id="forest" patternUnits="userSpaceOnUse" width="80" height="80">
            <rect width="80" height="80" fill="#5A945A" />
            <path d="M 20 65 l 10 -20 l 10 20 z M 18 60 l 12 -25 l 12 25 z" fill="#4C7D4C" />
            <path d="M 55 75 l 15 -30 l 15 30 z M 53 70 l 17 -35 l 17 35 z" fill="#3E663E" />
            <path d="M 10 35 l 10 -20 l 10 20 z" fill="#3E663E" />
            <path d="M 60 30 l 10 -20 l 10 20 z" fill="#4C7D4C" />
        </pattern>
        
        <pattern id="hills" patternUnits="userSpaceOnUse" width="100" height="100">
            <rect width="100" height="100" fill="#BCA78D" />
            <path d="M -10 50 Q 25 20 60 50 T 120 50" stroke="#A9957B" strokeWidth="25" fill="none" strokeLinecap="round" />
            <path d="M -10 80 Q 40 50 70 80 T 130 80" stroke="#897660" strokeWidth="20" fill="none" opacity="0.5" strokeLinecap="round"/>
        </pattern>

        <pattern id="mountains" patternUnits="userSpaceOnUse" width="80" height="80">
            <rect width="80" height="80" fill="#9E9E9E" />
            <path d="M 10 80 L 40 20 L 70 80 Z" fill="#888888" />
            <path d="M 30 25 L 40 5 L 50 25 Z" fill="#FFFFFF" opacity="0.8" />
            <path d="M 45 80 L 75 -10 L 105 80 Z" fill="#B0B0B0" opacity="0.7"/>
        </pattern>
        
        <pattern id="desert" patternUnits="userSpaceOnUse" width="120" height="120">
            <rect width="120" height="120" fill="#EEDC82" />
            <path d="M -10 30 Q 30 0 70 30 T 150 30" stroke="#DDCB70" strokeWidth="15" fill="none" strokeLinecap="round"/>
            <path d="M -10 80 Q 50 50 90 80 T 170 80" stroke="#DDCB70" strokeWidth="20" fill="none" strokeLinecap="round"/>
        </pattern>
        
        <pattern id="lake" patternUnits="userSpaceOnUse" width="80" height="50">
            <rect width="80" height="50" fill="#77DDE7" />
            <use href="#waves" />
        </pattern>
        
        <pattern id="sea" patternUnits="userSpaceOnUse" width="80" height="50">
            <rect width="80" height="50" fill="#38B2AC" />
            <use href="#waves" />
        </pattern>

        <pattern id="swamp" patternUnits="userSpaceOnUse" width="100" height="100">
            <rect width="100" height="100" fill="#8A9A5B" />
            <path d="M -10 25 Q 25 10 50 25 T 110 25" stroke="#6B7848" strokeWidth="15" fill="none" strokeLinecap="round"/>
            <path d="M -10 75 Q 40 90 70 75 T 130 75" stroke="#6B7848" strokeWidth="20" fill="none" strokeLinecap="round"/>
            <circle cx="20" cy="60" r="10" fill="#A4B473" opacity="0.5"/>
            <circle cx="80" cy="40" r="12" fill="#A4B473" opacity="0.5"/>
        </pattern>
        
        <pattern id="steppe" patternUnits="userSpaceOnUse" width="80" height="80">
            <rect width="80" height="80" fill="#D8C788" />
            <path d="M 10 70 l 2 -15 M 20 60 l 2 -15 M 40 75 l 2 -15 M 60 65 l 2 -15" stroke="#BDAF70" strokeWidth="2" strokeLinecap="round" />
            <circle cx="30" cy="30" r="15" fill="#EBE0B0" opacity="0.5" />
            <circle cx="70" cy="50" r="10" fill="#EBE0B0" opacity="0.5" />
        </pattern>

        <pattern id="volcanic" patternUnits="userSpaceOnUse" width="100" height="100">
            <rect width="100" height="100" fill="#4A4A4A" />
            <path d="M 10 0 L 0 10 M 50 0 L 0 50 M 90 0 L 0 90 M 100 20 L 20 100 M 100 60 L 60 100 M 100 100" stroke="#FF4500" strokeWidth="5" opacity="0.5" strokeLinecap="round"/>
            <path d="M -5 105 L 105 -5 M 40 105 L 105 40" stroke="#2A2A2A" strokeWidth="10" opacity="0.6"/>
        </pattern>
    </defs>
);

export default TerrainPatterns;
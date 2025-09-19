import React from 'react';

export const InfantryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 15c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1-8H9v7h2v-3.88c1.49-.49 2.5-1.99 2.5-3.62 0-2.21-1.79-4-4-4S7 5.79 7 8c0 1.5.83 2.82 2 3.5V15h2v-2h-1z" />
  </svg>
);

export const TankIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.9 5.54l-3.32-.9-.8-2.3c-.2-.6-.78-1-1.4-1H8.6c-.62 0-1.2.4-1.4 1l-.8 2.3-3.32.9C2.43 5.7 2 6.35 2 7v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-.65-.43-1.3-1.1-1.46zM8 17H5v-2h3v2zm0-3H5v-2h3v2zm0-3H5V9h3v2zm11 3h-3v-2h3v2zm0-3h-3v-2h3v2zm0-3h-3V9h3v2z" />
  </svg>
);

export const TribesmanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

export const TribeswomanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

export const ChildIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-1 5h2v6h-2z"/>
    </svg>
);

export const ShamanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm-1 12.37V22h2v-7.63c1.78-.65 3-2.33 3-4.37h-2c0 1.65-1.35 3-3 3s-3-1.35-3-3H6c0 2.04 1.22 3.72 3 4.37z" />
    </svg>
);

export const CityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.24L17.76 10H6.24L12 5.24zM7 18v-6h2v6H7zm4 0v-6h2v6h-2zm4 0v-6h2v6h-2z" />
  </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
);

export const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C21.27 7.61 17 4.5 12 4.5c-1.6 0-3.14.35-4.5.96l1.57 1.57C9.74 7.13 10.85 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zM12 17c-1.01 0-1.94-.31-2.73-.85l1.42-1.42C11.1 14.9 11.54 15 12 15c1.66 0 3-1.34 3-3 0-.46-.1-.9-.28-1.29l1.42-1.42C16.69 10.06 17 10.99 17 12c0 2.76-2.24 5-5 5z"/>
    </svg>
);

export const InfluenceIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
    </svg>
);

export const GearIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
);

export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
  </svg>
);

export const SoundOnIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
);

export const SoundOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
);

export const FoodIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.5,1.91C15.42,1.35,13.2,2.36,12.2,4.2l-2.43,4.33c-1.88,3.35,0.06,7.57,4.24,7.57 c2.25,0,4.25-1.33,5.19-3.24l2.43-4.33C22.64,6.29,21.63,4,19.75,3C18.9,2.71,18.19,2.4,17.5,1.91z M17.5,7 c-1.11,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S18.61,7,17.5,7z"/>
    </svg>
);

export const WoodIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} stroke="black" strokeWidth="0.5">
        <path d="M18,8.57V4.08C18,3.53,17.53,3.08,17,3.1C14.73,3.4,12.6,4.53,11.2,6.23L9.5,8.28V4.08C9.5,3.53,9.03,3.08,8.5,3.1 C6.23,3.4,4.1,4.53,2.7,6.23L1,8.28v11.64c0,0.55,0.45,1,1,1h3.43c0.55,0,1-0.45,1-1v-4.17l1.77,-1.95 C9.14,12.86,10.51,12.23,12,12.08V16c0,0.55,0.45,1,1,1h3.43c0.55,0,1-0.45,1-1v-4.17l3.27,-3.6 C21.45,10.36,21.18,9.11,20.2,8.43L18,8.57z" />
    </svg>
);

export const StoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} stroke="black" strokeWidth="0.5">
        <path d="M19.4,4.9C18.5,4,17.3,3.5,16,3.5c-1.2,0-2.3,0.4-3.2,1.2L5.2,12.4c-1,1-1.5,2.3-1.5,3.7c0,1.3,0.5,2.6,1.4,3.5 C6,20.5,7.2,21,8.5,21c1.2,0,2.3-0.4,3.2-1.2l7.7-7.7c1-1,1.5-2.3,1.5-3.7C20.9,7.1,20.4,5.9,19.4,4.9z"/>
    </svg>
);

export const HidesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} stroke="black" strokeWidth="0.5">
        <path d="M22.6,9.4l-3.2-3.2c-0.8-0.8-2-1.2-3.2-1.2s-2.4,0.4-3.2,1.2L2.3,16.9c-0.8,0.8-1.2,1.8-1.2,2.8c0,1.1,0.4,2.1,1.2,2.8 C3,23.4,4,23.8,5,23.8s2-0.4,2.8-1.2l10.7-10.7l3.2,3.2c0.8,0.8,1.8,1.2,2.8,1.2c1.1,0,2.1-0.4,2.8-1.2C24.1,13.6,24.1,11,22.6,9.4z" />
    </svg>
);

export const ObsidianIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} stroke="white" strokeWidth="0.5">
        <path d="M12 2L2 12l10 10 10-10L12 2zm0 16.5L5.5 12 12 5.5 18.5 12 12 18.5z"/>
    </svg>
);


export const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 9.3V4h-3v2.6L12 3 2 12h3v8h14v-8h3l-3-2.7zM17 18H7v-6h10v6zm-4-4.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z" />
    </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
    </svg>
);

export const MarketplaceIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2L2 7v2h20V7L12 2zm-1 9H4v9h7v-9zm9 0h-7v9h7v-9z" />
    </svg>
);

export const GranaryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20 6h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2h-2v2h2V4zM4 19V8h16v11H4z" />
    </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
);

export const ResearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18 10.4V4h-3v6.4c-1.21.83-2 2.34-2 4.1v.5H7v2h6v-2h-1.5c0-1.76-.79-3.27-2-4.1zM6 2v6H4V2h2zm4 0v6H8V2h2z"/>
    </svg>
);

export const MiningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.3 3.1c-.8-.2-1.6.4-1.8 1.2L9.2 9.8 4.6 9c-.8-.2-1.6.4-1.8 1.2s.4 1.6 1.2 1.8l5.6 1.1.7 3.5c.2.8 1 .4 1.2-.4l1.3-4.5 4.5-1.3c.8-.2.4-1-.4-1.2l-3.5-.7 1.1-5.6c.2-.8-.4-1.6-1.2-1.8zM21 14h-5c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2z" />
    </svg>
);

export const ForgingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.8 3.3c-.5-.5-1.3-.5-1.8 0L3.3 12c-.5.5-.5 1.3 0 1.8l8.8 8.8c.5.5 1.3.5 1.8 0l8.8-8.8c.5-.5.5-1.3 0-1.8L13.8 3.3zM12 18.5l-6-6 1.2-1.2 4.8 4.8 4.8-4.8L18 12.5l-6 6zM5 11h14v2H5v-2z" />
    </svg>
);

export const CampIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M2 21L12 3l10 18h-4l-6-10-6 10H2z"/>
    </svg>
);

export const FishingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20.41 4.93c-3.9-3.9-10.24-3.9-14.14 0l.71.71c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.68 3.51C10.8 0.39 15.87.39 19 3.51l-1.48 1.48c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l2.2-2.2c.39-.39.39-1.02 0-1.41L20.41 4.93zM4.95 18.12c-1.95-1.95-1.95-5.12 0-7.07l2.2-2.2c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-2.2 2.2c-1.95 1.95-1.95 5.12 0 7.07l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zM8.58 15.37c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l2.2 2.2c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-2.2-2.2zm3.4-3.4c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l2.2 2.2c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-2.2-2.2zm3.4-3.4c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l2.2 2.2c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-2.2-2.2z"/>
    </svg>
);

export const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
    </svg>
);

export const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/>
    </svg>
);

export const CultureIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.94 13.5c-.8.8-1.86.8-2.66 0-.8-.8-.8-2.05 0-2.85s1.86-.8 2.66 0c.8.8.8 2.05 0 2.85zm1.56-6.4c-1.15.7-2.6.7-3.75 0l-1.38-2.4C6.3 5.4 7.6 4.6 9.12 4.6c1.5 0 2.8.8 3.5 2.1l1.4 2.4zM16.6 15.36c.8-.8.8-2.05 0-2.85s-1.86-.8-2.66 0c-.8.8-.8 2.05 0 2.85s1.86.8 2.66 0zm-1.57-6.4c1.15.7 1.15 1.8 0 2.4l-1.4 2.4c-.7 1.3-2 2.1-3.5 2.1-1.5 0-2.8-.8-3.5-2.1L6.3 11.36c-1.15-.7-1.15-1.8 0-2.4l1.38-2.4C8.4 5.4 9.7 4.6 11.2 4.6c1.5 0 2.8.8 3.5 2.1l1.4 2.4z"/>
    </svg>
);

export const PalisadeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M4 20h2v-4h2v4h2v-4h2v4h2v-4h2v4h2V4H4v16zM6 6h12v2H6V6zm0 4h12v2H6v-2z"/>
    </svg>
);

export const ScoutTentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 3L2 21h4l6-10 6 10h4L12 3zm0 5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
);

export const ForagingPostIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20 11.5c0-4.42-3.58-8-8-8S4 7.08 4 11.5c0 3.14 1.82 5.86 4.5 7.19V22h7v-3.31c2.68-1.33 4.5-4.05 4.5-7.19zM8 12.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S10.33 14 9.5 14 8 13.33 8 12.5zm6.5 1.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/>
    </svg>
);

export const StoragePitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2z"/>
    </svg>
);

export const FirePitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.76-.36 3.6 0 3.6 2.11 0 1.79-1.44 3.15-3.19 3.15z" />
    </svg>
);

export const FireMasteryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.76-.36 3.6 0 3.6 2.11 0 1.79-1.44 3.15-3.19 3.15z" />
    </svg>
);

export const SimpleStorageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20 6h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4zm11 15H4V8h16v11z"/>
    </svg>
);

export const DryingRackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M9 3l-1.5 18h2.09L11 3H9zm6 0l-1.5 18h2.09L17 3h-2zM8 7h8v2H8V7zm0 4h8v2H8v-2z"/>
    </svg>
);

export const SailingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M14 6l-1 5H9.78C10.33 10.37 11.1 10 12 10c1.1 0 2 .9 2 2zm8-4H2C.9 2 0 2.9 0 4v12c0 1.1.9 2 2 2h15l-1.1-3.11c-.93-2.61.55-5.46 3.1-6.4L22 7V4c0-1.1-.9-2-2-2z"/>
    </svg>
);

export const MountaineeringIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2-4.25-5.7L4 18h16l-3.35-4.5-2.65-3.5L14 6zm-3.5 4.5l1.5-2 1.5 2-1.5 2-1.5-2z"/>
    </svg>
);
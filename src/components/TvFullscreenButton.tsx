import React, { useState, useEffect } from 'react';
import { Maximize, Minimize, Tv } from 'lucide-react';
import {
  isFullscreenActive,
  toggleFullscreenAndOrientation,
} from '../utils/fullscreen';

interface TvFullscreenButtonProps {
  className?: string;
  variant?: 'button' | 'compact' | 'floating';
  showLabel?: boolean;
}

export const TvFullscreenButton: React.FC<TvFullscreenButtonProps> = ({
  className = '',
  variant = 'button',
  showLabel = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const handleStatusUpdate = () => {
      setIsFullscreen(isFullscreenActive());
      if (typeof window !== 'undefined') {
        const landscape =
          window.matchMedia('(orientation: landscape)').matches ||
          window.innerWidth > window.innerHeight;
        setIsLandscape(landscape);
      }
    };

    handleStatusUpdate();

    document.addEventListener('fullscreenchange', handleStatusUpdate);
    document.addEventListener('webkitfullscreenchange', handleStatusUpdate);
    document.addEventListener('mozfullscreenchange', handleStatusUpdate);
    document.addEventListener('MSFullscreenChange', handleStatusUpdate);
    window.addEventListener('resize', handleStatusUpdate);
    window.addEventListener('orientationchange', handleStatusUpdate);

    return () => {
      document.removeEventListener('fullscreenchange', handleStatusUpdate);
      document.removeEventListener('webkitfullscreenchange', handleStatusUpdate);
      document.removeEventListener('mozfullscreenchange', handleStatusUpdate);
      document.removeEventListener('MSFullscreenChange', handleStatusUpdate);
      window.removeEventListener('resize', handleStatusUpdate);
      window.removeEventListener('orientationchange', handleStatusUpdate);
    };
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFullscreenAndOrientation();
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen & Lock Landscape for TV Mirroring'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
          isFullscreen
            ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm'
            : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/15 border border-white/15'
        } ${className}`}
      >
        <Tv className="w-3.5 h-3.5 text-purple-400" />
        {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
        {showLabel && (
          <span className="hidden sm:inline">
            {isFullscreen ? 'Exit TV' : 'TV Fullscreen'}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={isFullscreen ? 'Exit Fullscreen' : 'TV Fullscreen (16:9 Landscape Lock)'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
        className={`fixed top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all shadow-xl active:scale-95 hover:scale-105 select-none cursor-pointer backdrop-blur-xl border ${
          isFullscreen
            ? 'bg-purple-900/60 border-purple-400/50 text-purple-200 shadow-purple-500/20'
            : 'bg-slate-900/70 border-white/15 text-white/90 hover:border-purple-500/40 hover:bg-slate-900/90'
        } ${className}`}
      >
        <Tv className="w-4 h-4 text-purple-400 animate-pulse" />
        {isFullscreen ? (
          <Minimize className="w-3.5 h-3.5" />
        ) : (
          <Maximize className="w-3.5 h-3.5" />
        )}
        {showLabel && (
          <span className="text-xs font-bold tracking-wide">
            {isFullscreen ? 'Exit TV Mode' : 'TV Fullscreen'}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen & Lock Landscape for TV Mirroring'}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
      className={`p-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg cursor-pointer border border-theme-card bg-theme-card active:scale-95 select-none ${
        isFullscreen ? 'ring-2 ring-purple-500/50' : ''
      } ${className}`}
    >
      <Tv className="w-5 h-5 text-purple-400" />
      {isFullscreen ? (
        <Minimize className="w-4 h-4 text-purple-300" />
      ) : (
        <Maximize className="w-4 h-4 text-purple-300" />
      )}
      {showLabel && (
        <span
          className="text-sm font-medium hidden sm:inline"
          style={{ color: 'var(--text-muted)' }}
        >
          {isFullscreen ? 'Exit TV Mode' : 'TV Fullscreen'}
        </span>
      )}
    </button>
  );
};

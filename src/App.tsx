import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2,
  Repeat,
  Repeat1,
  Shuffle,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Music,
  Heart,
  Clock,
  Smartphone,
  Watch,
  Settings,
  Search,
  Type,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate, useAnimationFrame, useTransform } from 'motion/react';

interface LyricLine {
  time: number;
  text: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  quality: string;
  frequency: string;
  lyrics: LyricLine[];
}

const MOCK_PLAYLIST: Track[] = [
  {
    id: '1',
    title: '远航星的告别',
    artist: 'ang, Tarokiki, Emi Ev',
    album: '星际远航 (Special Edition)',
    cover: 'https://picsum.photos/seed/space/400/400',
    duration: 243,
    quality: 'Hi-Res Audio',
    frequency: '48kHz / 24bit',
    lyrics: [
      { time: 0, text: "[前奏]" },
      { time: 10, text: "繁星在夜空中闪烁" },
      { time: 25, text: "远航的船只已起锚" },
      { time: 40, text: "告别了故乡的港湾" },
      { time: 55, text: "向着未知的深空进发" },
      { time: 70, text: "孤独是旅途的伴侣" },
      { time: 85, text: "勇气是永恒的航标" },
      { time: 100, text: "再见了，亲爱的故乡" },
      { time: 120, text: "我会带回星辰的光芒" },
    ]
  },
  {
    id: '2',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    cover: 'https://picsum.photos/seed/m83/400/400',
    duration: 230,
    quality: 'Lossless',
    frequency: '44.1kHz / 16bit',
    lyrics: [
      { time: 0, text: "Waiting in a car" },
      { time: 15, text: "Waiting for a ride in the dark" },
      { time: 30, text: "The night city grows" },
      { time: 45, text: "Look at the horizon glow" },
    ]
  },
  {
    id: '3',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    cover: 'https://picsum.photos/seed/weeknd/400/400',
    duration: 200,
    quality: 'Lossless',
    frequency: '44.1kHz / 16bit',
    lyrics: [
      { time: 0, text: "I've been on my own for long enough" },
      { time: 10, text: "Maybe you can show me how to love" },
    ]
  },
  {
    id: '4',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    cover: 'https://picsum.photos/seed/dua/400/400',
    duration: 203,
    quality: 'Hi-Res Audio',
    frequency: '96kHz / 24bit',
    lyrics: [
      { time: 0, text: "If you wanna run away with me" },
      { time: 10, text: "I know a galaxy" },
    ]
  }
];

const getDominantColor = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('#D0BCFF');
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    img.onerror = () => resolve('#D0BCFF');
  });
};

type PlaybackMode = 'loop' | 'shuffle' | 'repeat-one';
type ViewState = 'lyrics' | 'player' | 'info' | 'playlist' | 'settings' | 'more-settings';
type FontSize = 'sm' | 'base' | 'lg';

// --- Sub-components for performance optimization ---

const WavyProgressRing = ({ isPlaying, progress, accentColor, rotationMV }: { isPlaying: boolean, progress: number, accentColor: string, rotationMV: any }) => {
  const getWavyPath = (isWavy: boolean, angleOffset: number = 0) => {
    const baseRadius = 41.5; 
    const amplitude = 1.2;
    const center = 44;
    const numPoints = 120;
    const phase = -(angleOffset * Math.PI / 180) * 12;

    let d = "";
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
      const r = isWavy ? baseRadius + amplitude * Math.cos(angle * 12 + phase) : baseRadius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    return d;
  };

  // Use useTransform to update the path string without re-rendering the component
  // This is the key to preventing browser freezing
  const pathD = useTransform(rotationMV, (latestAngle: number) => {
    return getWavyPath(isPlaying, latestAngle);
  });

  return (
    <svg 
      className="absolute inset-0 scale-110 -rotate-90 pointer-events-none" 
      width="88" 
      height="88" 
      viewBox="0 0 88 88"
    >
      <motion.path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="5"
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={accentColor}
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: progress / 100 }}
        transition={{ type: 'tween', ease: 'linear' }}
      />
    </svg>
  );
};

const RotatingPlayButton = ({ isPlaying, handleTogglePlay, accentColor, currentClipPath, rotationMV }: { isPlaying: boolean, handleTogglePlay: () => void, accentColor: string, currentClipPath: string, rotationMV: any }) => {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 shadow-xl pointer-events-none"
        style={{ 
          backgroundColor: accentColor,
          clipPath: currentClipPath,
          rotate: rotationMV
        }}
      />
      
      <motion.button
        onTap={handleTogglePlay}
        dragListener={false}
        onPointerDown={(e) => e.stopPropagation()}
        className="relative z-10 w-full h-full flex items-center justify-center active:scale-95 transition-transform"
      >
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Pause size={36} fill="black" stroke="black" strokeWidth={1} />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="ml-1"
            >
              <Play size={36} fill="black" stroke="black" strokeWidth={1} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default function App() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [accentColor, setAccentColor] = useState('#D0BCFF');
  const [time, setTime] = useState(new Date());
  const [view, setView] = useState<ViewState>('player');
  const [volume, setVolume] = useState(60);
  const [showVolume, setShowVolume] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('loop');
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [playlistFilter, setPlaylistFilter] = useState<'all' | 'favorites'>('all');
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [isScanning, setIsScanning] = useState(false);
  const [isLyricsKaraoke, setIsLyricsKaraoke] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [activeDevice, setActiveDevice] = useState<'watch' | 'phone'>('watch');
  const [dragLock, setDragLock] = useState<null | 'x' | 'y'>(null);
  const rotationMV = useMotionValue(0);
  
  const currentTrack = MOCK_PLAYLIST[currentTrackIndex];
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const x = useMotionValue(-320);
  const y = useMotionValue(-320);

  // Smooth rotation for waves and button background using MotionValue for performance
  // Updating MotionValue does NOT trigger re-renders of the App component
  useAnimationFrame((_time, delta) => {
    if (isPlaying) {
      const newAngle = (rotationMV.get() + delta * 0.036) % 360;
      rotationMV.set(newAngle);
    }
  });

  // Update x and y when view changes
  useEffect(() => {
    const pos = getPagerPos();
    animate(x, pos.x, { type: 'spring', damping: 35, stiffness: 250 });
    animate(y, pos.y, { type: 'spring', damping: 35, stiffness: 250 });
  }, [view]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getDominantColor(currentTrack.cover).then(setAccentColor);
  }, [currentTrack.cover]);

  useEffect(() => {
    // Initial launch check
    if (isFirstLaunch) {
      // We could trigger something here if needed
    }
  }, [isFirstLaunch]);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentTrack.duration) {
            handleAutoNext();
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, currentTrackIndex, playbackMode]);

  const handleAutoNext = () => {
    if (playbackMode === 'repeat-one') {
      setCurrentTime(0);
    } else if (playbackMode === 'shuffle') {
      const nextIndex = Math.floor(Math.random() * MOCK_PLAYLIST.length);
      setCurrentTrackIndex(nextIndex);
      setCurrentTime(0);
    } else {
      handleNext();
    }
  };

  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handleNext = () => { setCurrentTrackIndex((prev) => (prev + 1) % MOCK_PLAYLIST.length); setCurrentTime(0); };
  const handlePrev = () => { setCurrentTrackIndex((prev) => (prev - 1 + MOCK_PLAYLIST.length) % MOCK_PLAYLIST.length); setCurrentTime(0); };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (!isPlaying) setIsPlaying(true);
  };

  const cyclePlaybackMode = () => {
    const modes: PlaybackMode[] = ['loop', 'shuffle', 'repeat-one'];
    const currentIndex = modes.indexOf(playbackMode);
    setPlaybackMode(modes[(currentIndex + 1) % modes.length]);
  };

  const progress = (currentTime / currentTrack.duration) * 100;
  const isLiked = likedTrackIds.includes(currentTrack.id);

  const toggleLike = () => {
    setLikedTrackIds(prev => 
      prev.includes(currentTrack.id) 
        ? prev.filter(id => id !== currentTrack.id) 
        : [...prev, currentTrack.id]
    );
  };

  // Google Petal Shape (Material You Scalloped)
  // Subtler 12-petal design to match the user's image
  const getPetalPoints = (isPetal: boolean) => {
    const points = [];
    const numPoints = 120;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // Increased base radius from 42 to 46.5 to bring button closer to ring
      const r = isPetal ? 46.5 + 2.5 * Math.cos(angle * 12) : 48.5;
      const x = 50 + r * Math.cos(angle - Math.PI / 2);
      const y = 50 + r * Math.sin(angle - Math.PI / 2);
      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    return `polygon(${points.join(', ')})`;
  };

  const petalShape = getPetalPoints(true);
  const circleShape = getPetalPoints(false);
  const currentClipPath = isPlaying ? petalShape : circleShape;

  const handleDrag = (event: any, info: any) => {
    if (view === 'player') {
      if (!dragLock) {
        if (Math.abs(info.offset.x) > 5) setDragLock('x');
        else if (Math.abs(info.offset.y) > 5) setDragLock('y');
      }
      
      // Force the other axis to stay centered if we are locked
      if (dragLock === 'x') {
        y.set(-320);
      } else if (dragLock === 'y') {
        x.set(-320);
      }
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    setDragLock(null);
    const threshold = 60;
    const { x: offsetX, y: offsetY } = info.offset;

    // Star Navigation Logic: Only allow transitions between Player and its 4 neighbors
    if (view === 'player') {
      if (Math.abs(offsetX) > Math.abs(offsetY)) {
        if (offsetX > threshold) setView('playlist'); // Swipe Right -> Move Left (Playlist)
        else if (offsetX < -threshold) setView('settings'); // Swipe Left -> Move Right (Settings)
      } else {
        if (offsetY > threshold) setView('lyrics');
        else if (offsetY < -threshold) setView('info');
      }
    } else if (view === 'playlist') {
      // Swipe left to go back to player
      if (offsetX < -threshold) setView('player');
      else if (Math.abs(offsetX) < 10 && Math.abs(offsetY) < 10) {
        // This was likely a tap, let the button handle it
      }
    } else if (view === 'settings') {
      if (offsetX > threshold) setView('player');
      else if (offsetY > threshold) setView('more-settings');
    } else if (view === 'more-settings') {
      if (offsetY < -threshold) setView('settings');
      else if (offsetX > threshold) setView('player');
    } else {
      // If in a sub-view, only allow swiping back to the center (Player)
      if (view === 'lyrics' && offsetY < -threshold) setView('player');
      else if (view === 'info' && offsetY > threshold) setView('player');
    }
  };

  const getPagerPos = () => {
    switch (view) {
      case 'playlist': return { x: 0, y: -320 };
      case 'settings': return { x: -640, y: -320 };
      case 'more-settings': return { x: -640, y: 0 };
      case 'lyrics': return { x: -320, y: 0 };
      case 'player': return { x: -320, y: -320 };
      case 'info': return { x: -320, y: -640 };
      default: return { x: -320, y: -320 };
    }
  };

  const pagerPos = getPagerPos();

  // Dynamic drag settings to prevent drifting to black areas
  const dragAxis = view === 'player' ? true : (view === 'playlist' || view === 'settings' ? 'x' : 'y');
  
  // Strict constraints based on current view to prevent seeing empty corners
  const getDragConstraints = () => {
    const center = { left: -320, right: -320, top: -320, bottom: -320 };
    switch (view) {
      case 'player': return { left: -640, right: 0, top: -640, bottom: 0 };
      case 'playlist': return { left: -320, right: 0, top: -320, bottom: -320 };
      case 'settings': return { left: -640, right: -320, top: -320, bottom: 0 };
      case 'more-settings': return { left: -640, right: -320, top: 0, bottom: -320 };
      case 'lyrics': return { left: -320, right: -320, top: -320, bottom: 0 };
      case 'info': return { left: -320, right: -320, top: -640, bottom: -320 };
      default: return center;
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans select-none overflow-hidden">
      {/* Watch Frame */}
      <div className="relative w-[320px] h-[320px] rounded-full bg-black border-[1px] border-white/10 shadow-2xl overflow-hidden group">
        
        {/* Dynamic Background Glow */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-full">
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 80%)`,
            }}
          />
        </div>

        {/* 2D Pager Container */}
        <motion.div 
          className="absolute z-20 w-[960px] h-[960px] flex flex-row flex-nowrap cursor-grab active:cursor-grabbing"
          drag={dragAxis}
          dragDirectionLock={true}
          dragConstraints={getDragConstraints()}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ x, y }}
          transition={{ type: 'spring', damping: 35, stiffness: 250 }}
        >
          {/* COLUMN 0: Playlist */}
          <div className="w-[320px] h-[960px] flex flex-col">
            <div className="w-full h-[320px]" /> {/* Empty Top */}
            <div className="w-full h-[320px] flex flex-col items-center relative overflow-hidden">
              {/* Floating Filter Toggle - Curved/Rounded bar at the very top */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                <button 
                  onClick={() => setPlaylistFilter(prev => prev === 'all' ? 'favorites' : 'all')}
                  className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${playlistFilter === 'favorites' ? 'bg-red-500 animate-pulse' : 'bg-white/40'}`} />
                  <span className="text-[9px] text-white font-bold uppercase tracking-widest">
                    {playlistFilter === 'all' ? '全部歌曲' : '我的收藏'}
                  </span>
                </button>
              </div>
              
              <div className="w-full h-full overflow-y-auto no-scrollbar mask-fade-edges px-0 scroll-smooth" style={{ touchAction: 'pan-y' }}>
                <div className="flex flex-col items-center pt-24 pb-32">
                  {MOCK_PLAYLIST
                    .map((track, originalIdx) => ({ ...track, originalIdx }))
                    .filter(t => playlistFilter === 'all' || likedTrackIds.includes(t.id))
                    .map((track, idx) => {
                      // Curved layout logic: scale and width based on position
                      return (
                        <motion.button 
                          key={track.id}
                          onClick={() => { setCurrentTrackIndex(track.originalIdx); setView('player'); }}
                          whileInView={{ 
                            scale: [0.8, 1, 0.8],
                            opacity: [0.3, 1, 0.3],
                            width: ["65%", "92%", "65%"]
                          }}
                          viewport={{ margin: "-80px 0px -80px 0px" }}
                          className={`flex items-center gap-3 p-3.5 rounded-[24px] transition-colors mb-2 mx-auto ${track.originalIdx === currentTrackIndex ? 'bg-white/15' : 'bg-white/5'}`}
                        >
                          <img src={track.cover} className="w-10 h-10 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${track.originalIdx === currentTrackIndex ? 'text-white' : 'text-white/60'}`}>{track.title}</p>
                            <p className="text-[10px] text-white/30 truncate">{track.artist}</p>
                          </div>
                          {likedTrackIds.includes(track.id) && (
                            <Heart size={10} className="text-red-500 shrink-0" fill="currentColor" />
                          )}
                        </motion.button>
                      );
                    })}
                  {playlistFilter === 'favorites' && likedTrackIds.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                      <Heart size={24} className="mb-2" />
                      <p className="text-[10px]">暂无收藏歌曲</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full h-[320px]" /> {/* Empty Bottom */}
          </div>

          {/* COLUMN 1: Main Stack (Lyrics, Player, Info) */}
          <div className="w-[320px] h-[960px] flex flex-col">
            {/* VIEW: Lyrics (Top) */}
            <div className="w-full h-[320px] flex flex-col items-center py-10 px-8 relative">
              <h3 className="text-white/60 text-[10px] font-bold mb-4 uppercase tracking-[0.3em]">歌词回放</h3>
              <div className="w-full flex-1 overflow-y-auto no-scrollbar mask-fade-edges py-4">
                <div className="flex flex-col gap-6 items-center">
                  {currentTrack.lyrics.map((line, idx) => {
                    const isActive = currentTime >= line.time && (idx === currentTrack.lyrics.length - 1 || currentTime < currentTrack.lyrics[idx + 1].time);
                    return (
                        <motion.p
                          key={idx}
                          onTap={() => handleSeek(line.time)}
                          onPointerDown={(e) => e.stopPropagation()}
                          animate={{ 
                            color: isActive ? accentColor : "rgba(255,255,255,0.3)",
                            scale: isActive ? 1.05 : 1,
                            fontWeight: isActive ? 700 : 400,
                            filter: isActive ? "blur(0px)" : "blur(0.5px)"
                          }}
                          className="text-sm cursor-pointer transition-all text-center leading-relaxed relative"
                        >
                          {isLyricsKaraoke && isActive ? (
                            <span className="relative inline-block">
                              <span className="opacity-30">{line.text}</span>
                              <motion.span 
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, ease: "linear" }}
                                className="absolute left-0 top-0 overflow-hidden whitespace-nowrap"
                                style={{ color: accentColor }}
                              >
                                {line.text}
                              </motion.span>
                            </span>
                          ) : line.text}
                        </motion.p>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setView('player')} onPointerDown={(e) => e.stopPropagation()} className="mt-2 text-white/20 hover:text-white/50 transition-colors">
                <ChevronDown size={24} />
              </button>
            </div>

            {/* VIEW: Player (Center) */}
            <div className="w-full h-[320px] flex flex-col items-center justify-between py-10 px-6 text-center relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 opacity-20">
                <ChevronDown size={16} />
                <span className="text-[8px] uppercase tracking-tighter">歌词</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-white/60 text-xs font-medium mb-1">
                  {time.getHours()}:{String(time.getMinutes()).padStart(2, '0')}
                </span>
                <h2 className={`text-white font-bold truncate max-w-[220px] leading-tight text-${fontSize}`}>
                  {currentTrack.title}
                </h2>
                <p className="text-white/40 text-[11px] font-medium truncate max-w-[180px] mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              {/* Middle: Main Controls - FIXED CONCENTRICITY */}
              <div className="flex items-center justify-center gap-4 w-full">
                <button onClick={handlePrev} onPointerDown={(e) => e.stopPropagation()} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform">
                  <SkipBack size={20} fill="currentColor" />
                </button>

                <div className="relative w-[88px] h-[88px] flex items-center justify-center">
                  <WavyProgressRing 
                    isPlaying={isPlaying} 
                    progress={progress} 
                    accentColor={accentColor} 
                    rotationMV={rotationMV} 
                  />

                  <RotatingPlayButton 
                    isPlaying={isPlaying} 
                    handleTogglePlay={handleTogglePlay} 
                    accentColor={accentColor} 
                    currentClipPath={currentClipPath} 
                    rotationMV={rotationMV} 
                  />
                </div>

                <button onClick={handleNext} onPointerDown={(e) => e.stopPropagation()} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform">
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 w-full">
                <button onClick={() => setShowVolume(true)} onPointerDown={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:scale-90">
                  <Volume2 size={18} />
                </button>
                <button onClick={toggleLike} onPointerDown={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
                  <motion.div animate={{ scale: isLiked ? [1, 1.3, 1] : 1, color: isLiked ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  </motion.div>
                </button>
                <button onClick={() => setView('settings')} onPointerDown={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:scale-90">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 opacity-20">
                <span className="text-[8px] uppercase tracking-tighter">详情</span>
                <ChevronUp size={16} />
              </div>
            </div>

            {/* VIEW: Info (Bottom) */}
            <div className="w-full h-[320px] flex flex-col items-center py-10 px-8 relative bg-black/40 backdrop-blur-sm">
              <button onClick={() => setView('player')} onPointerDown={(e) => e.stopPropagation()} className="mb-4 text-white/20 hover:text-white/50 transition-colors">
                <ChevronUp size={24} />
              </button>
              <h3 className="text-white/60 text-[10px] font-bold mb-6 uppercase tracking-[0.3em]">歌曲详情</h3>
              <div className="w-full flex flex-col gap-4 text-left">
                <div className="bg-white/5 p-3 rounded-2xl flex items-start gap-3">
                  <Music size={16} className="text-white/40 mt-1" />
                  <div>
                    <p className="text-white/30 text-[9px] uppercase font-bold">专辑</p>
                    <p className="text-white text-xs font-medium">{currentTrack.album}</p>
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-white/40 mt-1" />
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div><p className="text-white/30 text-[9px] uppercase font-bold">采样率</p><p className="text-white text-xs font-medium">{currentTrack.frequency}</p></div>
                    <div><p className="text-white/30 text-[9px] uppercase font-bold">音质</p><p className="text-white text-xs font-medium text-emerald-400">{currentTrack.quality}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Quick Settings & More Settings */}
          <div className="w-[320px] h-[960px] flex flex-col">
            {/* VIEW: More Settings (Top) */}
            <div className="w-full h-[320px] flex flex-col items-center py-12 px-8 relative overflow-hidden">
              <h3 className="text-white/60 text-[10px] font-bold mb-6 uppercase tracking-[0.3em]">更多设置</h3>
              <div className="flex flex-col gap-3 w-full overflow-y-auto no-scrollbar" style={{ touchAction: 'pan-y' }}>
                <button 
                  onClick={() => {
                    setIsScanning(true);
                    setTimeout(() => setIsScanning(false), 2000);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-white/5 p-4 rounded-3xl flex items-center justify-between active:scale-95 transition-transform shrink-0"
                >
                  <div className="flex items-center gap-3">
                    <Search size={18} className="text-white/60" />
                    <span className="text-[11px] text-white font-bold uppercase tracking-wider">手动扫描音乐</span>
                  </div>
                  {isScanning && <RefreshCw size={14} className="text-emerald-400 animate-spin" />}
                </button>

                <button 
                  onClick={() => setIsLyricsKaraoke(!isLyricsKaraoke)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`p-4 rounded-3xl flex items-center justify-between active:scale-95 transition-transform shrink-0 ${isLyricsKaraoke ? 'bg-white/20' : 'bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Music size={18} className={isLyricsKaraoke ? 'text-white' : 'text-white/60'} />
                    <span className="text-[11px] text-white font-bold uppercase tracking-wider">逐字歌词动画</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isLyricsKaraoke ? 'bg-emerald-500' : 'bg-white/20'}`}>
                    <motion.div 
                      animate={{ x: isLyricsKaraoke ? 16 : 2 }}
                      className="absolute top-1 w-2 h-2 rounded-full bg-white"
                    />
                  </div>
                </button>

                <div className="bg-white/5 p-4 rounded-3xl flex flex-col gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <Type size={18} className="text-white/60" />
                    <span className="text-[11px] text-white font-bold uppercase tracking-wider">字体大小</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {(['sm', 'base', 'lg'] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${fontSize === size ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}
                      >
                        {size === 'sm' ? '小' : size === 'base' ? '中' : '大'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIEW: Quick Settings (Center) */}
            <div className="w-full h-[320px] flex flex-col items-center py-12 px-8 relative">
              <h3 className="text-white/60 text-[10px] font-bold mb-6 uppercase tracking-[0.3em]">快捷设置</h3>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={cyclePlaybackMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-white/5 p-3 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="text-white/60">
                    {playbackMode === 'loop' && <Repeat size={18} />}
                    {playbackMode === 'shuffle' && <Shuffle size={18} />}
                    {playbackMode === 'repeat-one' && <Repeat1 size={18} />}
                  </div>
                  <span className="text-[9px] text-white font-bold uppercase tracking-wider text-center">
                    {playbackMode === 'loop' ? '列表循环' : playbackMode === 'shuffle' ? '随机播放' : '单曲循环'}
                  </span>
                </button>
                <button 
                  onClick={() => setShowVolume(true)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-white/5 p-3 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <Volume2 size={18} className="text-white/60" />
                  <span className="text-[9px] text-white font-bold uppercase tracking-wider">音量调节</span>
                </button>
                
                <button 
                  onClick={() => setSleepTimer(sleepTimer ? null : 30)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`p-3 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-transform ${sleepTimer ? 'bg-white/20' : 'bg-white/5'}`}
                >
                  <Clock size={18} className={sleepTimer ? 'text-white' : 'text-white/60'} />
                  <span className="text-[9px] text-white font-bold uppercase tracking-wider">
                    {sleepTimer ? `${sleepTimer}m` : '睡眠定时'}
                  </span>
                </button>

                <button 
                  onClick={() => setView('more-settings')}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-white/5 p-3 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <Settings size={18} className="text-white/60" />
                  <span className="text-[9px] text-white font-bold uppercase tracking-wider">更多设置</span>
                </button>
              </div>
            </div>
            <div className="w-full h-[320px]" /> {/* Empty Bottom */}
          </div>
        </motion.div>

        {/* Volume Slider Overlay */}
        <AnimatePresence>
          {showVolume && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8"
            >
              <div className="flex items-center justify-between w-full mb-6">
                <Volume2 size={20} className="text-white/60" />
                <span className="text-white font-bold text-lg">{volume}%</span>
                <button onClick={() => setShowVolume(false)} onPointerDown={(e) => e.stopPropagation()} className="text-white/40 hover:text-white text-xs">完成</button>
              </div>
              
              <div className="relative w-full h-16 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                <motion.div 
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: accentColor, width: `${volume}%` }}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume} 
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              
              <p className="mt-6 text-white/40 text-[9px] uppercase tracking-[0.2em]">左右滑动调节音量</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bezel Accents */}
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 rounded-full z-30" />

        {/* Permission Overlay */}
        <AnimatePresence>
          {!hasPermission && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <Search size={32} className="text-white/60" />
              </div>
              <h3 className="text-white text-sm font-bold mb-2">需要存储权限</h3>
              <p className="text-white/40 text-[10px] leading-relaxed mb-8">为了扫描并播放你手表中的本地音乐，我们需要访问存储空间。</p>
              <button 
                onClick={() => {
                  setIsScanning(true);
                  setTimeout(() => {
                    setIsScanning(false);
                    setHasPermission(true);
                  }, 2000);
                }}
                className="w-full py-3 bg-white text-black rounded-full text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {isScanning ? <RefreshCw size={14} className="animate-spin" /> : '授权并扫描音乐'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Legend */}
      <div className="hidden lg:block absolute bottom-8 left-8 max-w-xs text-white/20 text-[9px] uppercase tracking-[0.2em] font-bold">
        Material You Wear OS Simulator
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-edges {
          mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
        }
      `}</style>
    </div>
  );
}

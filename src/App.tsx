/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Volume2, VolumeX, Volume1, Volume, Rocket, Zap, Pause, Play, Bomb, RefreshCw, Trophy, Clock, Infinity, LogIn, LogOut, User, Send, HelpCircle, Award, Star, Shield, Target, Flame, Crown, Medal, Sparkles, Info, Heart } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  timestamp: Timestamp;
  uid: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const BADGES: Badge[] = [
  { id: 'level_1', name: 'Level 1 Master', description: 'Complete Level 1', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_2', name: 'Level 2 Master', description: 'Complete Level 2', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_3', name: 'Level 3 Master', description: 'Complete Level 3', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_4', name: 'Level 4 Master', description: 'Complete Level 4', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_5', name: 'Level 5 Master', description: 'Complete Level 5', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_6', name: 'Level 6 Master', description: 'Complete Level 6', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_7', name: 'Level 7 Master', description: 'Complete Level 7', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_8', name: 'Level 8 Master', description: 'Complete Level 8', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_9', name: 'Level 9 Master', description: 'Complete Level 9', icon: <Medal className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_10', name: 'Level 10 Master', description: 'Complete Level 10', icon: <Crown className="w-6 h-6" />, color: 'text-yellow-500' },
  { id: 'infinite_5', name: 'Survivor', description: 'Survive 5 mins in Infinite Mode', icon: <Shield className="w-6 h-6" />, color: 'text-green-400' },
  { id: 'infinite_10', name: 'Elite Survivor', description: 'Survive 10 mins in Infinite Mode', icon: <Flame className="w-6 h-6" />, color: 'text-orange-500' },
  { id: 'infinite_25', name: 'Legend', description: 'Survive 25 mins in Infinite Mode', icon: <Star className="w-6 h-6" />, color: 'text-purple-500' },
  { id: 'tutorial_complete', name: 'Trainee', description: 'Complete the Tutorial', icon: <Target className="w-6 h-6" />, color: 'text-cyan-400' },
  { id: 'first_contact', name: 'First Contact', description: 'Play your first game', icon: <Sparkles className="w-6 h-6" />, color: 'text-pink-400' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Destroy 50 asteroids in a level', icon: <Target className="w-6 h-6" />, color: 'text-red-400' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Get 3 stars on any level', icon: <Star className="w-6 h-6" />, color: 'text-yellow-400' },
  { id: 'creator_master', name: 'Creator Master', description: 'Destroy 100 red asteroids', icon: <Sparkles className="w-6 h-6" />, color: 'text-red-500' },
  { id: 'volume_max', name: 'Max Volume', description: 'Reach 100% volume', icon: <Volume2 className="w-6 h-6" />, color: 'text-green-500' },
  { id: 'bomb_dodger', name: 'Bomb Dodger', description: 'Complete a level without hitting bombs', icon: <Bomb className="w-6 h-6" />, color: 'text-gray-400' },
];

interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  rotation: number;
  rotationSpeed: number;
  isNegative?: boolean;
  isBomb?: boolean;
  vertices: { x: number; y: number }[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const MAX_VOLUME = 100;

// Memoized HUD Components for performance
const VolumeHUD = React.memo(({ volume, mode, volumeFlash }: { volume: number, mode: 'destroyer' | 'creator', volumeFlash: 'hit' | 'miss' | null }) => {
  return (
    <div className="w-full px-4 pb-4">
      <div className={`flex items-center gap-6 bg-neutral-900/80 backdrop-blur-md p-6 rounded-2xl border-2 transition-all duration-300 ${
        volumeFlash === 'hit' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 
        volumeFlash === 'miss' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-neutral-800'
      }`}>
        <div className="flex items-center gap-3">
          {volume > 60 ? <Volume2 className="w-8 h-8 text-green-400" /> : 
           volume > 20 ? <Volume1 className="w-8 h-8 text-yellow-400" /> : 
           <VolumeX className="w-8 h-8 text-red-500 animate-pulse" />}
        </div>
        <div className="flex-1 h-6 bg-neutral-950 rounded-full overflow-hidden relative border border-neutral-800">
          <motion.div 
            className={`h-full relative ${mode === 'destroyer' ? 'bg-green-500' : 'bg-red-500'}`}
            animate={{ width: `${volume}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20" />
          </motion.div>
          <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-px h-full bg-black/40" />
            ))}
          </div>
        </div>
        <div className="w-24 text-right font-black text-4xl italic tracking-tighter">
          {volume}<span className="text-sm not-italic ml-1 opacity-50">%</span>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center opacity-40 text-[8px] uppercase tracking-[0.2em]">
        <span>System Audio Output</span>
        <div className="flex gap-4">
          <span>EVOLT: DESTROY EMERALD</span>
          <span>RVOLT: DESTROY RUBY</span>
        </div>
      </div>
    </div>
  );
});

const StarHUD = React.memo(({ totalAsteroids, destroyedAsteroids }: { totalAsteroids: number, destroyedAsteroids: number }) => {
  const ratio = totalAsteroids > 0 ? destroyedAsteroids / totalAsteroids : 0;
  return (
    <div className="w-full px-4 mb-2">
      <div className="flex items-center justify-between bg-neutral-900/40 backdrop-blur-sm p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => {
              const threshold = s === 1 ? 0.25 : s === 2 ? 0.5 : 0.75;
              const isActive = ratio >= threshold;
              return (
                <motion.div
                  key={s}
                  animate={{ 
                    scale: isActive ? [1, 1.2, 1] : 1,
                    opacity: isActive ? 1 : 0.2
                  }}
                  className={`${isActive ? 'text-yellow-400' : 'text-white'}`}
                >
                  <Star className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                </motion.div>
              );
            })}
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <div className="text-left">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Mission Progress</p>
            <p className="text-xl font-black italic tracking-tighter leading-none">
              {Math.round(ratio * 100)}% <span className="text-xs opacity-50 not-italic">ACCURACY</span>
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Targets Destroyed</p>
          <p className="text-xl font-black italic tracking-tighter leading-none">
            {destroyedAsteroids} <span className="text-xs opacity-50 not-italic">/ {totalAsteroids}</span>
          </p>
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const [volume, setVolume] = useState(20);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [mode, setMode] = useState<'destroyer' | 'creator'>('destroyer');
  const [gameMode, setGameMode] = useState<'infinite' | 'level' | 'tutorial'>('infinite');
  const aimerRef = useRef<HTMLDivElement>(null);
  const [volumeFlash, setVolumeFlash] = useState<'hit' | 'miss' | null>(null);
  const [timer, setTimer] = useState(0);
  const [levelTime, setLevelTime] = useState(60);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [difficulty, setDifficulty] = useState(1);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [totalAsteroids, setTotalAsteroids] = useState(0);
  const [destroyedAsteroids, setDestroyedAsteroids] = useState(0);
  const [redDestroyed, setRedDestroyed] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const [isStartingFromMenu, setIsStartingFromMenu] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isTutorialPaused, setIsTutorialPaused] = useState(false);
  const [tutorialGreen, setTutorialGreen] = useState(0);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const levelMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const isTutorialPausedRef = useRef(isTutorialPaused);
  useEffect(() => { isTutorialPausedRef.current = isTutorialPaused; }, [isTutorialPaused]);
  const isGameOverRef = useRef(isGameOver);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  const [tutorialRed, setTutorialRed] = useState(0);
  const [tutorialBombs, setTutorialBombs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const explosionsRef = useRef<{ id: number; x: number; y: number; life: number }[]>([]);
  const lastSpawnRef = useRef(0);
  const requestRef = useRef<number>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(20);
  const timerIntervalRef = useRef<number | null>(null);

  // Auth & Progress listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch user progress
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPlayerName(data.name || u.displayName || '');
          setUserBadges(data.badges || []);
          setCompletedLevels(data.completedLevels || []);
          setLevelStars(data.levelStars || {});
          setRedDestroyed(data.redDestroyed || 0);
        } else {
          setPlayerName(u.displayName || '');
          // Initialize user progress
          await setDoc(doc(db, 'users', u.uid), {
            name: u.displayName,
            email: u.email,
            role: 'client',
            badges: [],
            completedLevels: [],
            levelStars: {},
            redDestroyed: 0
          });
        }
      } else {
        setPlayerName('');
        setUserBadges([]);
        setCompletedLevels([]);
        setLevelStars({});
        setRedDestroyed(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const awardBadge = async (badgeId: string) => {
    if (userBadges.includes(badgeId)) return;
    
    setUserBadges(prev => [...prev, badgeId]);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          badges: arrayUnion(badgeId)
        });
      } catch (error) {
        console.error("Failed to award badge", error);
      }
    }
  };

  const completeLevel = async (level: number) => {
    // Calculate stars
    const ratio = destroyedAsteroids / Math.max(1, totalAsteroids);
    let stars = 0;
    if (ratio >= 0.75) stars = 3;
    else if (ratio >= 0.50) stars = 2;
    else if (ratio >= 0.25) stars = 1;

    const newStars = { ...levelStars, [level]: Math.max(levelStars[level] || 0, stars) };
    setLevelStars(newStars);

    if (stars === 3) awardBadge('perfectionist');
    if (destroyedAsteroids >= 50) awardBadge('sharpshooter');
    awardBadge('bomb_dodger');

    const nextLevels = [...new Set([...completedLevels, level])];
    setCompletedLevels(nextLevels);
    awardBadge(`level_${level}`);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          completedLevels: nextLevels,
          levelStars: newStars,
          redDestroyed: redDestroyed
        });
      } catch (error) {
        console.error("Error updating progress", error);
      }
    }
  };

  // Leaderboard listener
  useEffect(() => {
    if (!user) {
      setLeaderboard([]);
      return;
    }
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry));
      setLeaderboard(entries);
    }, (error) => {
      console.error("Leaderboard listener error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const submitScore = async () => {
    if (!user || isSubmitting || !playerName.trim()) return;
    setIsSubmitting(true);
    try {
      const nameToSave = playerName.trim();
      await addDoc(collection(db, 'leaderboard'), {
        name: nameToSave,
        score: timer,
        timestamp: serverTimestamp(),
        uid: user.uid
      });
      
      // Also update the user's profile with their chosen name
      await updateDoc(doc(db, 'users', user.uid), {
        name: nameToSave
      });
      
      setShowLeaderboard(true);
    } catch (error) {
      console.error("Failed to submit score", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerFlash = (type: 'hit' | 'miss') => {
    setVolumeFlash(type);
    setTimeout(() => setVolumeFlash(null), 200);
  };
  
  const gameRef = useRef<HTMLDivElement>(null);

  const getSongUrl = useCallback(() => {
    if (!gameStarted) return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    if (gameMode === 'tutorial') return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';
    if (gameMode === 'infinite') return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
    
    const levelSongs: Record<number, string> = {
      1: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      2: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      4: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      5: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      6: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
      7: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
      8: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
      9: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
      10: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
      11: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
      12: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
      13: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
      14: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3',
    };
    return levelSongs[currentLevel] || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  }, [gameStarted, gameMode, currentLevel]);

  // Audio management
  useEffect(() => {
    const url = getSongUrl();
    
    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = volume / 100;
      audioRef.current = audio;
      
      const playOnInteract = () => {
        audio.play().catch(() => {});
        window.removeEventListener('click', playOnInteract);
      };
      window.addEventListener('click', playOnInteract);
    } else {
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
      }
      audioRef.current.currentTime = 0;
      if (gameStarted || gameId > 0) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
    }
  }, [getSongUrl, gameId]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setMode('destroyer');
      if (e.key === '2') setMode('creator');
      if (e.key === 'p' || e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        setIsPaused(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle audio pause/play on isPaused change
  useEffect(() => {
    if (audioRef.current && gameStarted && !isGameOver) {
      if (isPaused) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    }
  }, [isPaused, gameStarted, isGameOver]);

  // Sync volume with audio
  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      if (volume <= 0 && gameStarted && !isGameOver && gameMode !== 'tutorial') {
        setIsGameOver(true);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [volume, gameStarted, isGameOver, gameMode]);

  const spawnAsteroid = useCallback(() => {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    
    if (side === 0) { x = -100; y = Math.random() * GAME_HEIGHT; } // Left
    else if (side === 1) { x = GAME_WIDTH + 100; y = Math.random() * GAME_HEIGHT; } // Right
    else if (side === 2) { x = Math.random() * GAME_WIDTH; y = -100; } // Top
    else { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + 100; } // Bottom

    const targetX = GAME_WIDTH / 2 + (Math.random() - 0.5) * 400;
    const targetY = GAME_HEIGHT / 2 + (Math.random() - 0.5) * 400;
    const angle = Math.atan2(targetY - y, targetX - x);

    // Tutorial specific spawning
    let isBomb = false;
    let isNegative = false;

    if (gameMode === 'tutorial') {
      if (tutorialStep === 0) return undefined; // Don't spawn during preparation
      
      // Force correct asteroid type based on step
      if (tutorialStep === 1) {
        isBomb = false;
        isNegative = false; // Emerald
      } else if (tutorialStep === 2) {
        isBomb = false;
        isNegative = true; // Ruby
      } else if (tutorialStep === 3) {
        // Dodge stars for 20s - mixed asteroids + bombs
        isBomb = Math.random() < 0.25;
        isNegative = !isBomb && Math.random() < 0.4;
      } else {
        isBomb = Math.random() < 0.15;
        isNegative = !isBomb && Math.random() < 0.3;
      }
      // Double check for Step 2
      if (tutorialStep === 2) {
        isBomb = false;
        isNegative = true;
      }
    } else {
      const baseBombChance = 0.08;
      const baseNegativeChance = 0.2;
      const levelScaling = gameMode === 'level' ? (currentLevel - 1) * 0.02 : 0;
      const infiniteScaling = gameMode === 'infinite' ? (difficulty - 1) * 0.02 : 0;
      
      const bombChance = baseBombChance + levelScaling + infiniteScaling;
      isBomb = Math.random() < Math.min(0.3, bombChance);
      
      const negativeChance = baseNegativeChance + levelScaling + infiniteScaling;
      isNegative = !isBomb && Math.random() < Math.min(0.5, negativeChance);
    }

    const baseSpeed = 2 + Math.random() * 4;
    const speedMultiplier = gameMode === 'infinite' ? difficulty : (1 + (currentLevel - 1) * 0.2);

    const vertices: { x: number; y: number }[] = [];
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const r = (isBomb ? 50 : 30 + Math.random() * 40) * (0.8 + Math.random() * 0.4);
      vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    setTotalAsteroids(prev => prev + 1);

    return {
      id: Math.random(),
      x,
      y,
      size: isBomb ? 100 : 60 + Math.random() * 80,
      speed: (isBomb ? 6 : baseSpeed) * speedMultiplier,
      angle,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      isBomb,
      isNegative,
      vertices
    };
  }, [gameMode, difficulty, currentLevel, tutorialStep]);

  const createParticles = (x: number, y: number, color: string, count: number = 1) => {
    // Performance: Limit total particles
    if (particlesRef.current.length > 30) {
      particlesRef.current = particlesRef.current.slice(-30);
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
  };

  const gridCanvases = useMemo(() => {
    const createGrid = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = GAME_WIDTH;
      canvas.height = GAME_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let x = 0; x < GAME_WIDTH; x += 100) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, GAME_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < GAME_HEIGHT; y += 100) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(GAME_WIDTH, y);
          ctx.stroke();
        }
      }
      return canvas;
    };
    return {
      destroyer: createGrid('rgba(34, 197, 94, 0.1)'),
      creator: createGrid('rgba(239, 68, 68, 0.1)')
    };
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw grid from off-screen canvas
    ctx.drawImage(mode === 'destroyer' ? gridCanvases.destroyer : gridCanvases.creator, 0, 0);

    // Draw Asteroids - Grouped by type to minimize state changes
    const emeralds: Asteroid[] = [];
    const rubies: Asteroid[] = [];
    const bombs: Asteroid[] = [];

    asteroidsRef.current.forEach(ast => {
      if (ast.isBomb) bombs.push(ast);
      else if (ast.isNegative) rubies.push(ast);
      else emeralds.push(ast);
    });

    const drawAsteroidGroup = (group: Asteroid[], color: string, isBomb: boolean) => {
      if (group.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.fillStyle = `${color}33`;

      group.forEach(ast => {
        const angle = (ast.rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.setTransform(cos, sin, -sin, cos, ast.x, ast.y);
        
        if (isBomb) {
          ctx.beginPath();
          ctx.arc(0, 0, ast.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, ast.size / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ast.vertices.forEach((v, i) => {
            if (i === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      });
    };

    drawAsteroidGroup(emeralds, '#22c55e', false);
    drawAsteroidGroup(rubies, '#ef4444', false);
    drawAsteroidGroup(bombs, '#ffffff', true);

    // Draw Particles - Optimized with rgba to avoid globalAlpha changes
    particlesRef.current.forEach(p => {
      // Convert hex to rgba for alpha support without globalAlpha
      const r = parseInt(p.color.slice(1, 3), 16);
      const g = parseInt(p.color.slice(3, 5), 16);
      const b = parseInt(p.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life})`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, (1 - exp.life) * 150, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'destroyer' ? `rgba(34, 197, 94, ${exp.life})` : `rgba(239, 68, 68, ${exp.life})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    });
  }, [mode]);

  const updateGame = useCallback((time: number) => {
    if (!gameStarted || isPaused || isGameOver || isTutorialPaused) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Spawn new asteroids with difficulty scaling
    const baseInterval = gameMode === 'tutorial' ? 2000 : 1200;
    const levelInterval = gameMode === 'level' ? Math.max(500, baseInterval - (currentLevel - 1) * 80) : baseInterval;
    const infiniteInterval = gameMode === 'infinite' ? Math.max(400, baseInterval - (difficulty - 1) * 100) : baseInterval;
    const spawnInterval = Math.min(levelInterval, infiniteInterval);
    
    if (time - lastSpawnRef.current > spawnInterval) {
      if (asteroidsRef.current.length < 25) {
        const newAsteroid = spawnAsteroid();
        if (newAsteroid) {
          asteroidsRef.current.push(newAsteroid);
        }
      }
      lastSpawnRef.current = time;
    }

    // Difficulty scaling in infinite mode
    if (gameMode === 'infinite') {
      const newDifficulty = 1 + Math.floor(timer / 15) * 0.1;
      if (newDifficulty !== difficulty) {
        setDifficulty(newDifficulty);
      }
      if (timer >= 300) awardBadge('infinite_5');
      if (timer >= 600) awardBadge('infinite_10');
      if (timer >= 1500) awardBadge('infinite_25');
    }

    // Level mode completion
    if (gameMode === 'level' && timer >= levelTime) {
      setIsGameOver(true);
      completeLevel(currentLevel);
      if (audioRef.current) audioRef.current.pause();
    }

    // Tutorial logic
    if (gameMode === 'tutorial') {
      // Tutorial completion
      if (tutorialStep === 3 && timer >= 20) {
        setTutorialStep(4);
        setIsTutorialPaused(true);
        awardBadge('tutorial_complete');
      }
      
      // Tutorial step transitions
      if (tutorialGreen >= 20 && tutorialStep === 1) {
        setTutorialStep(2);
        setIsTutorialPaused(true);
        setTimer(0); // Reset timer for next step
        asteroidsRef.current = []; // Clear asteroids
      } else if (tutorialRed >= 10 && tutorialStep === 2) {
        setTutorialStep(3);
        setIsTutorialPaused(true);
        setTimer(0); // Reset timer for dodge step
        asteroidsRef.current = []; // Clear asteroids
      }
    }

    // Move asteroids
    let escapedCount = 0;
    asteroidsRef.current = asteroidsRef.current.filter(ast => {
      ast.x += Math.cos(ast.angle) * ast.speed;
      ast.y += Math.sin(ast.angle) * ast.speed;
      ast.rotation += ast.rotationSpeed;

      const isOut = ast.x < -200 || ast.x > GAME_WIDTH + 200 || 
                   ast.y < -200 || ast.y > GAME_HEIGHT + 200;
      
      if (isOut) {
        if (ast.isBomb) {
          if (gameMode === 'tutorial' && tutorialStep === 3) {
            setTutorialBombs(prev => prev + 1);
          }
        } else {
          // In destroyer mode, green escaping is bad. In creator mode, red escaping is bad.
          const isBadEscape = (mode === 'destroyer' && !ast.isNegative) || (mode === 'creator' && ast.isNegative);
          if (isBadEscape) escapedCount++;
        }
      }
      return !isOut;
    });

    if (escapedCount > 0) {
      volumeRef.current = Math.max(0, volumeRef.current - (5 * escapedCount));
      triggerFlash('miss');
    }

    // Update particles - Limit count for performance
    if (particlesRef.current.length > 20) {
      particlesRef.current = particlesRef.current.slice(-20);
    }
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.1; // Fade even faster
      return p.life > 0;
    });

    // Update explosions
    explosionsRef.current = explosionsRef.current.filter(exp => {
      exp.life -= 0.05;
      return exp.life > 0;
    });

    // Impossible to lose in tutorial
    if (gameMode === 'tutorial' && volumeRef.current <= 0) {
      volumeRef.current = 20;
      setTimer(t => Math.max(0, t - 5)); // Revert time a little
      triggerFlash('miss');
    }

    // Sync volume to state for HUD (once per frame)
    // Removed setVolume(volumeRef.current) from here to avoid re-rendering App every frame

    draw(ctx);
    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameStarted, isPaused, isGameOver, isTutorialPaused, spawnAsteroid, draw, gameMode, gridCanvases, tutorialStep, tutorialGreen, tutorialRed, timer]);

  // Sync volume to state for HUD at a lower frequency to prevent lag
  useEffect(() => {
    if (!gameStarted || isGameOver) return;
    const interval = setInterval(() => {
      if (volumeRef.current !== volume) {
        setVolume(volumeRef.current);
      }
    }, 100); // 10 FPS for HUD is plenty
    return () => clearInterval(interval);
  }, [gameStarted, isGameOver, volume]);

  useEffect(() => {
    // The loop is started by updateGame calling itself via requestAnimationFrame.
    // We only need to start it once here if it's not already running.
    if (gameStarted && !isPaused && !isGameOver && !isTutorialPaused) {
      if (requestRef.current === null) {
        requestRef.current = requestAnimationFrame(updateGame);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [gameStarted, isPaused, isGameOver, isTutorialPaused, updateGame]);

  const handleShoot = (e: React.MouseEvent | React.TouchEvent) => {
    if (!gameStarted || isPaused || isGameOver || isTutorialPaused) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Scale coordinates to internal resolution
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    let hit = false;
    let hitBomb = false;
    let hitWrongColor = false;
    
    const nextAsteroids = asteroidsRef.current.filter(ast => {
      const dist = Math.sqrt((ast.x - x) ** 2 + (ast.y - y) ** 2);
      if (dist < ast.size / 2 + 40) {
        if (ast.isBomb) {
          hit = true;
          hitBomb = true;
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, '#ffffff');
          return false;
        }
        
        // Check if mode matches asteroid color
        const isCorrectMode = (mode === 'destroyer' && !ast.isNegative) || (mode === 'creator' && ast.isNegative);
        
        if (isCorrectMode) {
          hit = true;
          setDestroyedAsteroids(prev => prev + 1);
          if (gameMode === 'tutorial') {
            if (ast.isNegative) setTutorialRed(prev => prev + 1);
            else setTutorialGreen(prev => prev + 1);
          }
          if (ast.isNegative) {
            setRedDestroyed(prev => {
              const next = prev + 1;
              if (next >= 100) awardBadge('creator_master');
              return next;
            });
          }
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, ast.isNegative ? '#ef4444' : '#22c55e');
          return false;
        } else {
          hitWrongColor = true;
          volumeRef.current = Math.max(0, volumeRef.current - 5);
          setVolume(volumeRef.current);
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, '#ffffff');
          return false; // Destroy asteroid
        }
      }
      return true;
    });
    asteroidsRef.current = nextAsteroids;

    if (hit) {
      if (hitBomb) {
        if (gameMode === 'tutorial') {
          volumeRef.current = Math.max(5, volumeRef.current - 15);
          setTimer(t => Math.max(0, t - 3)); // Revert time
          triggerFlash('miss');
        } else {
          volumeRef.current = 0;
          setIsGameOver(true);
          if (audioRef.current) audioRef.current.pause();
          triggerFlash('miss');
        }
      } else {
        const gain = mode === 'creator' ? 10 : 8;
        volumeRef.current = Math.min(MAX_VOLUME, volumeRef.current + gain);
        if (volumeRef.current >= 100) awardBadge('volume_max');
        triggerFlash('hit');
      }
    } else {
      // Miss or wrong color
      const penalty = hitWrongColor ? 15 : 10;
      volumeRef.current = Math.max(0, volumeRef.current - penalty);
      triggerFlash('miss');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !aimerRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    aimerRef.current.style.left = `${x}px`;
    aimerRef.current.style.top = `${y}px`;
  };

  const startGame = (isTutorial = false) => {
    console.log('startGame called:', { isTutorial, gameMode, tutorialStep });
    setGameId(prev => prev + 1);
    setGameStarted(true);
    setIsPaused(false);
    setIsGameOver(false);
    setIsTutorialPaused(isTutorial);
    if (isTutorial) setGameMode('tutorial');
    else if (gameMode === 'tutorial') setGameMode('infinite');
    setVolume(20);
    volumeRef.current = 20;
    setTimer(0);
    setDifficulty(1);
    setTotalAsteroids(0);
    setDestroyedAsteroids(0);
    if (isTutorial) setTutorialStep(0);
    else setTutorialStep(4);
    setTutorialGreen(0);
    setTutorialRed(0);
    setTutorialBombs(0);
    awardBadge('first_contact');
    asteroidsRef.current = [];
    particlesRef.current = [];
    explosionsRef.current = [];

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const startTutorial = () => {
    setGameMode('tutorial');
    setShowTutorialPrompt(false);
    setTutorialStep(1);
    startGame(true);
  };

  const skipTutorial = () => {
    setShowTutorialPrompt(false);
    if (gameMode === 'tutorial') {
      setGameMode('infinite');
    }
    if (isStartingFromMenu) {
      startGame();
    }
    setIsStartingFromMenu(false);
  };

  useEffect(() => {
    if (isGameOver || isPaused || isTutorialPaused || !gameStarted) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    } else if (gameStarted && !isPaused && !isTutorialPaused && !isGameOver) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        if (!isPausedRef.current && !isTutorialPausedRef.current && !isGameOverRef.current) {
          setTimer(t => t + 1);
        }
      }, 1000);
    }
  }, [isGameOver, isPaused, isTutorialPaused, gameStarted]);

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(!isPaused);
    if (audioRef.current) {
      if (!isPaused) audioRef.current.pause();
      else audioRef.current.play();
    }
  };

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeX className={`w-8 h-8 ${mode === 'destroyer' ? 'text-red-500' : 'text-red-400'}`} />;
    if (volume < 33) return <Volume className={`w-8 h-8 ${mode === 'destroyer' ? 'text-yellow-500' : 'text-yellow-400'}`} />;
    if (volume < 66) return <Volume1 className={`w-8 h-8 ${mode === 'destroyer' ? 'text-green-400' : 'text-green-300'}`} />;
    return <Volume2 className={`w-8 h-8 ${mode === 'destroyer' ? 'text-green-500' : 'text-green-400'}`} />;
  };

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-between p-4 font-mono transition-colors duration-500 overflow-hidden ${
      mode === 'destroyer' ? 'bg-neutral-950 text-green-500' : 'bg-neutral-900 text-red-500'
    }`}>
      {/* Header */}
      <div className="w-full flex justify-between items-center px-4 pt-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <Zap className={`w-6 h-6 ${mode === 'destroyer' ? 'fill-green-500' : 'fill-red-500'}`} />
            {mode === 'destroyer' ? 'Emerald Laser' : 'Ruby Laser'}
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-[8px] opacity-70 uppercase tracking-widest">
              {mode === 'destroyer' ? 'SHOOT EMERALD TO INCREASE | AVOID STARS' : 'SHOOT RUBY TO INCREASE | RVOLT MODE'}
            </p>
            <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded border border-white/10">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {gameMode === 'level' ? `${Math.max(0, levelTime - timer)}s` : `${timer}s`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* Badges Button */}
          <button 
            onClick={() => setShowBadges(true)}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all border border-white/10"
            title="Badges"
          >
            <Award className="w-4 h-4 text-yellow-500" />
          </button>

          {/* Help Button */}
          <button 
            onClick={() => {
              setIsStartingFromMenu(false);
              setShowTutorialPrompt(true);
            }}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all border border-white/10"
            title="Help"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Donate Button */}
          <a 
            href="https://ko-fi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-neutral-800 hover:bg-pink-900/30 rounded-lg transition-all border border-white/10 flex items-center gap-2 group"
            title="Support the Developer"
          >
            <Heart className="w-4 h-4 text-pink-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-pink-400 hidden sm:inline">DONATE</span>
          </a>

          {/* Game Mode Toggle */}
          {!gameStarted && (
            <div className="flex bg-neutral-800 rounded-lg p-1 mr-4">
              <button 
                onClick={() => setGameMode('infinite')}
                className={`px-3 py-1 rounded-md flex items-center gap-2 text-[10px] font-bold transition-all ${
                  gameMode === 'infinite' ? 'bg-neutral-700 text-white shadow-inner' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Infinity className="w-3 h-3" /> INFINITE
              </button>
              <div 
                className="relative"
                onMouseEnter={() => {
                  if (levelMenuTimeoutRef.current) clearTimeout(levelMenuTimeoutRef.current);
                  setIsLevelMenuOpen(true);
                }}
                onMouseLeave={() => {
                  levelMenuTimeoutRef.current = setTimeout(() => {
                    setIsLevelMenuOpen(false);
                  }, 1000);
                }}
              >
                <button 
                  onClick={() => setGameMode('level')}
                  className={`px-3 py-1 rounded-md flex items-center gap-2 text-[10px] font-bold transition-all ${
                    gameMode === 'level' ? 'bg-neutral-700 text-white shadow-inner' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Trophy className="w-3 h-3" /> LEVEL {currentLevel}
                </button>
                {/* Level Selector Dropdown */}
                {!gameStarted && (
                  <div className={`absolute top-full left-0 mt-2 ${isLevelMenuOpen ? 'grid' : 'hidden'} grid-cols-5 gap-1 bg-neutral-900 p-2 rounded-xl border border-white/10 z-50 w-48 shadow-2xl`}>
                    {[...Array(10)].map((_, i) => {
                      const levelNum = i + 1;
                      const isUnlocked = levelNum === 1 || completedLevels.includes(i);
                      const isCompleted = completedLevels.includes(levelNum);
                      
                      return (
                        <button
                          key={i}
                          disabled={!isUnlocked}
                          onClick={() => {
                            setCurrentLevel(levelNum);
                            setGameMode('level');
                          }}
                          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all relative ${
                            currentLevel === levelNum ? 'bg-green-500 text-black' : 
                            isCompleted ? 'bg-green-900/40 text-green-400 border border-green-500/20' :
                            isUnlocked ? 'bg-neutral-800 text-white hover:bg-neutral-700' :
                            'bg-neutral-950 text-white/10 cursor-not-allowed'
                          }`}
                          title={isUnlocked ? `Level ${levelNum}` : 'Locked: Complete previous level'}
                        >
                          {isUnlocked ? levelNum : '🔒'}
                          {isCompleted && levelStars[levelNum] > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {[...Array(levelStars[levelNum])].map((_, s) => (
                                <Star key={s} className="w-1.5 h-1.5 fill-current" />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auth Button */}
          {user && !gameStarted && (
            <div className="flex items-center gap-2 bg-neutral-800 px-2 py-1 rounded-lg border border-white/10">
              <User className="w-3 h-3 text-white/40" />
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onBlur={async () => {
                  if (playerName.trim() && user) {
                    try {
                      await updateDoc(doc(db, 'users', user.uid), {
                        name: playerName.trim()
                      });
                    } catch (error) {
                      console.error("Failed to update username", error);
                    }
                  }
                }}
                placeholder="Username"
                className="bg-transparent border-none outline-none text-white text-[10px] font-bold w-20"
                maxLength={20}
              />
            </div>
          )}
          <button 
            onClick={user ? handleLogout : handleLogin}
            className={`flex items-center gap-2 px-3 py-1 border-2 text-[10px] font-bold transition-all rounded-lg ${
              user ? 'border-white/20 text-white/60 hover:text-white hover:border-white/40' : 'bg-white text-black border-white hover:bg-white/90'
            }`}
          >
            {user ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
            {user ? 'LOGOUT' : 'LOGIN'}
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          <button 
            onClick={() => setMode('destroyer')}
            className={`px-3 py-1 border-2 text-[10px] font-bold transition-all flex items-center gap-2 ${
              mode === 'destroyer' ? 'bg-green-500 text-black border-green-500' : 'border-green-500/30 text-green-500/50'
            }`}
          >
            <span className="opacity-50">[1]</span> EVOLT
          </button>
          <button 
            onClick={() => setMode('creator')}
            className={`px-3 py-1 border-2 text-[10px] font-bold transition-all flex items-center gap-2 ${
              mode === 'creator' ? 'bg-red-500 text-black border-red-500' : 'border-red-500/30 text-red-500/50'
            }`}
          >
            <span className="opacity-50">[2]</span> RVOLT
          </button>
          {gameStarted && !isGameOver && (
            <button 
              onClick={togglePause}
              className={`p-1 border-2 rounded-full transition-all ${
                mode === 'destroyer' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className="relative flex-1 w-full my-2 group">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className={`w-full h-full bg-black border-4 rounded-lg cursor-none shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-500 object-contain ${
            mode === 'destroyer' ? 'border-neutral-800' : 'border-red-900/50'
          }`}
          onMouseDown={handleShoot}
          onMouseMove={handleMouseMove}
        />

        {(!gameStarted || isGameOver) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 p-8 text-center overflow-y-auto">
            {isGameOver && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8"
              >
                <h2 className="text-7xl font-black mb-2 text-red-600 tracking-tighter italic">
                  {gameMode === 'level' && timer >= levelTime ? 'LEVEL COMPLETE' : 'GAME OVER'}
                </h2>
                <p className="text-red-500/60 uppercase tracking-widest text-sm mb-4">
                  {gameMode === 'level' && timer >= levelTime ? 'You survived the challenge!' : 'The music has stopped.'}
                </p>

                {gameMode === 'level' && timer >= levelTime && (
                  <div className="flex flex-col items-center gap-4 mb-8 bg-neutral-900/80 p-8 rounded-3xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                    <div className="flex gap-4">
                      {[...Array(3)].map((_, i) => {
                        const ratio = destroyedAsteroids / Math.max(1, totalAsteroids);
                        const active = (i === 0 && ratio >= 0.25) || (i === 1 && ratio >= 0.5) || (i === 2 && ratio >= 0.75);
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
                          >
                            <Star className={`w-16 h-16 ${active ? 'fill-yellow-500 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-white/5'}`} />
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-white uppercase tracking-tighter">
                        {Math.round((destroyedAsteroids / Math.max(1, totalAsteroids)) * 100)}% DESTROYED
                      </div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">
                        {destroyedAsteroids} / {totalAsteroids} ASTEROIDS
                      </div>
                    </div>
                  </div>
                )}
                
                {gameMode === 'infinite' && (
                  <div className="bg-neutral-900/80 p-6 rounded-2xl border border-white/10 max-w-md mx-auto">
                    <div className="text-4xl font-black text-white mb-6 italic">SCORE: {timer}s</div>
                    
                    {user ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/10">
                          <User className="w-5 h-5 text-white/40" />
                          <input 
                            type="text" 
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Your Name"
                            className="bg-transparent border-none outline-none text-white w-full font-bold"
                            maxLength={20}
                          />
                        </div>
                        <button 
                          onClick={submitScore}
                          disabled={isSubmitting || !playerName.trim()}
                          className="w-full bg-white text-black py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50"
                        >
                          {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          SUBMIT SCORE
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleLogin}
                        className="w-full bg-white text-black py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/90"
                      >
                        <LogIn className="w-5 h-5" /> LOGIN TO SAVE SCORE
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!gameStarted) {
                    setIsStartingFromMenu(true);
                    setShowTutorialPrompt(true);
                  } else {
                    startGame();
                  }
                }}
                className={`px-12 py-6 font-black text-3xl rounded-sm transition-colors flex items-center gap-4 shadow-2xl ${
                  mode === 'destroyer' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-black hover:bg-red-400'
                }`}
              >
                {isGameOver ? <RefreshCw className="w-10 h-10" /> : <Rocket className="w-10 h-10" />}
                {isGameOver ? 'RESTART' : 'START'}
              </motion.button>
              
              {isGameOver && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setGameStarted(false);
                    setIsGameOver(false);
                    asteroidsRef.current = [];
                    particlesRef.current = [];
                    explosionsRef.current = [];
                  }}
                  className="px-8 py-6 bg-neutral-800 text-white font-black text-xl rounded-sm hover:bg-neutral-700 flex items-center gap-3"
                >
                  MENU
                </motion.button>
              )}

              {gameMode === 'infinite' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLeaderboard(true)}
                  className="px-8 py-6 bg-neutral-800 text-white font-black text-xl rounded-sm hover:bg-neutral-700 flex items-center gap-3"
                >
                  <Trophy className="w-8 h-8 text-yellow-500" /> LEADERBOARD
                </motion.button>
              )}
            </div>

            <p className={`mt-6 text-[10px] tracking-[0.3em] font-bold animate-pulse ${mode === 'destroyer' ? 'text-green-500/60' : 'text-red-500/60'}`}>
              {isGameOver ? 'SYSTEM CRITICAL ERROR' : 'READY FOR DEPLOYMENT'}
            </p>
          </div>
        ) : isPaused ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
            <h2 className="text-6xl font-black mb-8 italic tracking-tighter">PAUSED</h2>
            <div className="flex flex-col gap-4">
              <button 
                onClick={togglePause}
                className={`px-10 py-5 font-black text-2xl rounded-sm shadow-xl ${
                  mode === 'destroyer' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'
                }`}
              >
                RESUME
              </button>
              <button 
                onClick={() => startGame()}
                className="px-10 py-5 bg-neutral-800 text-white font-black text-xl rounded-sm hover:bg-neutral-700"
              >
                RESTART
              </button>
              <button 
                onClick={() => {
                  setIsPaused(false);
                  setGameStarted(false);
                  setIsGameOver(false);
                  asteroidsRef.current = [];
                  particlesRef.current = [];
                  explosionsRef.current = [];
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                }}
                className="px-10 py-5 bg-neutral-800 text-white font-black text-xl rounded-sm hover:bg-neutral-700"
              >
                MENU
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Crosshair */}
            <div
              ref={aimerRef}
              className="absolute pointer-events-none z-10 flex flex-col items-center gap-2"
              style={{ 
                transform: 'translate(-50%, -50%)' 
              }}
            >
              <Crosshair className={`w-16 h-16 opacity-80 ${mode === 'destroyer' ? 'text-green-500' : 'text-red-500'}`} />
              <div className={`text-[10px] font-black italic tracking-tighter px-2 py-0.5 rounded border ${
                mode === 'destroyer' ? 'bg-green-500 text-black border-green-400' : 'bg-red-500 text-black border-red-400'
              }`}>
                {mode === 'destroyer' ? 'EVOLT' : 'RVOLT'}
              </div>
            </div>
          </>
        )}

      {/* Tutorial Overlay */}
      {gameStarted && gameMode === 'tutorial' && !isGameOver && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-start justify-center p-4 pointer-events-none">
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`w-full max-w-2xl bg-neutral-900/95 backdrop-blur-xl border-2 p-6 rounded-2xl text-center shadow-2xl pointer-events-auto ${
              isTutorialPaused ? 'border-cyan-500' : 'border-cyan-500/20'
            } transition-all duration-500`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Info className="w-6 h-6 text-cyan-400" />
              <div className="text-left">
                <h3 className="text-xl font-black text-cyan-400 tracking-tighter uppercase italic leading-none">
                  {tutorialStep === 4 ? "TRAINING COMPLETE" : `Training: Step ${tutorialStep}`}
                </h3>
              </div>
            </div>
            
            <p className="text-base font-bold text-white leading-tight mb-4 min-h-[3rem] flex items-center justify-center">
              {tutorialStep === 0 && "PREPARING TRAINING SESSION..."}
              {tutorialStep === 1 && `DESTROY 20 EMERALD ASTEROIDS. ONLY EMERALD TARGETS WILL SPAWN. PROGRESS: ${tutorialGreen}/20`}
              {tutorialStep === 2 && `DESTROY 10 RUBY ASTEROIDS. ONLY RUBY TARGETS WILL SPAWN. PROGRESS: ${tutorialRed}/10`}
              {tutorialStep === 3 && `DODGE THE STARS FOR 20 SECONDS! MIXED ASTEROIDS ARE NOW APPEARING. TIME: ${Math.max(0, 20 - timer)}s`}
              {tutorialStep === 4 && "YOU ROCK! SYSTEM CALIBRATION SUCCESSFUL."}
            </p>

            {isTutorialPaused ? (
              <button 
                onClick={() => {
                  if (tutorialStep === 4) {
                    setGameStarted(false);
                    if (audioRef.current) audioRef.current.pause();
                  } else {
                    setIsTutorialPaused(false);
                  }
                }}
                className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-lg hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
              >
                {tutorialStep === 4 ? (
                  <>FINISH <LogOut className="w-5 h-5" /></>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> START THIS STEP</>
                )}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 text-cyan-400 font-black italic text-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" /> ACTIVE TRAINING...
                </div>
              </div>
            )}

            <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-cyan-400"
                animate={{ 
                  width: tutorialStep === 1 ? `${(tutorialGreen / 20) * 100}%` :
                         tutorialStep === 2 ? `${(tutorialRed / 10) * 100}%` :
                         tutorialStep === 3 ? `${(timer / 20) * 100}%` :
                         tutorialStep === 4 ? '100%' : '0%'
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

        {/* Tutorial Prompt Modal */}
        <AnimatePresence>
          {showTutorialPrompt && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8 backdrop-blur-md"
            >
              <div className="w-full max-w-md bg-neutral-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-8 text-center">
                <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
                  <HelpCircle className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter mb-2">NEED TRAINING?</h3>
                <p className="text-white/40 text-sm font-bold mb-8 leading-relaxed">
                  WOULD YOU LIKE TO START THE 1-MINUTE TRAINING SESSION TO LEARN THE SYSTEM MECHANICS?
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={startTutorial}
                    className="w-full bg-cyan-500 text-black py-4 rounded-xl font-black hover:bg-cyan-400 transition-colors"
                  >
                    START TRAINING
                  </button>
                  <button 
                    onClick={skipTutorial}
                    className="w-full bg-white/5 text-white/60 py-4 rounded-xl font-black hover:bg-white/10 transition-colors"
                  >
                    SKIP FOR NOW
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges Modal */}
        <AnimatePresence>
          {showBadges && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8 backdrop-blur-md"
            >
              <div className="w-full max-w-3xl bg-neutral-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-neutral-800/50">
                  <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
                    <Award className="w-10 h-10 text-yellow-500" /> YOUR ACHIEVEMENTS
                  </h3>
                  <button 
                    onClick={() => setShowBadges(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Zap className="w-8 h-8 rotate-45" />
                  </button>
                </div>
                
                <div className="p-8 max-h-[60vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BADGES.map((badge) => {
                    const isEarned = userBadges.includes(badge.id);
                    return (
                      <div 
                        key={badge.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                          isEarned ? 'bg-white/5 border-white/20' : 'bg-black/40 border-white/5 opacity-40 grayscale'
                        }`}
                      >
                        <div className={`p-3 rounded-xl bg-black/40 border border-white/10 ${badge.color}`}>
                          {badge.icon}
                        </div>
                        <div>
                          <h4 className="font-black text-sm tracking-tight">{badge.name}</h4>
                          <p className="text-[10px] font-bold text-white/40 uppercase">{badge.description}</p>
                        </div>
                        {isEarned && (
                          <div className="ml-auto">
                            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-6 bg-neutral-800/30 text-center">
                  <p className="text-[10px] text-white/20 tracking-[0.3em] font-bold uppercase">
                    {userBadges.length} / {BADGES.length} Badges Earned
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard Modal */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8 backdrop-blur-md"
            >
              <div className="w-full max-w-2xl bg-neutral-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-neutral-800/50">
                  <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
                    <Trophy className="w-10 h-10 text-yellow-500" /> TOP SURVIVORS
                  </h3>
                  <button 
                    onClick={() => setShowLeaderboard(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Zap className="w-8 h-8 rotate-45" />
                  </button>
                </div>
                
                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  {!user ? (
                    <div className="text-center py-12">
                      <LogIn className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-white/40 mb-6 font-bold">LOGIN TO VIEW THE LEADERBOARD</p>
                      <button 
                        onClick={handleLogin}
                        className="bg-white text-black px-8 py-4 rounded-xl font-black hover:bg-white/90"
                      >
                        LOGIN WITH GOOGLE
                      </button>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-white/40 font-bold">NO SCORES YET. BE THE FIRST!</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {leaderboard.map((entry, i) => (
                        <div 
                          key={entry.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            entry.uid === user?.uid ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-6">
                            <span className={`text-2xl font-black italic w-8 ${
                              i === 0 ? 'text-yellow-500' : i === 1 ? 'text-neutral-400' : i === 2 ? 'text-amber-700' : 'text-white/20'
                            }`}>
                              #{i + 1}
                            </span>
                            <span className="text-xl font-bold">{entry.name}</span>
                          </div>
                          <div className="text-2xl font-black italic text-white/80">{entry.score}s</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-6 bg-neutral-800/30 text-center">
                  <p className="text-[10px] text-white/20 tracking-[0.3em] font-bold uppercase">Infinite Mode Rankings • Real-time Updates</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* HUD Elements */}
        {gameStarted && gameMode === 'level' && !isGameOver && (
          <StarHUD totalAsteroids={totalAsteroids} destroyedAsteroids={destroyedAsteroids} />
        )}
        
        <VolumeHUD volume={volume} mode={mode} volumeFlash={volumeFlash} />
      </div>
  );
}

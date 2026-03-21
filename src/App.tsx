/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Volume2, VolumeX, Volume1, Volume, Rocket, Zap, Pause, Play, Bomb, RefreshCw, Trophy, Clock, Infinity, LogIn, LogOut, User, Send, HelpCircle, Award, Star, Shield, Target, Flame, Crown, Medal, Sparkles, Info } from 'lucide-react';
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
  vx: number;
  vy: number;
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
  r: number;
  g: number;
  b: number;
}

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const MAX_VOLUME = 100;

// Memoized HUD Components for performance
const VolumeHUD = React.memo(({ volume, mode, volumeFlash }: { volume: number, mode: 'destroyer' | 'creator', volumeFlash: 'hit' | 'miss' | null }) => {
  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 bg-neutral-900/90 backdrop-blur-xl p-4 md:p-8 rounded-3xl border-2 transition-all duration-500 shadow-2xl z-40 ${
      mode === 'destroyer' ? 'border-green-500/20' : 'border-red-500/20'
    } ${volumeFlash === 'hit' ? 'scale-105 border-green-500' : volumeFlash === 'miss' ? 'scale-95 border-red-500' : ''}`}>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`p-1.5 md:p-2 rounded-xl ${mode === 'destroyer' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'}`}>
            {volume <= 0 ? <VolumeX className="w-4 h-4 md:w-6 md:h-6" /> : volume < 30 ? <Volume1 className="w-4 h-4 md:w-6 md:h-6" /> : <Volume2 className="w-4 h-4 md:w-6 md:h-6" />}
          </div>
          <div className="font-black text-xs md:text-sm tracking-widest uppercase opacity-50">Volume</div>
        </div>
        <div className="w-16 md:w-24 text-right font-black text-xl md:text-4xl italic tracking-tighter">
          {Math.round(volume)}<span className="text-[10px] md:text-sm not-italic ml-0.5 md:ml-1 opacity-50">%</span>
        </div>
      </div>
      <div className="h-4 md:h-6 bg-neutral-950 rounded-full overflow-hidden relative border border-neutral-800">
        <div 
          className={`h-full relative transition-all duration-200 ${mode === 'destroyer' ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${volume}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20" />
        </div>
      </div>
    </div>
  );
});

const GameHUD = React.memo(({ 
  volumeRef, 
  timerRef, 
  destroyedAsteroidsRef, 
  totalAsteroidsRef, 
  tutorialGreenRef, 
  tutorialRedRef,
  mode,
  gameMode,
  levelTime,
  tutorialStep,
  volumeFlash,
  isTutorialPaused,
  setIsTutorialPaused,
  setGameStarted,
  audioRef
}: {
  volumeRef: React.MutableRefObject<number>,
  timerRef: React.MutableRefObject<number>,
  destroyedAsteroidsRef: React.MutableRefObject<number>,
  totalAsteroidsRef: React.MutableRefObject<number>,
  tutorialGreenRef: React.MutableRefObject<number>,
  tutorialRedRef: React.MutableRefObject<number>,
  mode: 'destroyer' | 'creator',
  gameMode: 'infinite' | 'level' | 'tutorial',
  levelTime: number,
  tutorialStep: number,
  volumeFlash: 'hit' | 'miss' | null,
  isTutorialPaused: boolean,
  setIsTutorialPaused: (v: boolean) => void,
  setGameStarted: (v: boolean) => void,
  audioRef: React.RefObject<HTMLAudioElement | null>
}) => {
  const [volume, setVolume] = useState(volumeRef.current);
  const [timer, setTimer] = useState(timerRef.current);
  const [destroyed, setDestroyed] = useState(destroyedAsteroidsRef.current);
  const [total, setTotal] = useState(totalAsteroidsRef.current);
  const [green, setGreen] = useState(tutorialGreenRef.current);
  const [red, setRed] = useState(tutorialRedRef.current);

  useEffect(() => {
    const interval = setInterval(() => {
      setVolume(volumeRef.current);
      setTimer(timerRef.current);
      setDestroyed(destroyedAsteroidsRef.current);
      setTotal(totalAsteroidsRef.current);
      setGreen(tutorialGreenRef.current);
      setRed(tutorialRedRef.current);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const ratio = total > 0 ? destroyed / total : 0;

  return (
    <>
      {gameMode === 'level' && (
        <StarHUD totalAsteroids={total} destroyedAsteroids={destroyed} />
      )}
      
      {gameMode === 'tutorial' && (
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
              {tutorialStep === 1 && `DESTROY 20 EMERALD ASTEROIDS. ONLY EMERALD TARGETS WILL SPAWN. PROGRESS: ${green}/20`}
              {tutorialStep === 2 && `DESTROY 10 RUBY ASTEROIDS. ONLY RUBY TARGETS WILL SPAWN. PROGRESS: ${red}/10`}
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
                  width: tutorialStep === 1 ? `${(green / 20) * 100}%` :
                         tutorialStep === 2 ? `${(red / 10) * 100}%` :
                         tutorialStep === 3 ? `${(timer / 20) * 100}%` :
                         tutorialStep === 4 ? '100%' : '0%'
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      <VolumeHUD volume={volume} mode={mode} volumeFlash={volumeFlash} />
    </>
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
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(gameStarted);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const [isGameOver, setIsGameOver] = useState(false);
  const isGameOverRef = useRef(isGameOver);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  const [mode, setMode] = useState<'destroyer' | 'creator'>('destroyer');
  const [gameMode, setGameMode] = useState<'infinite' | 'level' | 'tutorial'>('infinite');
  const gameModeRef = useRef(gameMode);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  const aimerRef = useRef<HTMLDivElement>(null);
  const [volumeFlash, setVolumeFlash] = useState<'hit' | 'miss' | null>(null);
  const [levelTime, setLevelTime] = useState(60);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [redDestroyed, setRedDestroyed] = useState(0);
  const redDestroyedRef = useRef(redDestroyed);
  useEffect(() => { redDestroyedRef.current = redDestroyed; }, [redDestroyed]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const [isStartingFromMenu, setIsStartingFromMenu] = useState(false);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const levelMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialStepRef = useRef(tutorialStep);
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);

  const [isTutorialPaused, setIsTutorialPaused] = useState(false);
  const isTutorialPausedRef = useRef(isTutorialPaused);
  useEffect(() => { isTutorialPausedRef.current = isTutorialPaused; }, [isTutorialPaused]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState(0);
  
  // Refs for performance-critical state in game loop
  const volumeRef = useRef(20);
  const timerRef = useRef(0);
  const destroyedAsteroidsRef = useRef(0);
  const totalAsteroidsRef = useRef(0);
  const tutorialGreenRef = useRef(0);
  const tutorialRedRef = useRef(0);
  const difficultyRef = useRef(1);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const explosionsRef = useRef<{ id: number; x: number; y: number; life: number }[]>([]);
  const lastSpawnRef = useRef(0);
  const requestRef = useRef<number>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    const ratio = destroyedAsteroidsRef.current / Math.max(1, totalAsteroidsRef.current);
    let stars = 0;
    if (ratio >= 0.75) stars = 3;
    else if (ratio >= 0.50) stars = 2;
    else if (ratio >= 0.25) stars = 1;

    const newStars = { ...levelStars, [level]: Math.max(levelStars[level] || 0, stars) };
    setLevelStars(newStars);

    if (stars === 3) awardBadge('perfectionist');
    if (destroyedAsteroidsRef.current >= 50) awardBadge('sharpshooter');
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
        score: timerRef.current,
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
      audio.volume = volumeRef.current / 100;
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

    if (gameModeRef.current === 'tutorial') {
      if (tutorialStepRef.current === 0) return undefined; // Don't spawn during preparation
      
      // Force correct asteroid type based on step
      if (tutorialStepRef.current === 1) {
        isBomb = false;
        isNegative = false; // Emerald
      } else if (tutorialStepRef.current === 2) {
        isBomb = false;
        isNegative = true; // Ruby
      } else if (tutorialStepRef.current === 3) {
        // Dodge stars for 20s - mixed asteroids + bombs
        isBomb = Math.random() < 0.25;
        isNegative = !isBomb && Math.random() < 0.4;
      } else {
        isBomb = Math.random() < 0.15;
        isNegative = !isBomb && Math.random() < 0.3;
      }
      // Double check for Step 2
      if (tutorialStepRef.current === 2) {
        isBomb = false;
        isNegative = true;
      }
    } else {
      const baseBombChance = 0.08;
      const baseNegativeChance = 0.2;
      const levelScaling = gameModeRef.current === 'level' ? (currentLevel - 1) * 0.02 : 0;
      const infiniteScaling = gameModeRef.current === 'infinite' ? (difficultyRef.current - 1) * 0.02 : 0;
      
      const bombChance = baseBombChance + levelScaling + infiniteScaling;
      isBomb = Math.random() < Math.min(0.3, bombChance);
      
      const negativeChance = baseNegativeChance + levelScaling + infiniteScaling;
      isNegative = !isBomb && Math.random() < Math.min(0.5, negativeChance);
    }

    const baseSpeed = 2 + Math.random() * 4;
    const speedMultiplier = gameModeRef.current === 'infinite' ? difficultyRef.current : (1 + (currentLevel - 1) * 0.2);
    const speed = (isBomb ? 6 : baseSpeed) * speedMultiplier;

    const vertices: { x: number; y: number }[] = [];
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const r = (isBomb ? 50 : 30 + Math.random() * 40) * (0.8 + Math.random() * 0.4);
      vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    totalAsteroidsRef.current += 1;

    return {
      id: Math.random(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: isBomb ? 100 : 60 + Math.random() * 80,
      speed,
      angle,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      isBomb,
      isNegative,
      vertices
    };
  }, [currentLevel]);

  const createParticles = (x: number, y: number, color: string, count: number = 1) => {
    // Performance: Limit total particles
    if (particlesRef.current.length > 40) {
      particlesRef.current = particlesRef.current.slice(-40);
    }
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

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
        r, g, b
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
    ctx.drawImage(modeRef.current === 'destroyer' ? gridCanvases.destroyer : gridCanvases.creator, 0, 0);

    // Pre-calculate color strings
    const EMERALD_COLOR = '#22c55e';
    const EMERALD_FILL = '#22c55e33';
    const RUBY_COLOR = '#ef4444';
    const RUBY_FILL = '#ef444433';
    const BOMB_COLOR = '#ffffff';
    const BOMB_FILL = '#ffffff33';

    // Draw Asteroids - Optimized by iterating once and using multiple passes for styles
    const drawAsteroids = (type: 'emerald' | 'ruby' | 'bomb') => {
      let color = '';
      let fillStyle = '';
      let isBomb = false;
      
      if (type === 'emerald') {
        color = EMERALD_COLOR;
        fillStyle = EMERALD_FILL;
      } else if (type === 'ruby') {
        color = RUBY_COLOR;
        fillStyle = RUBY_FILL;
      } else {
        color = BOMB_COLOR;
        fillStyle = BOMB_FILL;
        isBomb = true;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.fillStyle = fillStyle;

      const asteroids = asteroidsRef.current;
      const len = asteroids.length;
      
      for (let i = 0; i < len; i++) {
        const ast = asteroids[i];
        
        // Inline type check for speed
        if (type === 'bomb') {
          if (!ast.isBomb) continue;
        } else if (type === 'ruby') {
          if (!ast.isNegative || ast.isBomb) continue;
        } else {
          if (ast.isNegative || ast.isBomb) continue;
        }

        const angle = (ast.rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.setTransform(cos, sin, -sin, cos, ast.x, ast.y);
        
        if (isBomb) {
          const radius = ast.size / 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, radius / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fillStyle; // Restore for next bomb
        } else {
          ctx.beginPath();
          const vertices = ast.vertices;
          const vLen = vertices.length;
          for (let j = 0; j < vLen; j++) {
            const v = vertices[j];
            if (j === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    };

    drawAsteroids('emerald');
    drawAsteroids('ruby');
    drawAsteroids('bomb');

    // Draw Particles - Optimized with for loop
    const particles = particlesRef.current;
    const pLen = particles.length;
    for (let i = 0; i < pLen; i++) {
      const p = particles[i];
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.life})`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    // Draw Explosions - Optimized with for loop and pre-calculated colors
    const explosions = explosionsRef.current;
    const eLen = explosions.length;
    const destroyerExplosionColor = 'rgba(34, 197, 94, ';
    const creatorExplosionColor = 'rgba(239, 68, 68, ';
    const baseExplosionColor = modeRef.current === 'destroyer' ? destroyerExplosionColor : creatorExplosionColor;

    for (let i = 0; i < eLen; i++) {
      const exp = explosions[i];
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, (1 - exp.life) * 150, 0, Math.PI * 2);
      ctx.strokeStyle = baseExplosionColor + exp.life + ')';
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }, [gridCanvases]);

  const updateGame = useCallback((time: number) => {
    if (!gameStarted || isPaused || isGameOver || isTutorialPaused) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Spawn new asteroids with difficulty scaling
    const baseInterval = gameModeRef.current === 'tutorial' ? 2000 : 1200;
    const levelInterval = gameModeRef.current === 'level' ? Math.max(500, baseInterval - (currentLevel - 1) * 80) : baseInterval;
    const infiniteInterval = gameModeRef.current === 'infinite' ? Math.max(400, baseInterval - (difficultyRef.current - 1) * 100) : baseInterval;
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
    if (gameModeRef.current === 'infinite') {
      const newDifficulty = 1 + Math.floor(timerRef.current / 15) * 0.1;
      difficultyRef.current = newDifficulty;
      if (timerRef.current >= 300) awardBadge('infinite_5');
      if (timerRef.current >= 600) awardBadge('infinite_10');
      if (timerRef.current >= 1500) awardBadge('infinite_25');
    }

    // Level mode completion
    if (gameModeRef.current === 'level' && timerRef.current >= levelTime) {
      setIsGameOver(true);
      completeLevel(currentLevel);
      if (audioRef.current) audioRef.current.pause();
    }

    // Tutorial logic
    if (gameModeRef.current === 'tutorial') {
      // Tutorial completion
      if (tutorialStepRef.current === 3 && timerRef.current >= 20) {
        setTutorialStep(4);
        setIsTutorialPaused(true);
        awardBadge('tutorial_complete');
      }
      
      // Tutorial step transitions
      if (tutorialGreenRef.current >= 20 && tutorialStepRef.current === 1) {
        setTutorialStep(2);
        setIsTutorialPaused(true);
        timerRef.current = 0;
        asteroidsRef.current = []; // Clear asteroids
      } else if (tutorialRedRef.current >= 10 && tutorialStepRef.current === 2) {
        setTutorialStep(3);
        setIsTutorialPaused(true);
        timerRef.current = 0;
        asteroidsRef.current = []; // Clear asteroids
      }
    }

    // Move asteroids
    let escapedCount = 0;
    asteroidsRef.current = asteroidsRef.current.filter(ast => {
      ast.x += ast.vx;
      ast.y += ast.vy;
      ast.rotation += ast.rotationSpeed;

      const isOut = ast.x < -200 || ast.x > GAME_WIDTH + 200 || 
                   ast.y < -200 || ast.y > GAME_HEIGHT + 200;
      
      if (isOut) {
        if (!ast.isBomb) {
          // In destroyer mode, green escaping is bad. In creator mode, red escaping is bad.
          const isBadEscape = (modeRef.current === 'destroyer' && !ast.isNegative) || (modeRef.current === 'creator' && ast.isNegative);
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
    if (particlesRef.current.length > 40) {
      particlesRef.current = particlesRef.current.slice(-40);
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

    // Sync audio volume and handle game over
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current / 100;
      if (volumeRef.current <= 0 && gameStarted && !isGameOver && gameModeRef.current !== 'tutorial') {
        setIsGameOver(true);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    // Impossible to lose in tutorial
    if (gameModeRef.current === 'tutorial' && volumeRef.current <= 0) {
      volumeRef.current = 20;
      timerRef.current = Math.max(0, timerRef.current - 5);
      triggerFlash('miss');
    }

    draw(ctx);
    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameStarted, isPaused, isGameOver, isTutorialPaused, spawnAsteroid, draw, gridCanvases, currentLevel, levelTime]);

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

  const handleShoot = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!gameStartedRef.current || isPausedRef.current || isGameOverRef.current || isTutorialPausedRef.current) return;

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
      const dx = ast.x - x;
      const dy = ast.y - y;
      const distSq = dx * dx + dy * dy;
      const radius = ast.size / 2 + 40;
      
      if (distSq < radius * radius) {
        if (ast.isBomb) {
          hit = true;
          hitBomb = true;
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, '#ffffff', 10);
          return false;
        }
        
        // Check if mode matches asteroid color
        const isCorrectMode = (modeRef.current === 'destroyer' && !ast.isNegative) || (modeRef.current === 'creator' && ast.isNegative);
        
        if (isCorrectMode) {
          hit = true;
          destroyedAsteroidsRef.current += 1;
          if (gameModeRef.current === 'tutorial') {
            if (ast.isNegative) {
              tutorialRedRef.current += 1;
            } else {
              tutorialGreenRef.current += 1;
            }
          }
          if (ast.isNegative) {
            redDestroyedRef.current += 1;
            if (redDestroyedRef.current >= 100) awardBadge('creator_master');
          }
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, ast.isNegative ? '#ef4444' : '#22c55e', 8);
          return false;
        } else {
          hitWrongColor = true;
          volumeRef.current = Math.max(0, volumeRef.current - 5);
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, '#ffffff', 5);
          return false; // Destroy asteroid
        }
      }
      return true;
    });
    asteroidsRef.current = nextAsteroids;

    if (hit) {
      if (hitBomb) {
        if (gameModeRef.current === 'tutorial') {
          volumeRef.current = Math.max(5, volumeRef.current - 15);
          timerRef.current = Math.max(0, timerRef.current - 3);
          triggerFlash('miss');
        } else {
          volumeRef.current = 0;
          setIsGameOver(true);
          isGameOverRef.current = true;
          if (audioRef.current) audioRef.current.pause();
          triggerFlash('miss');
        }
      } else {
        const gain = modeRef.current === 'creator' ? 10 : 8;
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
  }, [createParticles, awardBadge]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !aimerRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    aimerRef.current.style.left = `${x}px`;
    aimerRef.current.style.top = `${y}px`;
  }, []);

  const startGame = (isTutorial = false) => {
    console.log('startGame called:', { isTutorial, gameMode, tutorialStep });
    setGameId(prev => prev + 1);
    setGameStarted(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsTutorialPaused(isTutorial);
    isTutorialPausedRef.current = isTutorial;
    if (isTutorial) {
      setGameMode('tutorial');
      setTutorialStep(1);
      tutorialStepRef.current = 1;
    } else {
      if (gameMode === 'tutorial') setGameMode('infinite');
      setTutorialStep(4);
      tutorialStepRef.current = 4;
    }
    volumeRef.current = 20;
    timerRef.current = 0;
    difficultyRef.current = 1;
    totalAsteroidsRef.current = 0;
    destroyedAsteroidsRef.current = 0;
    tutorialGreenRef.current = 0;
    tutorialRedRef.current = 0;
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
          timerRef.current += 1;
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

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-between p-4 font-mono transition-colors duration-500 overflow-hidden ${
      mode === 'destroyer' ? 'bg-neutral-950 text-green-500' : 'bg-neutral-900 text-red-500'
    }`}>
      {/* Header */}
      <div className="w-full flex justify-between items-center px-2 md:px-4 pt-2">
        <div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-black tracking-tighter flex items-center gap-1 md:gap-2">
            <Zap className={`w-4 h-4 md:w-6 md:h-6 ${mode === 'destroyer' ? 'fill-green-500' : 'fill-red-500'}`} />
            <span className="hidden sm:inline">{mode === 'destroyer' ? 'Emerald Laser' : 'Ruby Laser'}</span>
            <span className="sm:hidden">{mode === 'destroyer' ? 'EMERALD' : 'RUBY'}</span>
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <p className="text-[6px] md:text-[8px] opacity-70 uppercase tracking-widest hidden xs:block">
              {mode === 'destroyer' ? 'SHOOT EMERALD | AVOID STARS' : 'SHOOT RUBY | RVOLT MODE'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 md:gap-2 items-center">
          {/* Badges Button */}
          <button 
            onClick={() => setShowBadges(true)}
            className="p-1.5 md:p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all border border-white/10"
            title="Badges"
          >
            <Award className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
          </button>

          {/* Help Button */}
          <button 
            onClick={() => {
              setIsStartingFromMenu(false);
              setShowTutorialPrompt(true);
            }}
            className="p-1.5 md:p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all border border-white/10"
            title="Help"
          >
            <HelpCircle className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" />
          </button>

          {/* Game Mode Toggle */}
          {!gameStarted && (
            <div className="flex bg-neutral-800 rounded-lg p-0.5 md:p-1 mr-1 md:mr-4">
              <button 
                onClick={() => setGameMode('infinite')}
                className={`px-2 md:px-3 py-1 rounded-md flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] font-bold transition-all ${
                  gameMode === 'infinite' ? 'bg-neutral-700 text-white shadow-inner' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Infinity className="w-2 h-2 md:w-3 md:h-3" /> <span className="hidden xs:inline">INFINITE</span>
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
                  className={`px-2 md:px-3 py-1 rounded-md flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] font-bold transition-all ${
                    gameMode === 'level' ? 'bg-neutral-700 text-white shadow-inner' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Trophy className="w-2 h-2 md:w-3 md:h-3" /> <span className="hidden xs:inline">LEVEL</span> {currentLevel}
                </button>
                {/* Level Selector Dropdown */}
                {!gameStarted && (
                  <div className={`absolute top-full right-0 md:left-0 mt-2 ${isLevelMenuOpen ? 'grid' : 'hidden'} grid-cols-5 gap-1 bg-neutral-900 p-2 rounded-xl border border-white/10 z-50 w-40 md:w-48 shadow-2xl`}>
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
                          className={`w-7 h-7 md:w-10 md:h-10 rounded-lg flex flex-col items-center justify-center text-[8px] md:text-[10px] font-bold transition-all relative ${
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
                                <Star key={s} className="w-1 md:w-1.5 h-1 md:h-1.5 fill-current" />
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
            <div className="hidden sm:flex items-center gap-2 bg-neutral-800 px-2 py-1 rounded-lg border border-white/10">
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
                className="bg-transparent border-none outline-none text-white text-[10px] font-bold w-16 md:w-20"
                maxLength={20}
              />
            </div>
          )}
          <button 
            onClick={user ? handleLogout : handleLogin}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border-2 text-[8px] md:text-[10px] font-bold transition-all rounded-lg ${
              user ? 'border-white/20 text-white/60 hover:text-white hover:border-white/40' : 'bg-white text-black border-white hover:bg-white/90'
            }`}
          >
            {user ? <LogOut className="w-2 h-2 md:w-3 md:h-3" /> : <LogIn className="w-2 h-2 md:w-3 md:h-3" />}
            <span className="hidden xs:inline">{user ? 'LOGOUT' : 'LOGIN'}</span>
          </button>

          <div className="hidden xs:block w-px h-6 bg-white/10 mx-1 md:mx-2" />

          <div className="hidden md:flex gap-2">
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
          </div>
          {gameStarted && !isGameOver && (
            <button 
              onClick={togglePause}
              className={`p-1 border-2 rounded-full transition-all ${
                mode === 'destroyer' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
              }`}
            >
              {isPaused ? <Play className="w-3 h-3 md:w-4 md:h-4" /> : <Pause className="w-3 h-3 md:w-4 md:h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className="relative flex-1 w-full my-2 group touch-none">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className={`w-full h-full bg-black border-4 rounded-lg md:cursor-none shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-500 object-contain ${
            mode === 'destroyer' ? 'border-neutral-800' : 'border-red-900/50'
          }`}
          onMouseDown={handleShoot}
          onTouchStart={(e) => {
            e.preventDefault();
            handleShoot(e);
          }}
          onMouseMove={handleMouseMove}
        />

        {(!gameStarted || isGameOver) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 p-4 md:p-8 text-center overflow-y-auto">
            {isGameOver && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 md:mb-8"
              >
                <h2 className="text-4xl md:text-7xl font-black mb-2 text-red-600 tracking-tighter italic">
                  {gameMode === 'level' && timerRef.current >= levelTime ? 'LEVEL COMPLETE' : 'GAME OVER'}
                </h2>
                <p className="text-red-500/60 uppercase tracking-widest text-[10px] md:text-sm mb-4">
                  {gameMode === 'level' && timerRef.current >= levelTime ? 'You survived the challenge!' : 'The music has stopped.'}
                </p>

                {gameMode === 'level' && timerRef.current >= levelTime && (
                  <div className="flex flex-col items-center gap-2 md:gap-4 mb-4 md:mb-8 bg-neutral-900/80 p-4 md:p-8 rounded-3xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                    <div className="flex gap-2 md:gap-4">
                      {[...Array(3)].map((_, i) => {
                        const ratio = destroyedAsteroidsRef.current / Math.max(1, totalAsteroidsRef.current);
                        const active = (i === 0 && ratio >= 0.25) || (i === 1 && ratio >= 0.5) || (i === 2 && ratio >= 0.75);
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
                          >
                            <Star className={`w-10 h-10 md:w-16 md:h-16 ${active ? 'fill-yellow-500 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-white/5'}`} />
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">
                        {Math.round((destroyedAsteroidsRef.current / Math.max(1, totalAsteroidsRef.current)) * 100)}% DESTROYED
                      </div>
                      <div className="text-[8px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">
                        {destroyedAsteroidsRef.current} / {totalAsteroidsRef.current} ASTEROIDS
                      </div>
                    </div>
                  </div>
                )}
                
                {gameMode === 'infinite' && (
                  <div className="bg-neutral-900/80 p-4 md:p-6 rounded-2xl border border-white/10 max-w-md mx-auto">
                    <div className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-6 italic">SCORE: {timerRef.current}s</div>
                    
                    {user ? (
                      <div className="flex flex-col gap-3 md:gap-4">
                        <div className="flex items-center gap-2 bg-black/40 p-2 md:p-3 rounded-xl border border-white/10">
                          <User className="w-4 h-4 md:w-5 md:h-5 text-white/40" />
                          <input 
                            type="text" 
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Your Name"
                            className="bg-transparent border-none outline-none text-white w-full font-bold text-sm md:text-base"
                            maxLength={20}
                          />
                        </div>
                        <button 
                          onClick={submitScore}
                          disabled={isSubmitting || !playerName.trim()}
                          className="w-full bg-white text-black py-3 md:py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 text-sm md:text-base"
                        >
                          {isSubmitting ? <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                          SUBMIT SCORE
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleLogin}
                        className="w-full bg-white text-black py-3 md:py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/90 text-sm md:text-base"
                      >
                        <LogIn className="w-4 h-4 md:w-5 md:h-5" /> LOGIN TO SAVE SCORE
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
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
                className={`px-6 md:px-12 py-4 md:py-6 font-black text-xl md:text-3xl rounded-sm transition-colors flex items-center gap-2 md:gap-4 shadow-2xl ${
                  mode === 'destroyer' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-black hover:bg-red-400'
                }`}
              >
                {isGameOver ? <RefreshCw className="w-6 h-6 md:w-10 md:h-10" /> : <Rocket className="w-6 h-6 md:w-10 md:h-10" />}
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
                  className="px-6 md:px-8 py-4 md:py-6 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700 flex items-center gap-2 md:gap-3"
                >
                  MENU
                </motion.button>
              )}

              {gameMode === 'infinite' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLeaderboard(true)}
                  className="px-6 md:px-8 py-4 md:py-6 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700 flex items-center gap-2 md:gap-3"
                >
                  <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" /> LEADERBOARD
                </motion.button>
              )}
            </div>

            <p className={`mt-4 md:mt-6 text-[8px] md:text-[10px] tracking-[0.3em] font-bold animate-pulse ${mode === 'destroyer' ? 'text-green-500/60' : 'text-red-500/60'}`}>
              {isGameOver ? 'SYSTEM CRITICAL ERROR' : 'READY FOR DEPLOYMENT'}
            </p>
          </div>
        ) : isPaused ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm p-4">
            <h2 className="text-4xl md:text-6xl font-black mb-8 italic tracking-tighter">PAUSED</h2>
            <div className="flex flex-col gap-3 md:gap-4 w-full max-w-xs">
              <button 
                onClick={togglePause}
                className={`w-full py-4 md:py-5 font-black text-xl md:text-2xl rounded-sm shadow-xl ${
                  mode === 'destroyer' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'
                }`}
              >
                RESUME
              </button>
              <button 
                onClick={() => startGame()}
                className="w-full py-4 md:py-5 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700"
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
                className="w-full py-4 md:py-5 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700"
              >
                MENU
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Crosshair - Hidden on mobile */}
            <div
              ref={aimerRef}
              className="absolute pointer-events-none z-10 hidden md:flex flex-col items-center gap-2"
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

      {/* Game HUD */}
      {gameStarted && !isGameOver && (
        <GameHUD 
          volumeRef={volumeRef}
          timerRef={timerRef}
          destroyedAsteroidsRef={destroyedAsteroidsRef}
          totalAsteroidsRef={totalAsteroidsRef}
          tutorialGreenRef={tutorialGreenRef}
          tutorialRedRef={tutorialRedRef}
          mode={mode}
          gameMode={gameMode}
          levelTime={levelTime}
          tutorialStep={tutorialStep}
          volumeFlash={volumeFlash}
          isTutorialPaused={isTutorialPaused}
          setIsTutorialPaused={setIsTutorialPaused}
          setGameStarted={setGameStarted}
          audioRef={audioRef}
        />
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

        {/* HUD Elements removed - handled by GameHUD */}
        
        {/* Mobile Controls */}
        {gameStarted && !isGameOver && (
          <div className="md:hidden fixed bottom-20 left-0 right-0 z-40 flex justify-between px-4 pointer-events-none">
            <button 
              onClick={() => setMode('destroyer')}
              className={`w-20 h-20 rounded-full font-black text-base border-4 transition-all active:scale-90 pointer-events-auto flex flex-col items-center justify-center shadow-2xl ${
                mode === 'destroyer' ? 'bg-green-500 text-black border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-neutral-900/90 backdrop-blur-md text-green-500/40 border-neutral-800'
              }`}
            >
              <Zap className={`w-5 h-5 mb-1 ${mode === 'destroyer' ? 'fill-black' : 'fill-green-500/20'}`} />
              EVOLT
            </button>
            <button 
              onClick={() => setMode('creator')}
              className={`w-20 h-20 rounded-full font-black text-base border-4 transition-all active:scale-90 pointer-events-auto flex flex-col items-center justify-center shadow-2xl ${
                mode === 'creator' ? 'bg-red-500 text-black border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-neutral-900/90 backdrop-blur-md text-red-500/40 border-neutral-800'
              }`}
            >
              <Flame className={`w-5 h-5 mb-1 ${mode === 'creator' ? 'fill-black' : 'fill-red-500/20'}`} />
              RVOLT
            </button>
          </div>
        )}
        
        {/* VolumeHUD removed - handled by GameHUD */}
      </div>
  );
}

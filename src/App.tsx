/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Volume2, VolumeX, Volume1, Volume, Rocket, Zap, Pause, Play, Bomb, RefreshCw, Trophy, Clock, Infinity, LogIn, LogOut, User, Send, HelpCircle, Award, Star, Shield, Target, Flame, Crown, Medal, Sparkles, Info, X, Lock, Users, PenTool, Globe, Music, Image } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, doc, setDoc, getDoc, updateDoc, arrayUnion, increment, where, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  { id: 'community_player', name: 'Community Player', description: 'Beat a community level', icon: <Globe className="w-6 h-6" />, color: 'text-blue-400' },
  { id: 'level_creator', name: 'Level Creator', description: 'Create and publish a custom level', icon: <PenTool className="w-6 h-6" />, color: 'text-pink-400' },
  { id: 'signed_in', name: 'Welcome Aboard', description: 'Sign in to your account', icon: <LogIn className="w-6 h-6" />, color: 'text-green-400' },
  { id: 'username_changed', name: 'Identity Crisis', description: 'Change your username', icon: <User className="w-6 h-6" />, color: 'text-purple-400' },
  { id: 'mystery_badge', name: 'Mystery Guest', description: 'Discover the secret', icon: <HelpCircle className="w-6 h-6" />, color: 'text-yellow-400' },
];

interface CustomLevel {
  id?: string;
  name: string;
  creatorId: string;
  creatorName: string;
  rubyCount: number;
  emeraldCount: number;
  starCount: number;
  timeLimit: number;
  songUrl: string;
  backgroundUrl?: string;
  spawnMode?: 'equal' | 'progressive';
  plays?: number;
  createdAt?: number;
}

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
const HeaderHUD = React.memo(({ volumeRef, mode, volumeFlash, destroyedAsteroidsRef, totalAsteroidsRef, gameMode }: { volumeRef: React.MutableRefObject<number>, mode: 'destroyer' | 'creator', volumeFlash: 'hit' | 'miss' | null, destroyedAsteroidsRef: React.MutableRefObject<number>, totalAsteroidsRef: React.MutableRefObject<number>, gameMode: string }) => {
  const [volume, setVolume] = useState(volumeRef.current);
  const [destroyed, setDestroyed] = useState(destroyedAsteroidsRef.current);
  const [total, setTotal] = useState(totalAsteroidsRef.current);

  useEffect(() => {
    const interval = setInterval(() => {
      setVolume(volumeRef.current);
      setDestroyed(destroyedAsteroidsRef.current);
      setTotal(totalAsteroidsRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [volumeRef, destroyedAsteroidsRef, totalAsteroidsRef]);

  const progress = total > 0 ? (destroyed / total) * 100 : 0;

  return (
    <div className={`flex items-center gap-4 bg-neutral-900/90 backdrop-blur-xl px-4 py-2 rounded-xl border-2 transition-all duration-500 shadow-lg ${
      mode === 'destroyer' ? 'border-green-500/20' : 'border-red-500/20'
    } ${volumeFlash === 'hit' ? 'scale-105 border-green-500' : volumeFlash === 'miss' ? 'scale-95 border-red-500' : ''}`}>
      
      {/* Volume Bar */}
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-lg ${mode === 'destroyer' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'}`}>
          {volume <= 0 ? <VolumeX className="w-3 h-3 md:w-4 md:h-4" /> : volume < 30 ? <Volume1 className="w-3 h-3 md:w-4 md:h-4" /> : <Volume2 className="w-3 h-3 md:w-4 md:h-4" />}
        </div>
        <div className="flex flex-col w-20 md:w-24">
          <div className="flex justify-between items-center mb-1">
            <span className="font-black text-[8px] md:text-[10px] tracking-widest uppercase opacity-50">Volume</span>
            <span className="font-black text-xs md:text-sm italic tracking-tighter">
              {Math.round(volume)}<span className="text-[8px] not-italic ml-0.5 opacity-50">%</span>
            </span>
          </div>
          <div className="h-1.5 md:h-2 bg-neutral-950 rounded-full overflow-hidden relative border border-neutral-800">
            <div 
              className={`h-full relative transition-all duration-200 ${mode === 'destroyer' ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${volume}%` }}
            />
          </div>
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
  gameMode: 'infinite' | 'level' | 'tutorial' | 'custom',
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
      {(gameMode === 'level' || gameMode === 'custom') && (
        <div className="absolute top-20 right-4 md:top-24 md:right-8 z-40 flex flex-col items-end gap-2 pointer-events-none">
          <div className="bg-neutral-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 shadow-2xl">
            <div className="p-1.5 bg-cyan-500 rounded-lg text-black">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">Time Remaining</span>
              <span className={`text-xl font-black italic tracking-tighter leading-none ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.max(0, timer)}<span className="text-xs not-italic ml-0.5 opacity-50">S</span>
              </span>
            </div>
          </div>
          <StarHUD totalAsteroids={total} destroyedAsteroids={destroyed} />
        </div>
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
  const [gameMode, setGameMode] = useState<'infinite' | 'level' | 'tutorial' | 'custom'>('infinite');
  const gameModeRef = useRef(gameMode);
  const [customLevelData, setCustomLevelData] = useState<CustomLevel | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [showCompletedBy, setShowCompletedBy] = useState<string | null>(null); // levelId
  const [levelScores, setLevelScores] = useState<any[]>([]);
  const [showLevelEditor, setShowLevelEditor] = useState(false);
  const [communityLevels, setCommunityLevels] = useState<CustomLevel[]>([]);
  const filteredLevels = useMemo(() => {
    if (!communitySearch) return communityLevels;
    const s = communitySearch.toLowerCase();
    return communityLevels.filter(l => 
      l.name.toLowerCase().includes(s) || 
      l.creatorName.toLowerCase().includes(s)
    );
  }, [communityLevels, communitySearch]);
  const [customLevelDraft, setCustomLevelDraft] = useState<Partial<CustomLevel>>({
    name: '', rubyCount: 10, emeraldCount: 10, starCount: 5, timeLimit: 60, songUrl: '', backgroundUrl: '', spawnMode: 'equal'
  });
  const customSpawnPoolRef = useRef<('ruby' | 'emerald' | 'star')[]>([]);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(highScore);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  
  useEffect(() => {
    const handleMenuNav = (e: KeyboardEvent) => {
      if (!(!gameStarted || isGameOver || isPaused)) return;
      
      const buttons = Array.from(document.querySelectorAll('.menu-btn:not([disabled])')) as HTMLButtonElement[];
      if (buttons.length === 0) return;
      
      const currentIndex = buttons.findIndex(b => document.activeElement === b);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % buttons.length : 0;
        buttons[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = currentIndex >= 0 ? (currentIndex - 1 + buttons.length) % buttons.length : buttons.length - 1;
        buttons[nextIndex].focus();
      }
    };
    
    window.addEventListener('keydown', handleMenuNav);
    return () => window.removeEventListener('keydown', handleMenuNav);
  }, [gameStarted, isGameOver, isPaused]);
  
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
  const [customLeaderboard, setCustomLeaderboard] = useState<{id: string, name: string, score: number, levelName: string, levelId: string}[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [isStartingFromMenu, setIsStartingFromMenu] = useState(false);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const qualityRef = useRef(quality);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
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
  const containerRef = useRef<HTMLDivElement>(null);
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
          const completed = data.completedLevels || [];
          setCompletedLevels(completed);
          setUnlockedLevels(data.unlockedLevels || 1);
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
            unlockedLevels: 1,
            levelStars: {},
            redDestroyed: 0,
            highestScore: 0
          });
        }
      } else {
        setPlayerName('');
        setUserBadges([]);
        setCompletedLevels([]);
        setUnlockedLevels(1);
        setLevelStars({});
        setRedDestroyed(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'levels'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const levels: CustomLevel[] = [];
      snapshot.forEach((doc) => {
        levels.push({ id: doc.id, ...doc.data() } as CustomLevel);
      });
      setCommunityLevels(levels);
    }, (error) => {
      console.error("Failed to fetch community levels:", error);
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
    const nextUnlocked = Math.max(unlockedLevels, level + 1);
    setUnlockedLevels(nextUnlocked);
    awardBadge(`level_${level}`);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          completedLevels: nextLevels,
          levelStars: newStars,
          redDestroyed: redDestroyed,
          unlockedLevels: nextUnlocked
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
      setCustomLeaderboard([]);
      return;
    }
    
    // Infinite mode leaderboard
    const q = query(collection(db, 'users'), orderBy('highestScore', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Anonymous',
          score: data.highestScore || 0,
          uid: doc.id
        } as LeaderboardEntry;
      });
      setLeaderboard(entries);
    }, (error) => {
      console.error("Leaderboard listener error:", error);
    });

    // Custom levels leaderboard
    const cq = query(collection(db, 'custom_scores'), orderBy('score', 'desc'), limit(10));
    const unsubscribeCustom = onSnapshot(cq, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.userName || 'Anonymous',
          score: data.score || 0,
          levelName: data.levelName || 'Unknown Level',
          levelId: data.levelId
        };
      });
      setCustomLeaderboard(entries);
    }, (error) => {
      console.error("Custom leaderboard listener error:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeCustom();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && !userBadges.includes('signed_in')) {
        await updateDoc(doc(db, 'users', result.user.uid), {
          badges: arrayUnion('signed_in')
        });
      }
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
      
      if (gameModeRef.current === 'infinite') {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const currentScore = userDoc.data().highestScore || 0;
          if (timerRef.current > currentScore) {
            await updateDoc(userRef, {
              highestScore: timerRef.current,
              name: nameToSave
            });
          } else {
            await updateDoc(userRef, {
              name: nameToSave
            });
          }
        }
      } else if (gameModeRef.current === 'custom' && customLevelData) {
        // Save to custom scores
        const accuracy = Math.round((destroyedAsteroidsRef.current / Math.max(1, totalAsteroidsRef.current)) * 100);
        const completionTime = customLevelData.timeLimit - timerRef.current;
        
        await addDoc(collection(db, 'custom_scores'), {
          levelId: customLevelData.id,
          levelName: customLevelData.name,
          userId: user.uid,
          userName: nameToSave,
          score: destroyedAsteroidsRef.current, // Use accuracy/destroyed for custom levels
          accuracy: accuracy,
          completionTime: completionTime,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Failed to submit score", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteLevel = async (levelId: string) => {
    if (!window.confirm("Are you sure you want to delete this level?")) return;
    try {
      await deleteDoc(doc(db, 'levels', levelId));
      alert("Level deleted successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete level.");
    }
  };

  const editLevel = (level: CustomLevel) => {
    setCustomLevelDraft({
      id: level.id,
      name: level.name,
      rubyCount: level.rubyCount,
      emeraldCount: level.emeraldCount,
      starCount: level.starCount,
      timeLimit: level.timeLimit,
      songUrl: level.songUrl,
      backgroundUrl: level.backgroundUrl,
      spawnMode: level.spawnMode || 'equal'
    });
    setShowLevelEditor(true);
    setShowCommunity(false);
  };

  const fetchLevelScores = async (levelId: string) => {
    const q = query(
      collection(db, 'custom_scores'),
      where('levelId', '==', levelId),
      orderBy('accuracy', 'desc'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    
    onSnapshot(q, (snapshot) => {
      const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLevelScores(scores);
    });
  };

  const triggerFlash = (type: 'hit' | 'miss') => {
    setVolumeFlash(type);
    setTimeout(() => setVolumeFlash(null), 200);
  };

  const handleCommunitySearch = (val: string) => {
    if (val === '3h5svqk') {
      setIsAutoPlayEnabled(!isAutoPlayEnabled);
      setCommunitySearch('');
      alert(isAutoPlayEnabled ? "AI AUTO-PILOT: OFF" : "AI AUTO-PILOT: ON (100% ACCURACY)");
      return;
    }
    setCommunitySearch(val);
  };
  
  const gameRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);

  const startSynthMusic = useCallback(() => {
    if (!musicEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [220, 277.18, 329.63, 440, 329.63, 277.18];
      let step = 0;

      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = window.setInterval(() => {
        if (!musicEnabled || isPausedRef.current || isGameOverRef.current) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = modeRef.current === 'destroyer' ? 'square' : 'sawtooth';
        osc.frequency.value = notes[step % notes.length] * (gameModeRef.current === 'tutorial' ? 1.5 : 1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0.05 * (volumeRef.current / 100), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        
        step++;
      }, 200);
    } catch (e) {
      console.error("Synth music failed", e);
    }
  }, [musicEnabled]);

  const stopSynthMusic = useCallback(() => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, []);

  const playSFX = useCallback((type: 'shoot' | 'explosion' | 'hit' | 'miss') => {
    if (!sfxEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'explosion') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'hit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'miss') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.error("SFX failed", e);
    }
  }, [sfxEnabled]);

  const getSongUrl = useCallback(() => {
    if (gameMode === 'custom' && customLevelData) return customLevelData.songUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
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
  }, [gameStarted, gameMode, currentLevel, customLevelData]);

  const getBackgroundUrl = useCallback(() => {
    if (gameMode === 'custom' && customLevelData?.backgroundUrl) return customLevelData.backgroundUrl;
    return ''; // Default black
  }, [gameMode, customLevelData]);

  // Audio management
  useEffect(() => {
    const url = getSongUrl();
    
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = musicEnabled ? volumeRef.current / 100 : 0;
      
      audio.onerror = () => {
        console.log("Audio failed to load, falling back to synth");
        startSynthMusic();
      };
      
      audio.src = url;
      audioRef.current = audio;
      
      const playOnInteract = () => {
        if (musicEnabled) {
          audio.play().catch(() => startSynthMusic());
        }
        window.removeEventListener('click', playOnInteract);
      };
      window.addEventListener('click', playOnInteract);
    } else {
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
      }
      audioRef.current.volume = musicEnabled ? volumeRef.current / 100 : 0;
      audioRef.current.currentTime = 0;
      if ((gameStarted || gameId > 0) && musicEnabled && !isPaused && !isGameOver) {
        audioRef.current.play().catch(() => startSynthMusic());
      } else {
        audioRef.current.pause();
        stopSynthMusic();
      }
    }
    
    return () => stopSynthMusic();
  }, [getSongUrl, gameId, musicEnabled, isPaused, isGameOver, startSynthMusic, stopSynthMusic]);

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
    } else if (gameModeRef.current === 'custom') {
      if (customSpawnPoolRef.current.length === 0) return undefined;
      const type = customSpawnPoolRef.current.pop()!;
      isBomb = type === 'star';
      isNegative = type === 'ruby';
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
    const speedMultiplier = gameModeRef.current === 'infinite' ? (1 + (difficultyRef.current - 1) * 0.5) : (1 + (currentLevel - 1) * 0.2);
    const speed = (isBomb ? 6 : baseSpeed) * speedMultiplier;

    const vertices: { x: number; y: number }[] = [];
    const sides = 6;
    const baseSize = isBomb ? 50 : 30 + Math.random() * 40;
    const sizeMultiplier = gameModeRef.current === 'infinite' ? (1 + (difficultyRef.current - 1) * 0.2) : 1;
    const finalSize = baseSize * sizeMultiplier;

    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const r = finalSize * (0.8 + Math.random() * 0.4);
      vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    totalAsteroidsRef.current += 1;

    return {
      id: Math.random(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: finalSize * 2,
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
    // Quality adjustment
    const adjustedCount = qualityRef.current === 'low' ? Math.max(1, Math.floor(count / 2)) : count;
    const maxParticles = qualityRef.current === 'low' ? 20 : 40;

    // Performance: Limit total particles
    if (particlesRef.current.length > maxParticles) {
      particlesRef.current = particlesRef.current.slice(-maxParticles);
    }
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    for (let i = 0; i < adjustedCount; i++) {
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

    // AI Cheat Logic
    if (isAutoPlayEnabled) {
      const nextAsteroids = asteroidsRef.current.filter(ast => {
        const isCorrectTarget = modeRef.current === 'destroyer' ? !ast.isNegative : ast.isNegative;
        if (isCorrectTarget && !ast.isBomb) {
          // Auto-destroy
          destroyedAsteroidsRef.current += 1;
          volumeRef.current = Math.min(MAX_VOLUME, volumeRef.current + 2);
          playSFX('explosion');
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, ast.isNegative ? '#ef4444' : '#22c55e', 8);
          triggerFlash('hit');
          return false;
        }
        return true;
      });
      asteroidsRef.current = nextAsteroids;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Spawn new asteroids with difficulty scaling
    const baseInterval = gameModeRef.current === 'tutorial' ? 2000 : 1200;
    const levelInterval = gameModeRef.current === 'level' ? Math.max(500, baseInterval - (currentLevel - 1) * 80) : baseInterval;
    const infiniteInterval = gameModeRef.current === 'infinite' ? Math.max(400, baseInterval - (difficultyRef.current - 1) * 100) : baseInterval;
    let spawnInterval = Math.min(levelInterval, infiniteInterval);
    
    if (gameModeRef.current === 'custom' && customLevelData) {
      const totalItems = (customLevelData.rubyCount || 0) + (customLevelData.emeraldCount || 0) + (customLevelData.starCount || 0);
      const timeLimit = customLevelData.timeLimit || 60;
      // Ensure all items spawn by timeLimit - 2 seconds
      const spawnTimeWindow = Math.max(1, timeLimit - 2);
      const avgInterval = (spawnTimeWindow * 1000) / Math.max(1, totalItems);
      
      if (customLevelData.spawnMode === 'progressive') {
        const progress = 1 - (timerRef.current / timeLimit);
        // Start slow, end fast
        spawnInterval = avgInterval * (2.0 - progress * 1.5);
      } else {
        spawnInterval = avgInterval;
      }
    }
    
    // Quality adjustment: slower spawning for low quality
    if (qualityRef.current === 'low') {
      spawnInterval *= 1.5;
    }
    
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
      const difficultyFromTime = 1 + Math.floor(timerRef.current / 30) * 0.1;
      const difficultyFromKills = 1 + Math.floor(destroyedAsteroidsRef.current / 10) * 0.1;
      const newDifficulty = Math.max(difficultyFromTime, difficultyFromKills);
      difficultyRef.current = newDifficulty;
      if (timerRef.current >= 300) awardBadge('infinite_5');
      if (timerRef.current >= 600) awardBadge('infinite_10');
      if (timerRef.current >= 1500) awardBadge('infinite_25');
    }

    // Level mode completion
    if (gameModeRef.current === 'level' && timerRef.current >= levelTime) {
      setIsGameOver(true);
      isGameOverRef.current = true;
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
        isGameOverRef.current = true;
        if (gameModeRef.current === 'infinite' && user && playerName.trim()) {
          submitScore();
        }
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

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Calculate actual drawing area within the canvas element (due to object-contain)
    const bufferRatio = GAME_WIDTH / GAME_HEIGHT;
    const elementRatio = rect.width / rect.height;
    
    let drawWidth, drawHeight, drawLeft, drawTop;
    if (elementRatio > bufferRatio) {
      drawHeight = rect.height;
      drawWidth = drawHeight * bufferRatio;
      drawLeft = rect.left + (rect.width - drawWidth) / 2;
      drawTop = rect.top;
    } else {
      drawWidth = rect.width;
      drawHeight = drawWidth / bufferRatio;
      drawLeft = rect.left;
      drawTop = rect.top + (rect.height - drawHeight) / 2;
    }

    const x = (clientX - drawLeft) * (GAME_WIDTH / drawWidth);
    const y = (clientY - drawTop) * (GAME_HEIGHT / drawHeight);

    playSFX('shoot');

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
          playSFX('explosion');
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
          playSFX('explosion');
          explosionsRef.current.push({ id: Math.random(), x: ast.x, y: ast.y, life: 1 });
          createParticles(ast.x, ast.y, ast.isNegative ? '#ef4444' : '#22c55e', 8);
          return false;
        } else {
          hitWrongColor = true;
          volumeRef.current = Math.max(0, volumeRef.current - 5);
          playSFX('explosion');
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
          playSFX('miss');
          triggerFlash('miss');
        } else {
          volumeRef.current = 0;
          setIsGameOver(true);
          isGameOverRef.current = true;
          if (gameModeRef.current === 'infinite' && user && playerName.trim()) {
            submitScore();
          }
          if (audioRef.current) audioRef.current.pause();
          playSFX('miss');
          triggerFlash('miss');
        }
      } else {
        const gain = modeRef.current === 'creator' ? 10 : 8;
        volumeRef.current = Math.min(MAX_VOLUME, volumeRef.current + gain);
        if (volumeRef.current >= 100) awardBadge('volume_max');
        playSFX('hit');
        triggerFlash('hit');
      }
    } else {
      // Miss or wrong color
      const penalty = hitWrongColor ? 15 : 10;
      volumeRef.current = Math.max(0, volumeRef.current - penalty);
      playSFX('miss');
      triggerFlash('miss');
    }
  }, [createParticles, awardBadge, playSFX]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!aimerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    aimerRef.current.style.left = `${clientX}px`;
    aimerRef.current.style.top = `${clientY}px`;
  }, []);

  const startGame = () => {
    console.log('startGame called:', { gameMode });
    setGameId(prev => prev + 1);
    setGameStarted(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsTutorialPaused(false);
    isTutorialPausedRef.current = false;
    
    if (gameMode === 'tutorial' as any) {
      setGameMode('infinite');
      setTutorialStep(4);
      tutorialStepRef.current = 4;
    }
    
    volumeRef.current = gameMode === 'custom' ? 100 : 20;
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

    if (gameMode === 'custom' && customLevelData) {
      const pool: ('ruby' | 'emerald' | 'star')[] = [];
      for (let i=0; i<(customLevelData.rubyCount || 0); i++) pool.push('ruby');
      for (let i=0; i<(customLevelData.emeraldCount || 0); i++) pool.push('emerald');
      for (let i=0; i<(customLevelData.starCount || 0); i++) pool.push('star');
      pool.sort(() => Math.random() - 0.5);
      customSpawnPoolRef.current = pool;
      timerRef.current = customLevelData.timeLimit || 60;
    }
    gameModeRef.current = gameMode;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const skipTutorial = () => {
    if (gameMode === 'tutorial' as any) {
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
          if (gameModeRef.current === 'custom') {
            timerRef.current -= 1;
            if (timerRef.current <= 0) {
              setIsGameOver(true);
              isGameOverRef.current = true;
            }
          } else {
            timerRef.current += 1;
          }
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

  const [leaderboardTab, setLeaderboardTab] = useState<'infinite' | 'custom'>('infinite');

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-between p-4 font-mono transition-colors duration-500 overflow-hidden select-none ${
        mode === 'destroyer' ? 'bg-neutral-950 text-green-500' : 'bg-neutral-900 text-red-500'
      } ${gameStarted ? 'md:cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
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

        <div className="flex gap-2 items-center">
          {/* Top Bar Icons */}
          <button 
            onClick={() => setShowBadges(true)}
            className="p-2 bg-neutral-800/50 hover:bg-neutral-700 rounded-full transition-all border border-white/10"
            title="Badges"
          >
            <Award className="w-5 h-5 text-yellow-500" />
          </button>
          
          {!gameStarted && (
            <button 
              onClick={() => {
                setGameMode('tutorial');
                startGame();
              }}
              className="p-2 bg-neutral-800/50 hover:bg-neutral-700 rounded-full transition-all border border-white/10"
              title="Training / Tutorial"
            >
              <Info className="w-5 h-5 text-cyan-500" />
            </button>
          )}

          <button 
            onClick={user ? handleLogout : handleLogin}
            className="p-2 bg-neutral-800/50 hover:bg-neutral-700 rounded-full transition-all border border-white/10"
            title={user ? "Sign Out" : "Sign In"}
          >
            {user ? <LogOut className="w-5 h-5 text-red-500" /> : <LogIn className="w-5 h-5 text-emerald-500" />}
          </button>

          {user && (
            <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-full border border-white/10">
              <User className="w-5 h-5 text-white/40" />
              <span className="text-sm font-bold text-white truncate max-w-[100px]">{playerName || 'Player'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef}
        className={`relative w-full max-w-4xl aspect-[1.5/1] my-4 group touch-none border-4 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-500 overflow-hidden ${
          mode === 'destroyer' ? 'border-neutral-800' : 'border-red-900/50'
        }`}
      >
        {getBackgroundUrl() && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getBackgroundUrl()})` }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className={`w-full h-full rounded-sm relative z-10 ${getBackgroundUrl() ? 'bg-transparent' : 'bg-black'}`}
          onMouseDown={handleShoot}
          onTouchStart={(e) => {
            e.preventDefault();
            handleShoot(e);
            handleMouseMove(e); // Update crosshair on initial touch
          }}
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
                  {(gameMode === 'level' && timerRef.current >= levelTime) || (gameMode === 'custom' && timerRef.current <= 0) ? 'LEVEL COMPLETE' : 'GAME OVER'}
                </h2>
                <p className="text-red-500/60 uppercase tracking-widest text-[10px] md:text-sm mb-4">
                  {(gameMode === 'level' && timerRef.current >= levelTime) || (gameMode === 'custom' && timerRef.current <= 0) ? 'You survived the challenge!' : 'The music has stopped.'}
                </p>

                {((gameMode === 'level' && timerRef.current >= levelTime) || (gameMode === 'custom' && timerRef.current <= 0)) && (
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
                            placeholder="Your Name"
                            className="bg-transparent border-none outline-none text-white w-full font-bold text-sm md:text-base"
                            maxLength={20}
                          />
                        </div>
                        <p className="text-[10px] text-white/40 font-bold uppercase text-center">Score saved automatically</p>
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

                {gameMode === 'custom' && customLevelData && timerRef.current <= 0 && (
                  <div className="bg-neutral-900/80 p-4 md:p-6 rounded-2xl border border-white/10 max-w-md mx-auto mt-4">
                    {(() => {
                      const ratio = destroyedAsteroidsRef.current / Math.max(1, totalAsteroidsRef.current);
                      let stars = 0;
                      if (ratio >= 0.75) stars = 3;
                      else if (ratio >= 0.50) stars = 2;
                      else if (ratio >= 0.25) stars = 1;
                      
                      const isCreator = user && user.uid === customLevelData.creatorId;
                      const canUpload = isCreator && stars === 3;

                      return (
                        <div className="flex flex-col gap-4">
                          <div className="text-center">
                            <div className="text-xl font-black text-white italic">CUSTOM LEVEL</div>
                            <div className="text-sm text-white/50 font-bold uppercase">{customLevelData.name}</div>
                          </div>
                          
                          {canUpload ? (
                            <button 
                              onClick={async () => {
                                try {
                                  await setDoc(doc(db, 'levels', customLevelData.id), customLevelData);
                                  awardBadge('level_creator');
                                  alert('Level uploaded successfully!');
                                } catch (e) {
                                  console.error(e);
                                  alert('Failed to upload level.');
                                }
                              }}
                              className="w-full bg-cyan-500 text-black py-3 md:py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-cyan-400 text-sm md:text-base"
                            >
                              <Globe className="w-4 h-4 md:w-5 md:h-5" /> UPLOAD LEVEL
                            </button>
                          ) : isCreator ? (
                            <div className="text-center text-red-500 font-bold text-xs uppercase">
                              You need 3 stars to upload this level.
                            </div>
                          ) : null}
                          {!isCreator && user && (
                            <button 
                              onClick={async () => {
                                awardBadge('community_player');
                                try {
                                  await updateDoc(doc(db, 'levels', customLevelData.id), {
                                    plays: increment(1)
                                  });
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="w-full bg-emerald-500 text-black py-3 md:py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-400 text-sm md:text-base"
                            >
                              <Star className="w-4 h-4 md:w-5 md:h-5" /> RATE LEVEL
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex flex-col gap-4 md:gap-6 w-full max-w-md">
              {!isGameOver ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setGameMode('infinite');
                      startGame();
                    }}
                    className={`menu-btn w-full py-4 md:py-5 font-black text-xl md:text-2xl rounded-sm transition-colors flex items-center justify-center gap-3 shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/50 ${
                      mode === 'destroyer' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-black hover:bg-red-400'
                    }`}
                  >
                    <Rocket className="w-8 h-8 md:w-10 md:h-10" />
                    INFINITE MODE
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowLevelSelector(true);
                    }}
                    className="menu-btn w-full py-3 md:py-4 bg-neutral-800 text-white font-black text-lg md:text-2xl rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-4 focus:ring-white/50"
                  >
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
                    LEVELS MODE
                  </motion.button>

                  <div className="flex gap-4 w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!user) {
                          alert("Please sign in to create levels.");
                          return;
                        }
                        setCustomLevelDraft({
                          name: '', rubyCount: 10, emeraldCount: 10, starCount: 5, timeLimit: 60, songUrl: '', backgroundUrl: '', spawnMode: 'equal'
                        });
                        setShowLevelEditor(true);
                      }}
                      className="menu-btn flex-1 py-4 md:py-5 bg-neutral-800 text-white font-black text-sm md:text-lg rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-4 focus:ring-white/50"
                    >
                      <PenTool className="w-5 h-5 md:w-6 md:h-6 text-cyan-500" />
                      CREATE LEVEL
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCommunity(true)}
                      className="menu-btn flex-1 py-4 md:py-5 bg-neutral-800 text-white font-black text-sm md:text-lg rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-4 focus:ring-white/50"
                    >
                      <Globe className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                      COMMUNITY
                    </motion.button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLeaderboard(true)}
                    className="menu-btn w-full py-3 md:py-4 bg-neutral-800 text-white font-black text-lg md:text-2xl rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-4 focus:ring-white/50"
                  >
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
                    LEADERBOARDS
                  </motion.button>
                  
                  <div className="flex gap-4 w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      className={`menu-btn flex-1 py-3 font-black text-xs md:text-sm rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                        musicEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                      }`}
                    >
                      MUSIC: {musicEnabled ? 'ON' : 'OFF'}
                    </motion.button>
                    <button 
                      onClick={() => setSfxEnabled(!sfxEnabled)}
                      className={`menu-btn flex-1 py-3 font-black text-xs md:text-sm rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                        sfxEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                      }`}
                    >
                      SFX: {sfxEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  
                  {user && (
                    <div className="w-full flex items-center gap-2 bg-neutral-800/50 p-3 rounded-xl border border-white/10">
                      <User className="w-5 h-5 text-white/40" />
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
                              if (!userBadges.includes('username_changed')) {
                                await updateDoc(doc(db, 'users', user.uid), {
                                  badges: arrayUnion('username_changed')
                                });
                                setUserBadges(prev => [...prev, 'username_changed']);
                              }
                            } catch (error) {
                              console.error("Failed to update username", error);
                            }
                          }
                        }}
                        placeholder="Your Username"
                        className="bg-transparent border-none outline-none text-white w-full font-bold text-sm md:text-base"
                        maxLength={20}
                      />
                    </div>
                  )}
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startGame()}
                  className={`menu-btn w-full py-6 md:py-8 font-black text-2xl md:text-4xl rounded-sm transition-colors flex items-center justify-center gap-4 shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/50 ${
                    mode === 'destroyer' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-black hover:bg-red-400'
                  }`}
                >
                  <RefreshCw className="w-10 h-10 md:w-14 md:h-14" />
                  RESTART
                </motion.button>
              )}
              
              {isGameOver && (
                <>
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
                    className="menu-btn w-full py-4 md:py-5 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 md:gap-3 focus:outline-none focus:ring-4 focus:ring-white/50"
                  >
                    MENU
                  </motion.button>
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      className={`menu-btn flex-1 py-4 font-black text-sm md:text-base rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                        musicEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                      }`}
                    >
                      MUSIC: {musicEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button 
                      onClick={() => setSfxEnabled(!sfxEnabled)}
                      className={`menu-btn flex-1 py-4 font-black text-sm md:text-base rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                        sfxEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                      }`}
                    >
                      SFX: {sfxEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </>
              )}

              {!isGameOver && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLeaderboard(true)}
                  className="menu-btn w-full py-4 md:py-5 bg-neutral-800 text-white font-black text-lg md:text-xl rounded-sm hover:bg-neutral-700 flex items-center justify-center gap-2 md:gap-3 focus:outline-none focus:ring-4 focus:ring-white/50"
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
            <h2 className="text-3xl md:text-5xl font-black mb-6 italic tracking-tighter">PAUSED</h2>
            <div className="flex flex-col gap-2 md:gap-3 w-full max-w-xs">
              <button 
                onClick={togglePause}
                className={`menu-btn w-full py-2 md:py-3 font-black text-base md:text-lg rounded-sm shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 ${
                  mode === 'destroyer' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'
                }`}
              >
                RESUME
              </button>
              <button 
                onClick={() => startGame()}
                className="menu-btn w-full py-2 md:py-3 bg-neutral-800 text-white font-black text-sm md:text-base rounded-sm hover:bg-neutral-700 focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                RESTART
              </button>
              <button 
                onClick={() => setQuality(prev => prev === 'high' ? 'low' : 'high')}
                className={`menu-btn w-full py-2 md:py-3 font-black text-sm md:text-base rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                  quality === 'high' 
                    ? 'bg-neutral-900 text-white border-white/20' 
                    : 'bg-yellow-500 text-black border-yellow-400'
                }`}
              >
                QUALITY: {quality.toUpperCase()}
              </button>
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`menu-btn flex-1 py-2 md:py-3 font-black text-xs md:text-sm rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                    musicEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                  }`}
                >
                  MUSIC: {musicEnabled ? 'ON' : 'OFF'}
                </button>
                <button 
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className={`menu-btn flex-1 py-2 md:py-3 font-black text-xs md:text-sm rounded-sm border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                    sfxEnabled ? 'bg-neutral-800 text-white border-white/20' : 'bg-red-900/50 text-red-500 border-red-500/50'
                  }`}
                >
                  SFX: {sfxEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
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
                className="menu-btn w-full py-2 md:py-3 bg-neutral-800 text-white font-black text-sm md:text-base rounded-sm hover:bg-neutral-700 focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                MENU
              </button>
            </div>
          </div>
        ) : null}

        {/* Crosshair - Hidden on mobile */}
        {gameStarted && (
          <div
            ref={aimerRef}
            className="fixed pointer-events-none z-[9999] hidden md:block"
            style={{ left: -100, top: -100 }}
          >
            <div className="relative flex flex-col items-center" style={{ transform: 'translate(-50%, -50%)' }}>
              <Crosshair className={`w-16 h-16 opacity-80 ${mode === 'destroyer' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
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

        {/* Modals removed to simplify flow */}

        {/* Level Selector Modal */}
        <AnimatePresence>
          {showLevelSelector && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-900 border-2 border-white/20 p-6 md:p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black italic tracking-tighter">SELECT LEVEL</h2>
              <button onClick={() => setShowLevelSelector(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 overflow-y-auto pr-2 pb-4">
              {[...Array(20)].map((_, i) => {
                const levelNum = i + 1;
                const isLocked = levelNum > unlockedLevels;
                return (
                  <button
                    key={levelNum}
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      setGameMode('level');
                      setGameId(levelNum);
                      setCurrentLevel(levelNum);
                      setShowLevelSelector(false);
                      startGame();
                    }}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-white/50 ${
                      isLocked ? 'bg-neutral-900 border-white/5 opacity-50 cursor-not-allowed' :
                      levelNum % 5 === 0 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/30 hover:scale-105' : 'bg-neutral-800 border-white/10 hover:bg-neutral-700 hover:border-white/30 hover:scale-105'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-8 h-8 md:w-10 md:h-10 text-white/20" />
                    ) : (
                      <>
                        <span className="text-2xl md:text-3xl font-black">{levelNum}</span>
                        {levelNum % 5 === 0 && <Star className="w-3 h-3 md:w-4 md:h-4 mt-1" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

        {/* Level Editor Modal */}
        <AnimatePresence>
          {showLevelEditor && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border-2 border-white/20 p-6 md:p-8 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                    <PenTool className="text-cyan-500" /> LEVEL EDITOR
                  </h2>
                  <button onClick={() => setShowLevelEditor(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {!user ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-white/40 mb-6 font-bold">LOGIN TO CREATE AND UPLOAD LEVELS</p>
                    <button 
                      onClick={handleLogin}
                      className="bg-white text-black px-8 py-4 rounded-xl font-black hover:bg-white/90"
                    >
                      LOGIN WITH GOOGLE
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Level Name</label>
                      <input 
                        type="text" 
                        value={customLevelDraft.name || ''}
                        onChange={e => setCustomLevelDraft(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="My Awesome Level"
                        maxLength={30}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest text-red-500">Ruby Count</label>
                        <input 
                          type="number" 
                          value={customLevelDraft.rubyCount || 0}
                          onChange={e => setCustomLevelDraft(prev => ({ ...prev, rubyCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-red-500 transition-colors"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest text-emerald-500">Emerald Count</label>
                        <input 
                          type="number" 
                          value={customLevelDraft.emeraldCount || 0}
                          onChange={e => setCustomLevelDraft(prev => ({ ...prev, emeraldCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest text-yellow-500">Star Count</label>
                        <input 
                          type="number" 
                          value={customLevelDraft.starCount || 0}
                          onChange={e => setCustomLevelDraft(prev => ({ ...prev, starCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest text-cyan-500">Time Limit (s)</label>
                        <input 
                          type="number" 
                          value={customLevelDraft.timeLimit || 60}
                          onChange={e => setCustomLevelDraft(prev => ({ ...prev, timeLimit: Math.max(10, parseInt(e.target.value) || 60) }))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors"
                          min="10"
                          max="300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest text-purple-500">Spawn Mode</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCustomLevelDraft(prev => ({ ...prev, spawnMode: 'equal' }))}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${customLevelDraft.spawnMode === 'equal' ? 'bg-purple-500 text-white' : 'bg-white/5 border border-white/10 text-white/40'}`}
                          >
                            EQUAL
                          </button>
                          <button 
                            onClick={() => setCustomLevelDraft(prev => ({ ...prev, spawnMode: 'progressive' }))}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${customLevelDraft.spawnMode === 'progressive' ? 'bg-purple-500 text-white' : 'bg-white/5 border border-white/10 text-white/40'}`}
                          >
                            PROGRESSIVE
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest flex items-center gap-2"><Music className="w-4 h-4"/> Custom Song URL (Optional)</label>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            value={customLevelDraft.songUrl || ''}
                            onChange={e => {
                              setCustomLevelDraft(prev => ({ ...prev, songUrl: e.target.value }));
                            }}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                            placeholder="https://example.com/song.mp3"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'audio/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    setCustomLevelDraft(prev => ({ ...prev, songUrl: url }));
                                  }
                                };
                                input.click();
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Send className="w-3 h-3" /> FROM FILES
                            </button>
                            <button 
                              onClick={() => {
                                window.open('https://www.google.com/search?q=royalty+free+game+music+mp3+direct+link', '_blank');
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Globe className="w-3 h-3" /> SEARCH GOOGLE
                            </button>
                            <button 
                              onClick={() => {
                                window.open('https://drive.google.com', '_blank');
                                alert('Upload your music to Google Drive, right-click -> Share -> Anyone with link, then copy the link and use a direct link generator to paste it here.');
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Music className="w-3 h-3" /> GOOGLE DRIVE
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest flex items-center gap-2"><Image className="w-4 h-4"/> Custom Background URL (Optional)</label>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            value={customLevelDraft.backgroundUrl || ''}
                            onChange={e => {
                              setCustomLevelDraft(prev => ({ ...prev, backgroundUrl: e.target.value }));
                            }}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                            placeholder="https://example.com/background.jpg"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    setCustomLevelDraft(prev => ({ ...prev, backgroundUrl: url }));
                                  }
                                };
                                input.click();
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Send className="w-3 h-3" /> FROM FILES
                            </button>
                            <button 
                              onClick={() => {
                                window.open('https://www.google.com/search?q=space+background+wallpaper+4k+direct+link', '_blank');
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Globe className="w-3 h-3" /> SEARCH GOOGLE
                            </button>
                            <button 
                              onClick={() => {
                                window.open('https://drive.google.com', '_blank');
                                alert('Upload your image to Google Drive, right-click -> Share -> Anyone with link, then copy the link and use a direct link generator to paste it here.');
                              }}
                              className="flex-1 bg-neutral-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Image className="w-3 h-3" /> GOOGLE DRIVE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        if (!customLevelDraft.timeLimit) return alert("Please set a time limit first.");
                        const prompt = `Distribute ${customLevelDraft.rubyCount || 0} rubies, ${customLevelDraft.emeraldCount || 0} emeralds, and ${customLevelDraft.starCount || 0} stars over ${customLevelDraft.timeLimit} seconds using a ${customLevelDraft.spawnMode || 'equal'} distribution mode. ALL items MUST be spawned by second ${Math.max(1, customLevelDraft.timeLimit - 2)} to allow a 2-second buffer at the end. Return the result as JSON with fields: rubyCount, emeraldCount, starCount.`;
                        const response = await ai.models.generateContent({
                          model: "gemini-3-flash-preview",
                          contents: prompt,
                          config: { responseMimeType: "application/json" }
                        });
                        const data = JSON.parse(response.text);
                        setCustomLevelDraft(prev => ({ ...prev, ...data }));
                      }}
                      className="w-full bg-purple-500 text-white font-black py-2 rounded-xl hover:bg-purple-400 transition-colors"
                    >
                      AI DISTRIBUTE ITEMS
                    </button>

                    <div className="pt-4 flex gap-4">
                      <button 
                        onClick={() => {
                          if (!customLevelDraft.name) return alert("Please enter a level name.");
                          const newLevel: CustomLevel = {
                            id: customLevelDraft.id || Date.now().toString(),
                            name: customLevelDraft.name,
                            creatorId: user.uid,
                            creatorName: playerName || 'Anonymous',
                            rubyCount: customLevelDraft.rubyCount || 0,
                            emeraldCount: customLevelDraft.emeraldCount || 0,
                            starCount: customLevelDraft.starCount || 0,
                            timeLimit: customLevelDraft.timeLimit || 60,
                            songUrl: customLevelDraft.songUrl || '',
                            backgroundUrl: customLevelDraft.backgroundUrl || '',
                            spawnMode: customLevelDraft.spawnMode || 'equal',
                            plays: 0,
                            createdAt: Date.now()
                          };
                          setCustomLevelData(newLevel);
                          setGameMode('custom');
                          setShowLevelEditor(false);
                          startGame();
                        }}
                        className="flex-1 bg-cyan-500 text-black font-black py-4 rounded-xl hover:bg-cyan-400 transition-colors"
                      >
                        TEST LEVEL
                      </button>
                    </div>
                    <p className="text-[10px] text-white/40 text-center uppercase font-bold">You must beat your level with 3 stars to upload it.</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Community Levels Modal */}
        <AnimatePresence>
          {showCommunity && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border-2 border-white/20 p-6 md:p-8 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                    <Globe className="text-emerald-500" /> COMMUNITY LEVELS
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="SEARCH LEVELS..." 
                        value={communitySearch}
                        onChange={(e) => handleCommunitySearch(e.target.value)}
                        className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500/50 w-48 md:w-64"
                      />
                    </div>
                    <button onClick={() => setShowCommunity(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {filteredLevels.length === 0 ? (
                    <div className="text-center py-12 text-white/40 font-bold uppercase tracking-widest">
                      {communitySearch ? "No levels match your search." : "No community levels found. Be the first to create one!"}
                    </div>
                  ) : (
                    filteredLevels.map(level => (
                      <div key={level.id} className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/30 transition-colors">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-white">{level.name}</h3>
                          <p className="text-xs text-white/50 font-bold uppercase tracking-widest">By {level.creatorName} • {level.plays} Plays</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold text-white/70">
                            <span className="text-red-400">{level.rubyCount} Rubies</span>
                            <span className="text-emerald-400">{level.emeraldCount} Emeralds</span>
                            <span className="text-yellow-400">{level.starCount} Stars</span>
                            <span className="text-cyan-400">{level.timeLimit}s</span>
                          </div>
                          <button 
                            onClick={() => {
                              setShowCompletedBy(level.id!);
                              fetchLevelScores(level.id!);
                            }}
                            className="mt-3 text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest flex items-center gap-1"
                          >
                            <Users className="w-3 h-3" /> COMPLETED BY...
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {user && user.uid === level.creatorId && (
                            <>
                              <button 
                                onClick={() => editLevel(level)}
                                className="p-3 bg-neutral-800 text-cyan-500 rounded-xl hover:bg-neutral-700 transition-colors"
                                title="Edit Level"
                              >
                                <PenTool className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => deleteLevel(level.id!)}
                                className="p-3 bg-neutral-800 text-red-500 rounded-xl hover:bg-neutral-700 transition-colors"
                                title="Delete Level"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => {
                              if (!user) {
                                alert("Please sign in to play community levels.");
                                return;
                              }
                              setCustomLevelData(level);
                              setGameMode('custom');
                              setShowCommunity(false);
                              startGame();
                            }}
                            className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black hover:bg-emerald-400 transition-colors"
                          >
                            PLAY
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed By Sub-Modal */}
        <AnimatePresence>
          {showCompletedBy && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border-2 border-emerald-500/30 p-6 md:p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-3">
                    <Users className="text-emerald-500" /> COMPLETED BY
                  </h2>
                  <button onClick={() => setShowCompletedBy(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {levelScores.length === 0 ? (
                    <div className="text-center py-12 text-white/40 font-bold uppercase tracking-widest">
                      No completions yet. Be the first!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 text-[10px] font-black text-white/30 uppercase tracking-widest px-4 mb-2">
                        <span>Rank / Player</span>
                        <span className="text-center">Accuracy</span>
                        <span className="text-center">Time</span>
                        <span className="text-right">Date</span>
                      </div>
                      {levelScores.map((score, index) => (
                        <div key={score.id} className="grid grid-cols-4 items-center bg-black/40 border border-white/5 p-3 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-500 font-black italic">#{index + 1}</span>
                            <span className="text-sm font-bold text-white truncate">{score.userName}</span>
                          </div>
                          <div className="text-center text-sm font-black text-cyan-400">{score.accuracy || 0}%</div>
                          <div className="text-center text-sm font-black text-white/70">{score.completionTime ? `${Math.round(score.completionTime)}s` : '-'}</div>
                          <div className="text-right text-[10px] font-bold text-white/30">
                            {score.timestamp?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <div className="flex flex-col">
                    <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
                      <Trophy className="w-10 h-10 text-yellow-500" /> LEADERBOARDS
                    </h3>
                    <div className="flex gap-4 mt-4">
                      <button 
                        onClick={() => setLeaderboardTab('infinite')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${leaderboardTab === 'infinite' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-white/40'}`}
                      >
                        Infinite Mode
                      </button>
                      <button 
                        onClick={() => setLeaderboardTab('custom')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${leaderboardTab === 'custom' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-white/40'}`}
                      >
                        Custom Levels
                      </button>
                    </div>
                  </div>
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
                  ) : leaderboardTab === 'infinite' ? (
                    leaderboard.length === 0 ? (
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
                    )
                  ) : (
                    customLeaderboard.length === 0 ? (
                      <div className="text-center py-12 text-white/40 font-bold">NO CUSTOM SCORES YET.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {customLeaderboard.map((entry, i) => (
                          <div 
                            key={entry.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              entry.id === user?.uid ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-6">
                              <span className={`text-2xl font-black italic w-8 ${
                                i === 0 ? 'text-yellow-500' : i === 1 ? 'text-neutral-400' : i === 2 ? 'text-amber-700' : 'text-white/20'
                              }`}>
                                #{i + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xl font-bold">{entry.name}</span>
                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{entry.levelName}</span>
                              </div>
                            </div>
                            <div className="text-2xl font-black italic text-white/80">{entry.score} <span className="text-xs not-italic opacity-50">PTS</span></div>
                          </div>
                        ))}
                      </div>
                    )
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

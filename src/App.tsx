import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, User, Award, Send, Image as ImageIcon, Sparkles, Flame, Brain, BookOpen, Microscope, History as HistoryIcon, Plus, Check, Volume2, Gamepad2, ChevronRight, Edit2, Trash2, Save, X, Search, Lightbulb, CheckCircle2, Clock, Mic } from 'lucide-react';
import { UserProgress, Message, INITIAL_PROGRESS, getLevelInfo, BADGES, Subject, Badge } from './types';
import { getTinyThinkersResponse, parseSessionSummary, getTinyThinkersVoice, getTeenExplorerResponse, getTeenTutorResponse, getTeenPlanReview } from './services/geminiService';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
});

// --- Components ---

const Mermaid = ({ chart, isTeen }: { chart: string, isTeen: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.innerHTML = `<div class="mermaid">${chart}</div>`;
      mermaid.contentLoaded();
    }
  }, [chart]);

  return <div ref={ref} className={`w-full overflow-x-auto p-4 rounded-2xl border-2 my-4 ${isTeen ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-100'}`} />;
};

const AgeGate = ({ onComplete }: { onComplete: (name: string, age: number) => void }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ y: 20, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Brain className="text-zinc-600" size={40} />
          </div>
          <h2 className="text-3xl font-black text-zinc-800">Welcome!</h2>
          <p className="text-zinc-500 font-medium">Let's set up your learning space.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-400 uppercase ml-2">Your Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 font-bold focus:border-zinc-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-zinc-400 uppercase ml-2">Your Age</label>
            <input 
              type="number" 
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 14"
              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 font-bold focus:border-zinc-500 outline-none transition-all"
            />
          </div>
        </div>

        <button 
          onClick={() => name && age && onComplete(name, parseInt(age))}
          disabled={!name || !age}
          className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg shadow-lg shadow-zinc-200 hover:bg-zinc-900 disabled:opacity-50 transition-all active:scale-95"
        >
          Start Learning
        </button>
      </motion.div>
    </motion.div>
  );
};

interface Slide {
  title: string;
  content: string;
  options?: string[];
}

const SlideViewer = ({ text, onOptionClick }: { text: string, onOptionClick?: (opt: string) => void }) => {
  const slideRegex = /\[SLIDE (\d+)\]\nTitle: (.*?)\nContent: (.*?)(?:\nOptions: (.*?))?(?=\n\[SLIDE|$)/gs;
  const slides: Slide[] = [];
  let match;

  while ((match = slideRegex.exec(text)) !== null) {
    slides.push({
      title: match[2].trim(),
      content: match[3].trim(),
      options: match[4] ? match[4].split(',').map(o => o.trim()) : undefined
    });
  }

  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async (slideText: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const base64Audio = await getTinyThinkersVoice(slideText);
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Int16Array(len / 2);
        for (let i = 0; i < len; i += 2) {
          bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = audioContext.createBuffer(1, bytes.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < bytes.length; i++) {
          channelData[i] = bytes[i] / 32768;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      }
    } catch (e) {
      console.error("Speech error", e);
      setIsSpeaking(false);
    }
  };

  if (slides.length === 0) return (
    <div className="space-y-2">
      <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{text}</p>
      <button 
        onClick={() => handleSpeak(text)}
        className="p-2 bg-emerald-100 rounded-full text-emerald-600 hover:bg-emerald-200 transition-colors"
      >
        <Volume2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {text.split(/\[SLIDE \d+\]/)[0].trim() && (
         <p className="text-xs font-bold text-gray-400 italic text-center px-4">{text.split(/\[SLIDE \d+\]/)[0].trim()}</p>
      )}
      
      {slides.map((slide, index) => (
        <motion.div 
          key={index}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl p-6 border-4 border-yellow-300 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-yellow-300" />
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Card {index + 1} / {slides.length}</span>
            <button 
              onClick={() => handleSpeak(`${slide.title}. ${slide.content}`)}
              className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
            >
              <Volume2 size={18} />
            </button>
          </div>

          <h4 className="text-xl font-black text-emerald-600 mb-3 leading-tight">{slide.title}</h4>
          <p className="text-md font-bold text-gray-700 mb-6 leading-relaxed">{slide.content}</p>
          
          {slide.options && (
            <div className="grid grid-cols-1 gap-3">
              {slide.options.map((opt, i) => (
                <motion.button 
                  key={i} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onOptionClick?.(opt)}
                  className="text-left p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-100 text-sm font-black text-emerald-700 hover:border-emerald-300 transition-all shadow-sm"
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

const ProgressBar = ({ value, color, label }: { value: number, color: string, label: string }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs font-bold mb-1 text-gray-600">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        className={`h-full ${color}`}
      />
    </div>
  </div>
);

interface BadgeItemProps {
  badge: Badge;
  unlocked: boolean;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge, unlocked }) => (
  <div className={`flex flex-col items-center p-3 rounded-2xl transition-all relative ${unlocked ? 'bg-white shadow-sm border-2 border-yellow-200' : 'bg-gray-100 opacity-50 grayscale'}`}>
    <span className="text-3xl mb-1">{badge.icon}</span>
    <span className="text-[10px] font-extrabold text-center leading-tight">{badge.name}</span>
    {unlocked && (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5"
      >
        <Check size={10} className="text-white" strokeWidth={4} />
      </motion.div>
    )}
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'badges' | 'settings' | 'explorer' | 'tutor'>('chat');
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('zippi_progress');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { 
        ...INITIAL_PROGRESS, 
        ...parsed,
        timetable: parsed.timetable || [],
        language: parsed.language || 'English',
        syllabus: parsed.syllabus || '',
      };
    }
    return INITIAL_PROGRESS;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(progress.name);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [explorerTopic, setExplorerTopic] = useState('');
  const [explorerResult, setExplorerResult] = useState<string | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorAttempt, setTutorAttempt] = useState('');
  const [tutorStage, setTutorStage] = useState<'mistake' | 'hint' | 'solution'>('mistake');
  const [strugglePoints, setStrugglePoints] = useState(100);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusTime, setFocusTime] = useState(1500); // 25 mins
  const [planReview, setPlanReview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isTeen = progress.age !== undefined && progress.age >= 13;

  useEffect(() => {
    if (isFocusMode && focusTime > 0) {
      const timer = setInterval(() => setFocusTime(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (focusTime === 0) {
      setIsFocusMode(false);
    }
  }, [isFocusMode, focusTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAgeGateComplete = (name: string, age: number) => {
    setProgress(prev => ({ ...prev, name, age }));
    if (age >= 13) {
      setActiveTab('explorer');
    }
  };

  const handleExplorerSearch = async () => {
    if (!explorerTopic.trim()) return;
    setIsThinking(true);
    setExplorerResult(null);
    try {
      const result = await getTeenExplorerResponse(explorerTopic);
      setExplorerResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handlePlanReview = async () => {
    setIsThinking(true);
    setPlanReview(null);
    try {
      const timetableStr = (progress.timetable || [])
        .map(t => `${t.day}: ${t.subject} - ${t.topic}`)
        .join('\n');
      const result = await getTeenPlanReview(progress.syllabus, timetableStr);
      setPlanReview(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleTutorAction = async (stage: 'mistake' | 'hint' | 'solution') => {
    if (!tutorQuestion.trim()) return;
    setIsThinking(true);
    setTutorStage(stage);
    
    if (stage === 'hint') setStrugglePoints(p => Math.max(0, p - 20));
    if (stage === 'solution') setStrugglePoints(0);

    try {
      const result = await getTeenTutorResponse(tutorQuestion, tutorAttempt, stage, selectedImage || undefined);
      const tutorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: result,
        timestamp: Date.now(),
        stage
      };
      setMessages(prev => [...prev, tutorMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem('zippi_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zippi_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('zippi_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = React.useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() && !selectedImage) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsThinking(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayTimetable = (progress.timetable || [])
        .filter(t => t.day === today)
        .map(t => `${t.subject}: ${t.topic}`)
        .join(', ');

      const responseText = await getTinyThinkersResponse(
        userMsg.text, 
        history, 
        { 
          language: progress.language, 
          syllabus: progress.syllabus, 
          timetable: todayTimetable 
        },
        userMsg.image
      );
      
      const zippiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, zippiMsg]);

      // Parse summary and update progress
      const summary = parseSessionSummary(responseText);
      if (summary) {
        updateProgress(summary);
      }
    } catch (error) {
      console.error("TinyThinkers error:", error);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, selectedImage, messages, progress]);

  const updateProgress = (summary: any) => {
    setProgress(prev => {
      const newXp = prev.xp + summary.xp;
      const levelInfo = getLevelInfo(newXp);
      
      // Update subject progress
      const subject = (summary.subject || 'General') as Subject;
      const currentSubProgress = prev.subjectProgress[subject] || 0;
      const newSubProgress = Math.min(100, currentSubProgress + 10);

      // Update badges
      let newBadges = [...prev.unlockedBadges];
      if (summary.badge && summary.badge !== 'none' && !newBadges.includes(summary.badge)) {
        newBadges.push(summary.badge);
      }
      
      // Auto-unlock subject badges if not already
      const subjectBadgeMap: Record<string, string> = {
        'Math': 'math-wizard',
        'English': 'grammar-ninja',
        'Science': 'science-star',
        'History': 'history-hero'
      };
      const subBadgeId = subjectBadgeMap[subject];
      if (subBadgeId && !newBadges.includes(subBadgeId)) {
        newBadges.push(subBadgeId);
      }

      // Streak logic
      const today = new Date().toISOString().split('T')[0];
      let newStreak = prev.streak;
      if (prev.lastActive !== today) {
        newStreak += 1;
      }

      // Streak badges
      if (newStreak >= 3 && !newBadges.includes('on-fire')) {
        newBadges.push('on-fire');
      }
      if (newStreak >= 7 && !newBadges.includes('unstoppable')) {
        newBadges.push('unstoppable');
      }

      // Hint saver badge
      if (summary.hints === 1 && !newBadges.includes('hint-saver')) {
        newBadges.push('hint-saver');
      }

      return {
        ...prev,
        xp: newXp,
        level: levelInfo.level,
        streak: newStreak,
        lastActive: today,
        stats: {
          homeworkHelped: prev.stats.homeworkHelped + 1,
          gamesPlayed: prev.stats.gamesPlayed + 1,
          hintsUsed: prev.stats.hintsUsed + (summary.hints || 0),
        },
        subjectProgress: {
          ...prev.subjectProgress,
          [subject]: newSubProgress
        },
        unlockedBadges: newBadges
      };
    });
  };

  const handleResetProgress = () => {
    setProgress(INITIAL_PROGRESS);
    setMessages([]);
    localStorage.removeItem('zippi_progress');
    localStorage.removeItem('zippi_messages');
    setShowResetConfirm(false);
    setActiveTab('chat');
  };

  const handleUpdateName = () => {
    if (newName.trim()) {
      setProgress(prev => ({ ...prev, name: newName.trim() }));
      setIsEditingName(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`min-h-screen ${isTeen ? 'bg-black' : 'bg-gradient-to-b from-emerald-100 to-teal-50'} flex justify-center font-sans`}>
      <AnimatePresence>
        {!progress.age && <AgeGate onComplete={handleAgeGateComplete} />}
      </AnimatePresence>

      <div className={`w-full max-w-[420px] ${isTeen ? 'bg-zinc-950 border-zinc-800' : 'bg-white'} shadow-2xl flex flex-col relative overflow-hidden ${isTeen ? 'border-x' : ''}`}>
        
        {/* Header */}
        <header className={`${isTeen ? 'bg-black text-white' : 'bg-white/80 backdrop-blur-md border-b border-emerald-100'} p-4 flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 ${isTeen ? 'bg-gray-800' : 'bg-yellow-400'} rounded-full flex items-center justify-center shadow-sm`}>
              {isTeen ? <Brain size={24} /> : <Sparkles className="text-white" size={24} />}
            </div>
            <div>
              <h1 className={`text-xl font-extrabold leading-none ${isTeen ? 'text-white' : 'text-emerald-600'}`}>
                {isTeen ? 'TeenThinkers' : 'TinyThinkers'}
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isTeen ? 'text-gray-400' : 'text-emerald-400'}`}>
                {isTeen ? 'Advanced Learning' : 'AI Buddy'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isFocusMode && (
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                <Clock size={14} className="text-red-400" />
                <span className="text-xs font-black text-red-400">{formatTime(focusTime)}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 ${isTeen ? 'bg-gray-900' : 'bg-orange-100'} px-2 py-1 rounded-full`}>
              <Flame size={14} className="text-orange-500" />
              <span className={`text-xs font-black ${isTeen ? 'text-white' : 'text-orange-600'}`}>{progress.streak}</span>
            </div>
            <div className={`flex items-center gap-1 ${isTeen ? 'bg-gray-900' : 'bg-yellow-100'} px-2 py-1 rounded-full`}>
              <span className={`text-xs font-black ${isTeen ? 'text-white' : 'text-yellow-600'}`}>LVL {progress.level}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'explorer' && isTeen && (
              <motion.div 
                key="explorer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-black p-6 rounded-[32px] text-white space-y-4 shadow-xl shadow-gray-200">
                  <h2 className="text-2xl font-black">The Explorer</h2>
                  <p className="text-sm font-medium opacity-90">Enter a topic to get a curated study guide and mind map.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={explorerTopic}
                      onChange={(e) => setExplorerTopic(e.target.value)}
                      placeholder="e.g. Photosynthesis"
                      className="flex-1 bg-white/20 border border-white/30 rounded-2xl p-3 text-sm font-bold placeholder:text-white/50 focus:outline-none focus:bg-white/30"
                    />
                    <button 
                      onClick={handleExplorerSearch}
                      disabled={isThinking || !explorerTopic.trim()}
                      className="bg-white text-black p-3 rounded-2xl font-black disabled:opacity-50"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </div>

                {isThinking && !explorerResult && (
                  <div className="flex flex-col items-center py-12 space-y-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="text-4xl"
                    >
                      🔭
                    </motion.div>
                    <p className="text-gray-400 font-bold">Curating your knowledge...</p>
                  </div>
                )}

                {explorerResult && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
                      <h3 className="text-lg font-black text-black mb-4 flex items-center gap-2">
                        <BookOpen className="text-black" size={20} />
                        Summary
                      </h3>
                      <p className="text-gray-600 font-medium leading-relaxed">
                        {(() => {
                          const summaryMatch = explorerResult.match(/1\.(.*?)(?=2\.)/s) || explorerResult.match(/Summary:(.*?)(?=Videos:)/s);
                          return summaryMatch ? summaryMatch[1].trim() : explorerResult.split('\n\n')[0];
                        })()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black text-gray-400 uppercase mb-2">Video Search</h4>
                        <p className="text-sm font-bold text-gray-700">
                          {(() => {
                            const videoMatch = explorerResult.match(/2\.(.*?)(?=3\.)/s) || explorerResult.match(/Videos:(.*?)(?=Books:)/s);
                            return videoMatch ? videoMatch[1].trim() : 'Check YouTube for ' + explorerTopic;
                          })()}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black text-gray-400 uppercase mb-2">Reading List</h4>
                        <p className="text-sm font-bold text-gray-700">
                          {(() => {
                            const bookMatch = explorerResult.match(/3\.(.*)/s) || explorerResult.match(/Books:(.*)/s);
                            return bookMatch ? bookMatch[1].trim() : 'Search open-source articles';
                          })()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'tutor' && isTeen && (
              <motion.div 
                key="tutor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className={`p-6 rounded-[32px] space-y-4 shadow-xl ${isTeen ? 'bg-zinc-900 text-white' : 'bg-white text-emerald-900'}`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black">Socratic Tutor</h2>
                    <button 
                      onClick={() => setIsFocusMode(!isFocusMode)}
                      className={`p-2 rounded-xl transition-colors ${isFocusMode ? 'bg-red-500 text-white' : (isTeen ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-100 text-emerald-600')}`}
                    >
                      <Clock size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`flex justify-between text-[10px] font-black uppercase ${isTeen ? 'text-zinc-500' : 'text-emerald-500'}`}>
                      <span>Struggle Meter</span>
                      <span>{strugglePoints} Mastery Points</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isTeen ? 'bg-zinc-800' : 'bg-emerald-100'}`}>
                      <motion.div 
                        animate={{ width: `${strugglePoints}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>

                  <textarea 
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    placeholder="Enter your question here..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-500 focus:outline-none focus:border-white min-h-[100px]"
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase ml-2">Your Attempt (Optional)</label>
                    <textarea 
                      value={tutorAttempt}
                      onChange={(e) => setTutorAttempt(e.target.value)}
                      placeholder="Show me how you tried to solve it..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-500 focus:outline-none focus:border-white min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleTutorAction('mistake')}
                      disabled={isThinking || !tutorQuestion.trim()}
                      className="bg-zinc-700 p-3 rounded-2xl font-black text-xs flex flex-col items-center gap-1 hover:bg-zinc-600 disabled:opacity-50"
                    >
                      <Search size={16} />
                      Mistakes?
                    </button>
                    <button 
                      onClick={() => handleTutorAction('hint')}
                      disabled={isThinking || !tutorQuestion.trim()}
                      className="bg-zinc-700 p-3 rounded-2xl font-black text-xs flex flex-col items-center gap-1 hover:bg-zinc-600 disabled:opacity-50"
                    >
                      <Lightbulb size={16} />
                      Get Hint
                    </button>
                    <button 
                      onClick={() => handleTutorAction('solution')}
                      disabled={isThinking || !tutorQuestion.trim()}
                      className="bg-emerald-600 p-3 rounded-2xl font-black text-xs flex flex-col items-center gap-1 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Solution
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {messages.filter(m => m.stage).map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-5 rounded-3xl border-2 shadow-sm ${
                        msg.stage === 'mistake' ? 'bg-blue-50 border-blue-100' :
                        msg.stage === 'hint' ? 'bg-amber-50 border-amber-100' :
                        'bg-emerald-50 border-emerald-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {msg.stage === 'mistake' && <Search className="text-blue-500" size={18} />}
                        {msg.stage === 'hint' && <Lightbulb className="text-amber-500" size={18} />}
                        {msg.stage === 'solution' && <CheckCircle2 className="text-emerald-500" size={18} />}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          msg.stage === 'mistake' ? 'text-blue-400' :
                          msg.stage === 'hint' ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>
                          {msg.stage === 'mistake' ? 'Analysis' : msg.stage === 'hint' ? 'Hint' : 'Solution'}
                        </span>
                      </div>
                      <div className={`text-sm font-bold leading-relaxed max-w-none ${isTeen ? 'text-zinc-300' : 'text-emerald-800'}`}>
                        {msg.text.split('\n').map((line, i) => (
                          <p key={i} className={line.startsWith('**') ? (isTeen ? 'text-white font-black' : 'text-emerald-900 font-black') : ''}>{line}</p>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-center py-4">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="text-2xl"
                      >
                        🧠
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && !isTeen && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Daily Challenge Banner */}
                {(() => {
                  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  const entry = (progress.timetable || []).find(t => t.day === today);
                  if (entry && messages.length === 0) {
                    return (
                      <motion.button
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => handleSendMessage(`Let's play a game about ${entry.subject}: ${entry.topic}!`)}
                        className="w-full bg-gradient-to-r from-orange-400 to-pink-500 p-4 rounded-3xl text-white shadow-lg flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-2xl">
                            <Gamepad2 size={24} />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Daily Challenge</p>
                            <p className="text-sm font-black">{entry.subject}: {entry.topic}</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    );
                  }
                  return null;
                })()}

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-5xl shadow-lg"
                    >
                      🤖
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-black text-emerald-600">Hi! I'm TinyThinkers!</h2>
                      <p className="text-gray-500 font-bold">What are we learning today? 😊</p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-3xl p-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-tr-none' 
                        : 'bg-yellow-100 text-gray-800 rounded-tl-none border-2 border-yellow-200'
                    }`}>
                      {msg.image && (
                        <img src={msg.image} alt="Homework" className="rounded-xl mb-2 max-h-48 w-full object-cover" />
                      )}
                      {msg.role === 'model' ? (
                        <SlideViewer text={msg.text} onOptionClick={(opt) => {
                          handleSendMessage(opt);
                        }} />
                      ) : (
                        <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-yellow-100 text-gray-800 rounded-3xl rounded-tl-none p-4 border-2 border-yellow-200 shadow-sm flex items-center gap-2">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        🤔
                      </motion.div>
                      <span className="text-sm font-bold">TinyThinkers is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* User Info */}
                <div className="flex flex-col items-center py-4">
                  <div className={`w-24 h-24 ${isTeen ? 'bg-zinc-800' : 'bg-emerald-100'} rounded-full flex items-center justify-center text-5xl shadow-inner mb-3 border-4 border-white`}>
                    {progress.avatar}
                  </div>
                  
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={`text-xl font-black ${isTeen ? 'text-white border-zinc-700' : 'text-emerald-600 border-emerald-300'} border-b-2 focus:outline-none bg-transparent text-center w-40`}
                        autoFocus
                      />
                      <button onClick={handleUpdateName} className="p-1 text-green-500 hover:bg-green-50 rounded-full">
                        <Save size={20} />
                      </button>
                      <button onClick={() => { setIsEditingName(false); setNewName(progress.name); }} className="p-1 text-red-500 hover:bg-red-50 rounded-full">
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className={`text-2xl font-black ${isTeen ? 'text-white' : 'text-emerald-600'}`}>{progress.name}</h2>
                      <button onClick={() => setIsEditingName(true)} className={`p-1 ${isTeen ? 'text-zinc-500 hover:bg-zinc-800' : 'text-emerald-400 hover:bg-emerald-50'} rounded-full`}>
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  
                  <p className={`text-sm font-extrabold ${isTeen ? 'text-zinc-400 bg-zinc-800' : 'text-emerald-400 bg-emerald-50'} px-4 py-1 rounded-full`}>
                    {getLevelInfo(progress.xp).title}
                  </p>
                </div>

                {/* XP Bar */}
                <div className={`bg-white p-5 rounded-3xl shadow-sm border-2 ${isTeen ? 'bg-zinc-900 border-zinc-800' : 'border-emerald-50'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-xs font-black ${isTeen ? 'text-zinc-500' : 'text-emerald-600'}`}>XP PROGRESS</span>
                    <span className={`text-lg font-black ${isTeen ? 'text-white' : 'text-emerald-600'}`}>{progress.xp} / {getLevelInfo(progress.xp).nextXp}</span>
                  </div>
                  <div className={`h-4 ${isTeen ? 'bg-zinc-800' : 'bg-emerald-100'} rounded-full overflow-hidden`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.xp / getLevelInfo(progress.xp).nextXp) * 100}%` }}
                      className={`h-full ${isTeen ? 'bg-white' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`${isTeen ? 'bg-zinc-800' : 'bg-blue-50'} p-3 rounded-2xl text-center`}>
                    <p className={`text-xl font-black ${isTeen ? 'text-white' : 'text-blue-600'}`}>{progress.stats.homeworkHelped}</p>
                    <p className={`text-[10px] font-bold ${isTeen ? 'text-zinc-500' : 'text-blue-400'} uppercase`}>Helped</p>
                  </div>
                  <div className={`${isTeen ? 'bg-zinc-800' : 'bg-green-50'} p-3 rounded-2xl text-center`}>
                    <p className={`text-xl font-black ${isTeen ? 'text-white' : 'text-green-600'}`}>{progress.stats.gamesPlayed}</p>
                    <p className={`text-[10px] font-bold ${isTeen ? 'text-zinc-500' : 'text-green-400'} uppercase`}>Games</p>
                  </div>
                  <div className={`${isTeen ? 'bg-zinc-800' : 'bg-orange-50'} p-3 rounded-2xl text-center`}>
                    <p className={`text-xl font-black ${isTeen ? 'text-white' : 'text-orange-600'}`}>{progress.stats.hintsUsed}</p>
                    <p className={`text-[10px] font-bold ${isTeen ? 'text-zinc-500' : 'text-orange-400'} uppercase`}>Hints</p>
                  </div>
                </div>

                {/* Subject Progress */}
                <div className={`bg-white p-5 rounded-3xl shadow-sm border-2 ${isTeen ? 'border-zinc-800 bg-zinc-900' : 'border-emerald-50'} space-y-4`}>
                  <h3 className={`text-sm font-black ${isTeen ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Subject Mastery</h3>
                  <ProgressBar label="Math 🧙" value={progress.subjectProgress.Math} color={isTeen ? 'bg-white' : 'bg-blue-400'} />
                  <ProgressBar label="English 🥷" value={progress.subjectProgress.English} color={isTeen ? 'bg-white' : 'bg-green-400'} />
                  <ProgressBar label="Science 🔬" value={progress.subjectProgress.Science} color={isTeen ? 'bg-white' : 'bg-emerald-400'} />
                  <ProgressBar label="History 🏛️" value={progress.subjectProgress.History} color={isTeen ? 'bg-white' : 'bg-orange-400'} />
                </div>

                {/* Settings Section */}
                <div className="bg-red-50 p-5 rounded-3xl border-2 border-red-100 space-y-4">
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-2">Danger Zone</h3>
                  <p className="text-xs font-bold text-red-400">Want to start your journey from the beginning?</p>
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 bg-white border-2 border-red-200 text-red-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={18} />
                    RESET ALL PROGRESS
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'badges' && (
              <motion.div 
                key="badges"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <h2 className="text-2xl font-black text-emerald-600">Badge Shelf</h2>
                  <p className="text-gray-500 font-bold">Collect them all! 🏅</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {BADGES.map(badge => {
                    const isUnlocked = progress.unlockedBadges.includes(badge.id) || progress.unlockedBadges.includes(badge.name);
                    return (
                      <BadgeItem 
                        key={badge.id} 
                        badge={badge} 
                        unlocked={isUnlocked} 
                      />
                    );
                  })}
                </div>

                <div className="bg-yellow-50 p-6 rounded-3xl border-2 border-dashed border-yellow-200 text-center">
                  <Award className="mx-auto text-yellow-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-yellow-700">Keep learning to unlock more cool badges!</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <h2 className={`text-2xl font-black ${isTeen ? 'text-white' : 'text-emerald-600'}`}>My Study Plan</h2>
                  <p className="text-gray-500 font-bold">{isTeen ? 'Optimize your learning schedule' : 'Customize your learning! 📚'}</p>
                </div>

                {isTeen && (
                  <div className="bg-zinc-800 p-6 rounded-[32px] text-white space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black">Plan Review</h3>
                      <button 
                        onClick={handlePlanReview}
                        disabled={isThinking}
                        className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black shadow-lg disabled:opacity-50"
                      >
                        {isThinking ? 'Analyzing...' : 'Detect Mistakes'}
                      </button>
                    </div>
                    <p className="text-xs opacity-90">Let AI check your timetable and syllabus for gaps or overlaps.</p>
                    
                    {planReview && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-white/10 rounded-2xl p-4 text-sm font-medium border border-white/20"
                      >
                        <div className="prose prose-invert prose-sm max-w-none">
                          {planReview.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Language Selection */}
                <div className={`p-5 rounded-3xl shadow-sm border-2 ${isTeen ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-50'}`}>
                  <h3 className={`text-sm font-black ${isTeen ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-widest mb-3`}>Language</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setProgress(p => ({ ...p, language: lang as any }))}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${progress.language === lang ? (isTeen ? 'bg-white text-black shadow-md' : 'bg-emerald-500 text-white shadow-md') : (isTeen ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-500')}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Syllabus */}
                <div className={`p-5 rounded-3xl shadow-sm border-2 ${isTeen ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-50'}`}>
                  <h3 className={`text-sm font-black ${isTeen ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-widest mb-3`}>Syllabus</h3>
                  <textarea
                    value={progress.syllabus}
                    onChange={(e) => setProgress(p => ({ ...p, syllabus: e.target.value }))}
                    placeholder="Paste your syllabus here..."
                    className={`w-full ${isTeen ? 'bg-zinc-800 border-zinc-700 text-white focus:border-white' : 'bg-gray-50 border-2 border-emerald-100 focus:border-emerald-300'} rounded-2xl p-3 text-sm font-bold focus:ring-0 min-h-[100px]`}
                  />
                </div>

                {/* Timetable */}
                <div className={`p-5 rounded-3xl shadow-sm border-2 ${isTeen ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-50'}`}>
                  <h3 className={`text-sm font-black ${isTeen ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-widest mb-3`}>Timetable</h3>
                  <div className="space-y-3">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                      const entry = (progress.timetable || []).find(t => t.day === day);
                      return (
                        <div key={day} className="flex gap-2 items-center">
                          <span className={`w-20 text-xs font-black ${isTeen ? 'text-white' : 'text-emerald-600'}`}>{day}</span>
                          <select
                            value={entry?.subject || 'General'}
                            onChange={(e) => {
                              const newTimetable = [...(progress.timetable || []).filter(t => t.day !== day)];
                              newTimetable.push({ day, subject: e.target.value as any, topic: entry?.topic || '' });
                              setProgress(p => ({ ...p, timetable: newTimetable }));
                            }}
                            className={`flex-1 ${isTeen ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-2 border-emerald-100'} rounded-xl p-2 text-xs font-bold`}
                          >
                            <option value="Math">Math</option>
                            <option value="English">English</option>
                            <option value="Science">Science</option>
                            <option value="History">History</option>
                            <option value="General">General</option>
                          </select>
                          <input
                            type="text"
                            value={entry?.topic || ''}
                            placeholder="Topic"
                            onChange={(e) => {
                              const newTimetable = [...(progress.timetable || []).filter(t => t.day !== day)];
                              newTimetable.push({ day, subject: entry?.subject || 'General', topic: e.target.value });
                              setProgress(p => ({ ...p, timetable: newTimetable }));
                            }}
                            className={`flex-1 ${isTeen ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-2 border-emerald-100'} rounded-xl p-2 text-xs font-bold`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Input Area (Only for Chat) */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-emerald-100">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-gray-100 rounded-3xl p-2 flex flex-col">
                {selectedImage && (
                  <div className="relative w-16 h-16 mb-2 ml-2">
                    <img src={selectedImage} className="w-full h-full object-cover rounded-lg" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <Plus size={12} className="rotate-45" />
                    </button>
                  </div>
                )}
                <div className="flex items-center">
                  <label className="p-2 text-emerald-500 cursor-pointer hover:bg-emerald-50 rounded-full transition-colors">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask TinyThinkers anything..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold p-2 max-h-32 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
              </div>
              <button 
                onClick={handleSendMessage}
                disabled={isThinking || (!inputText.trim() && !selectedImage)}
                className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-90"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <nav className={`absolute bottom-0 left-0 right-0 h-20 ${isTeen ? 'bg-black border-zinc-800' : 'bg-white border-emerald-100'} border-t flex items-center justify-around px-6`}>
          {isTeen ? (
            <>
              <button 
                onClick={() => setActiveTab('explorer')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'explorer' ? 'text-white scale-110' : 'text-zinc-600'}`}
              >
                <Search size={24} strokeWidth={activeTab === 'explorer' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Explorer</span>
              </button>
              <button 
                onClick={() => setActiveTab('tutor')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tutor' ? 'text-white scale-110' : 'text-zinc-600'}`}
              >
                <Brain size={24} strokeWidth={activeTab === 'tutor' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Tutor</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-white scale-110' : 'text-zinc-600'}`}
              >
                <User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Profile</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-white scale-110' : 'text-zinc-600'}`}
              >
                <Plus size={24} strokeWidth={activeTab === 'settings' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Plan</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
              >
                <MessageCircle size={24} strokeWidth={activeTab === 'chat' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Chat</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
              >
                <User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Profile</span>
              </button>
              <button 
                onClick={() => setActiveTab('badges')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'badges' ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
              >
                <Award size={24} strokeWidth={activeTab === 'badges' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Badges</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
              >
                <Plus size={24} strokeWidth={activeTab === 'settings' ? 3 : 2} />
                <span className="text-[10px] font-black uppercase">Plan</span>
              </button>
            </>
          )}
        </nav>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-emerald-900/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[40px] p-8 shadow-2xl w-full max-w-sm text-center border-4 border-emerald-100"
              >
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Are you sure?</h3>
                <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
                  This will delete all your XP, badges, and chat history. You can't undo this!
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={handleResetProgress}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
                  >
                    YES, RESET EVERYTHING
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all"
                  >
                    NO, GO BACK
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

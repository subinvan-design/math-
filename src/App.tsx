import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Map, 
  Volume2, 
  VolumeX, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Gift, 
  Flame, 
  ArrowRight, 
  Play, 
  RefreshCw, 
  HelpCircle, 
  Smile, 
  Dices,
  RotateCcw,
  BookOpen
} from "lucide-react";
import { synth } from "./components/SoundUtils";
import { Problem, ChatMessage, QuestZone, UserProfile } from "./types";

// Adventure Zones
const QUEST_ZONES: QuestZone[] = [
  {
    id: "zone_forest",
    name: "초록 도토리 숲",
    category: "덧셈과 뺄셈",
    description: "다람쥐 토리와 함께 가을 하늘 아래서 알록달록 버섯과 맛있고 동글동글한 도토리를 세어보세요!",
    iconName: "🐿️",
    themeColor: "bg-[#4ECDC4]", // Mint
    accentColor: "bg-[#cbf7f3]",
    mascotQuote: "안녕 친구야! 도토리가 전부 몇 개인지 세어줄래?",
    defaultTheme: "동물 친구들"
  },
  {
    id: "zone_space",
    name: "반짝 은하수 우주선",
    category: "곱셈과 구구단",
    description: "행성에 흩어진 별빛 조각들과 초코빵 연료를 곱해가며 우주 여행 로켓을 힘차게 발사해요!",
    iconName: "🚀",
    themeColor: "bg-[#FF6B6B]", // Coral Red
    accentColor: "bg-[#ffe3e3]",
    mascotQuote: "로켓 가동을 위해 곱셈 구구단 에너지를 충전해줘!",
    defaultTheme: "우주 대모험"
  },
  {
    id: "zone_kitchen",
    name: "요정의 분수 쿠킹베이커리",
    category: "분수와 도형",
    description: "달콤하고 둥근 치즈 피자와 마카롱을 공평하게 나누어 보면서 쉽고 신기한 분수를 배워요!",
    iconName: "🍕",
    themeColor: "bg-[#FFD93D]", // Yellow Gold
    accentColor: "bg-[#fef3c7]",
    mascotQuote: "피자를 한 명당 똑같이 나눠 가지려면 몇 등분 해야 할까?",
    defaultTheme: "베이킹과 쿠키파티"
  },
  {
    id: "zone_castle",
    name: "수수께끼 비밀 성문",
    category: "수수께끼와 추리",
    description: "약수와 배수 규칙 수색, 마법 암호를 추리하며 무너지지 않는 수리 탐정의 감각을 깨워요!",
    iconName: "🔓",
    themeColor: "bg-purple-400", // Soft purple
    accentColor: "bg-purple-100",
    mascotQuote: "여덟보다 크고 열넷보다 작은 홀수인 암호는 무엇일까?",
    defaultTheme: "마법 탐정과 보물열쇠"
  }
];

export default function App() {
  // User profile loaded from localStorage
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("math_adventure_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      nickname: "꼬마 대원",
      score: 120,
      acorns: 15,
      keys: ["zone_forest"],
      level: 1,
      streak: 3
    };
  });

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("math_adventure_profile", JSON.stringify(profile));
  }, [profile]);

  // Current states
  const [currentZone, setCurrentZone] = useState<QuestZone>(QUEST_ZONES[0]);
  const [difficulty, setDifficulty] = useState<"쉬움" | "보통" | "어려움">("쉬움");
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Quiz Module
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userFeedbackMessage, setUserFeedbackMessage] = useState("");
  
  // Custom Nickname Modal
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState(profile.nickname);

  // Companion Chat Box
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init_1",
      role: "assistant",
      text: "안녕! 대원님! 나는 대원님의 단짝 수학 도우미 다람쥐 '토리'야! 수수께끼 단어를 물어보거나 재미있는 곱셈 비밀을 같이 풀어볼까? 무엇이든 수다 떨어보자! 🐿️🌰",
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Interactive Playgrounds
  const [playgroundMode, setPlaygroundMode] = useState<"quiz" | "pizza" | "scale">("quiz");
  
  // Live Fraction Pizza slice counts
  const [pizzaSlices, setPizzaSlices] = useState(4);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  // Scale Balance weights
  const [leftScaleWeight, setLeftScaleWeight] = useState(12);
  const [rightScaleWeights, setRightScaleWeights] = useState<number[]>([5, 4]); // Kids drags/clicks cards to balance left
  const sumRightWeights = rightScaleWeights.reduce((a, b) => a + b, 0);

  // Trigger sound wrappers
  const triggerSound = (type: "correct" | "incorrect" | "fanfare") => {
    if (!soundEnabled) return;
    if (type === "correct") synth.playCorrect();
    else if (type === "incorrect") synth.playIncorrect();
    else if (type === "fanfare") synth.playFanfare();
  };

  // Fetch or generate fresh problem
  const loadNewProblem = async (zoneOverride?: QuestZone) => {
    const targetZone = zoneOverride || currentZone;
    setLoadingProblem(true);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setUserFeedbackMessage("");
    
    try {
      const response = await fetch("/api/math/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category: targetZone.category,
          difficulty: difficulty,
          theme: targetZone.defaultTheme
        })
      });
      const data = await response.json();
      setProblem(data);
    } catch (e) {
      console.error(e);
      // Hard local fail-safe
      setProblem({
        story: "토리네 나무 위 도토리 주머니에 도토리가 18개 들어 있었습니다. 그 중 포리가 6마리의 다람쥐 친구들에게 가볍게 한 개씩 나누어 주었습니다.",
        question: "주머니에 보관되어 남아 있는 소중한 도토리는 전부 몇 자루일까요?",
        choices: ["10자루", "12자루", "14자루", "16자루"],
        answerIndex: 1,
        explanation: "18자루의 원래 보따리에서 친구들에게 나눠준 6마리를 빼면 18 - 6 = 12자루가 남습니다! 우리 모험대원님 정말 영리하시군요! ⭐"
      });
    } finally {
      setLoadingProblem(false);
    }
  };

  // Load problem once at start
  useEffect(() => {
    loadNewProblem();
  }, [currentZone, difficulty]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Handle choice submission
  const handleAnswerSubmit = (index: number) => {
    if (hasAnswered || !problem) return;
    setSelectedAnswer(index);
    setHasAnswered(true);

    const isCorrect = index === problem.answerIndex;
    if (isCorrect) {
      triggerSound("correct");
      setUserFeedbackMessage("정답이에요! 🎉 멋진 수학 전사답군요!");
      
      // Update score and acorn rewards
      setProfile(prev => {
        const rewardAcorn = difficulty === "쉬움" ? 2 : difficulty === "보통" ? 4 : 6;
        const newKeys = prev.keys.includes(currentZone.id) ? prev.keys : [...prev.keys, currentZone.id];
        
        // If earned a new level
        const currentMilestone = prev.score + 25;
        const nextLevelThreshold = prev.level * 300;
        const newLevel = currentMilestone >= nextLevelThreshold ? prev.level + 1 : prev.level;
        
        if (newLevel > prev.level) {
          setTimeout(() => triggerSound("fanfare"), 500);
        }

        return {
          ...prev,
          score: prev.score + 25,
          acorns: prev.acorns + rewardAcorn,
          keys: newKeys,
          level: newLevel,
          streak: prev.streak + 1
        };
      });
    } else {
      triggerSound("incorrect");
      setUserFeedbackMessage("아쉬워요! 🐿️ 토리가 남겨둔 힌트 풀이를 읽으며 같이 복습해 볼까요? 당신은 할 수 있어요!");
      setProfile(prev => ({
        ...prev,
        streak: 0
      }));
    }
  };

  // Chat message sending
  const handleSendChatMessage = async (textToSend?: string) => {
    const rawMsg = textToSend || chatInput;
    if (!rawMsg.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: rawMsg,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setChatLoading(true);

    // Prepare context history for server tutor
    const recentHistory = chatMessages.slice(-5).map(m => ({
      role: m.role,
      text: m.text
    }));

    try {
      const response = await fetch("/api/math/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: rawMsg,
          history: recentHistory
        })
      });
      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: `tori_${Date.now()}`,
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      const errReply: ChatMessage = {
        id: `tori_${Date.now()}`,
        role: "assistant",
        text: "앗! 숲속 마법 신호가 살짝 흐려졌어! 다시 귀를 쫑긋하고 질문해줄래? 토리가 도토리를 들고 기다리는 중이야! 🐿️💖",
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, errReply]);
    } finally {
      setChatLoading(false);
    }
  };

  // Reset progress tool
  const handleResetAdventure = () => {
    if (confirm("정말로 수학 탐험을 처음부터 다시 시작할까요? 지금까지 모은 황금 도토리와 열쇠가 리셋돼요!")) {
      const resetProfile: UserProfile = {
        nickname: "동글모험가",
        score: 0,
        acorns: 5,
        keys: ["zone_forest"],
        level: 1,
        streak: 0
      };
      setProfile(resetProfile);
      localStorage.setItem("math_adventure_profile", JSON.stringify(resetProfile));
      triggerSound("fanfare");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAEC] text-[#3F3A36] font-sans overflow-x-hidden pb-12 antialiased">
      
      {/* Upper Sparkle Header Profile Bar */}
      <header className="bg-white border-b-4 border-black py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFD93D] p-2.5 rounded-2xl border-3 border-black text-3xl font-black fancy-border-sm animate-bounce-slow">
            🐿️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight font-jua text-[#3F3A36]">수학 탐험대</h1>
              <span className="bg-black text-[#FFD93D] font-mono text-sm px-2 py-0.5 rounded-lg border border-black font-black uppercase">
                v2.0 Bold
              </span>
            </div>
            <p className="text-sm font-semibold opacity-75">AI 단짝 토리선생님과 우주에서 가장 재밌는 수학 모험!</p>
          </div>
        </div>

        {/* User Statistics Badges in Bold Typography Custom Styling */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-4 py-2 border-3 border-black rounded-2xl shadow-[3px_3px_0px_#000] flex items-center gap-1.5">
            <span className="text-xl font-bold bg-[#FFD93D] text-black px-2 py-0.5 rounded-lg text-sm border-2 border-black font-mono">LV {profile.level}</span>
            <div className="text-xs font-black">
              <span className="text-stone-500 block leading-tight text-[10px]">꼬마 전사</span>
              <span className="text-sm font-black text-stone-800">{profile.nickname}</span>
            </div>
            <button 
              onClick={() => { setTempName(profile.nickname); setShowNameModal(true); }}
              className="text-xs text-blue-600 hover:underline font-black ml-1 cursor-pointer"
              id="btn_edit_nickname"
            >
              [바꾸기]
            </button>
          </div>

          <div className="bg-[#4ECDC4] text-black px-4 py-2 border-3 border-black rounded-2xl shadow-[3px_3px_0px_#000] flex items-center gap-1.5">
            <span className="font-black tracking-tight text-xs uppercase text-black/60">점수</span>
            <span className="text-xl font-black italic tracking-tighter">{profile.score.toLocaleString()}</span>
          </div>

          <div className="bg-[#FF6B6B] text-white px-4 py-2 border-3 border-black rounded-2xl shadow-[3px_3px_0px_#000] flex items-center gap-1.5">
            <span className="text-xl animate-pulse">🌰</span>
            <span className="text-lg font-black tracking-tighter">{profile.acorns}개</span>
          </div>

          {profile.streak > 0 && (
            <div className="bg-amber-100 text-[#D97706] px-4 py-2 border-3 border-amber-600 rounded-2xl shadow-[3px_3px_0px_#D97706] flex items-center gap-1">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-600 animate-bounce" />
              <span className="text-sm font-black">{profile.streak}일 연속 학습!</span>
            </div>
          )}

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 border-3 border-black rounded-2xl bg-white hover:bg-stone-50 active:translate-y-1 transition-all shadow-[3px_3px_0px_#000] cursor-pointer"
            title="소리 켜기/끄기"
            id="btn_toggle_sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-green-600" /> : <VolumeX className="w-5 h-5 text-red-500" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Interactive Quest Panel (3 Cols) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#FFD93D] p-6 border-4 border-black rounded-[40px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-6 h-6 text-black" />
              <h2 className="text-2xl font-black font-jua">지도를 골라 탐험하기</h2>
            </div>
            <p className="text-sm font-bold text-stone-800 mb-5 leading-relaxed">
              아이들이 좋아하는 네 가지 테마 코스를 준비했어요! 탐험 지도를 클릭하면 바로 신기한 AI 맞춤 수학 문제가 도착해요.
            </p>

            <div className="space-y-4">
              {QUEST_ZONES.map((zone) => {
                const isActive = currentZone.id === zone.id;
                const isUnlocked = profile.keys.includes(zone.id) || zone.id === "zone_forest";

                return (
                  <button
                    key={zone.id}
                    onClick={() => {
                      setCurrentZone(zone);
                      setPlaygroundMode("quiz");
                    }}
                    className={`w-full p-4 border-3 border-black rounded-3xl flex items-center gap-3 text-left transition-all relative overflow-hidden ${
                      isActive 
                        ? "bg-white translate-y-[-2px] shadow-[4px_4px_0px_#000]" 
                        : "bg-[#FFFCEB] hover:bg-stone-50 active:translate-y-0.5 shadow-[2px_2px_0px_#000]"
                    }`}
                    id={`btn_zone_select_${zone.id}`}
                  >
                    <div className="absolute right-2 top-2 text-[60px] opacity-10 select-none">
                      {zone.iconName}
                    </div>

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-black text-2xl shadow-[2px_2px_0px_#000] ${zone.themeColor}`}>
                      {zone.iconName}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black truncate">{zone.name}</span>
                        {!isUnlocked && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1 rounded-md border border-red-300">잠김</span>
                        )}
                      </div>
                      <span className="text-xs block font-bold text-[#E25C5C]">{zone.category}</span>
                      <span className="text-[11px] block text-stone-500 font-semibold truncate leading-normal">{zone.description}</span>
                    </div>

                    {isActive && (
                      <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Playground Mini-Game Switcher */}
          <div className="bg-white p-6 border-4 border-black rounded-[40px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black font-jua mb-3 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-500" />
              수학 놀이터 교구방
            </h3>
            <p className="text-xs font-semibold text-stone-500 mb-4 leading-normal">
              문제를 풀기 가볍게 힘드나요? 모형 교구를 가지고 손으로 직접 느껴가며 수학 기초 근육을 쑥쑥 길러보세요!
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlaygroundMode("pizza")}
                className={`p-3 rounded-2xl border-3 border-black text-center font-bold text-sm transition-all cursor-pointer ${
                  playgroundMode === "pizza" 
                    ? "bg-[#FFD93D] shadow-[3px_3px_0px_#000] rotate-[-1deg]" 
                    : "bg-stone-50 hover:bg-stone-100"
                }`}
                id="btn_play_pizza_maker"
              >
                🍕 분수 피자 조각
              </button>
              <button
                onClick={() => setPlaygroundMode("scale")}
                className={`p-3 rounded-2xl border-3 border-black text-center font-bold text-sm transition-all cursor-pointer ${
                  playgroundMode === "scale" 
                    ? "bg-[#4ECDC4] shadow-[3px_3px_0px_#000] rotate-[1deg]" 
                    : "bg-stone-50 hover:bg-stone-100"
                }`}
                id="btn_play_acorn_scale"
              >
                ⚖️ 도토리 무게 저울
              </button>
            </div>

            {playgroundMode !== "quiz" && (
              <button 
                onClick={() => setPlaygroundMode("quiz")}
                className="w-full mt-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-dashed border-indigo-400 font-bold text-sm rounded-xl transition-all cursor-pointer"
                id="btn_back_to_quiz"
              >
                ← 다시 스토리 수학 풀러가기
              </button>
            )}
          </div>

          {/* Key Achievements & Badges Collection */}
          <div className="bg-stone-100 p-5 border-4 border-black rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <h4 className="text-lg font-black font-jua mb-2">획득 열쇠 & 기장</h4>
            <div className="flex flex-wrap gap-2">
              <div className="bg-white border-2 border-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] bg-emerald-50">
                🟢 초록 도토리 키
              </div>
              <div className={`bg-white border-2 border-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] ${profile.keys.includes("zone_space") ? "bg-rose-50" : "opacity-35"}`}>
                🚀 빨간 로켓 키
              </div>
              <div className={`bg-white border-2 border-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] ${profile.keys.includes("zone_kitchen") ? "bg-yellow-50" : "opacity-35"}`}>
                🍕 요정 황금 키
              </div>
              <div className={`bg-white border-2 border-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] ${profile.keys.includes("zone_castle") ? "bg-purple-50" : "opacity-35"}`}>
                🔓 비밀의 성문 마스터
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t-2 border-dashed border-stone-300 flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500">지정 모험가 등급</span>
              <button 
                onClick={handleResetAdventure}
                className="text-stone-400 hover:text-red-500 text-[10px] font-black cursor-pointer uppercase underline"
                id="btn_reset_data"
              >
                모험 기록 초기화
              </button>
            </div>
          </div>
        </aside>

        {/* Center Main Stage Area (6 or 5 Cols depending on display) */}
        <main className="lg:col-span-8 space-y-8">
          
          {/* Main Work Area */}
          <div className="bg-white border-4 border-black rounded-[48px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-6 md:p-10 relative overflow-hidden">
            
            {/* Top Indicator Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-black text-[#FFD93D] px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000]">
                  {currentZone.category} • 미션
                </span>
                <span className="text-sm font-extrabold text-stone-600 block">
                  {currentZone.name} 기지에 있는 수학 탐정
                </span>
              </div>

              {playgroundMode === "quiz" && (
                <div className="flex items-center gap-1">
                  {(["쉬움", "보통", "어려움"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setDifficulty(level);
                      }}
                      className={`px-3 py-1 text-xs font-black rounded-lg border-2 border-black transition-all cursor-pointer ${
                        difficulty === level 
                          ? "bg-[#FF6B6B] text-white shadow-[2px_2px_0px_#000] scale-105" 
                          : "bg-white hover:bg-stone-50"
                      }`}
                      id={`btn_diff_${level}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 1. QUIZ VIEW */}
            {playgroundMode === "quiz" && (
              <div id="quiz_view_container">
                {loadingProblem ? (
                  <div className="py-24 text-center space-y-4">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto text-[#FF6B6B]" />
                    <p className="text-xl font-bold text-stone-700 animate-pulse">
                      다람쥐 토리가 도토리를 굴려 새로운 수학 문제를 만들고 있어요...🐿️
                    </p>
                  </div>
                ) : problem ? (
                  <div className="space-y-6">
                    
                    {/* Fairy Tale Story Box with Tori Companion Character image */}
                    <div className="bg-stone-50 border-3 border-black p-6 rounded-[32px] relative shadow-[4px_4px_0px_#000]">
                      <div className="absolute right-4 top-4 bg-white border-2 border-black rounded-full px-2.5 py-1 text-xs font-bold leading-none animate-bounce">
                        💡 같이 풀어볼래?
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Tori Character Badge */}
                        <div className="flex flex-col items-center shrink-0">
                          {/* We embed the generated character image beautifully */}
                          <div className="w-16 h-16 rounded-full border-3 border-black overflow-hidden bg-emerald-100 shadow-[2px_2px_0px_#000] flex items-center justify-center font-bold text-3xl">
                            🐿️
                          </div>
                          <span className="bg-[#4ECDC4] text-xs font-black mt-2 text-black border border-black px-1.5 py-0.5 rounded">토리 쌤</span>
                        </div>

                        <div className="space-y-3 flex-1">
                          <p className="text-lg md:text-xl font-black leading-relaxed text-[#3F3A36] whitespace-pre-line bg-white/60 p-3 rounded-2xl border border-dashed border-stone-300">
                            {problem.story}
                          </p>
                          <div className="flex items-center gap-1 text-[#E25C5C] font-black text-xl md:text-2xl mt-1 font-jua">
                            <span>❓ Q.</span>
                            <h3>{problem.question}</h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simple Big Math Symbol Decors */}
                    <div className="flex justify-center items-center gap-3 py-1 opacity-5 font-mono select-none text-[32px] font-black">
                      <span>1 + 1 = 2</span>
                      <span>•</span>
                      <span>3 × 4 = 12</span>
                      <span>•</span>
                      <span>1/4</span>
                    </div>

                    {/* Choices Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {problem.choices.map((choice, idx) => {
                        const isChosen = selectedAnswer === idx;
                        const isCorrectAnswer = idx === problem.answerIndex;
                        let btnStyle = "bg-white border-3 border-black shadow-[4px_4px_0px_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]";
                        
                        if (hasAnswered) {
                          if (isCorrectAnswer) {
                            btnStyle = "bg-[#4ECDC4] text-black border-3 border-black shadow-[2px_2px_0px_#000]";
                          } else if (isChosen) {
                            btnStyle = "bg-[#FF6B6B] text-white border-3 border-black shadow-[2px_2px_0px_#000] opacity-80";
                          } else {
                            btnStyle = "bg-white text-stone-400 border-3 border-stone-200 shadow-none scale-95 opacity-50";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={hasAnswered}
                            onClick={() => handleAnswerSubmit(idx)}
                            className={`p-5 rounded-3xl text-left font-black transition-all flex items-center justify-between text-lg md:text-xl fancy-button cursor-pointer ${btnStyle}`}
                            id={`btn_choice_${idx}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full border-2 border-black bg-stone-100 text-stone-800 flex items-center justify-center font-mono text-sm shrink-0">
                                {idx + 1}
                              </span>
                              <span>{choice}</span>
                            </div>

                            {hasAnswered && isCorrectAnswer && (
                              <CheckCircle2 className="w-6 h-6 text-emerald-900 shrink-0" />
                            )}
                            {hasAnswered && isChosen && !isCorrectAnswer && (
                              <XCircle className="w-6 h-6 text-rose-100 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanatory feedback banner */}
                    {hasAnswered && (
                      <div className="bg-amber-50 border-3 border-black p-6 rounded-[32px] mt-6 relative shadow-[4px_4px_0px_#000] animate-wiggle">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">🎉</span>
                          <div>
                            <p className="text-base font-black text-rose-600 mb-2">{userFeedbackMessage}</p>
                            <div className="p-3 bg-white rounded-xl border border-stone-200">
                              <span className="font-extrabold text-[#4ECDC4] block mb-1">🐿️ 토리의 친절 해설방:</span>
                              <p className="text-sm font-bold text-stone-700 leading-relaxed whitespace-pre-line">
                                {problem.explanation}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                          <button
                            onClick={() => loadNewProblem()}
                            className="bg-[#FFD93D] text-black border-3 border-black px-6 py-2.5 rounded-2xl font-black text-base transition-all hover:translate-y-[-2px] shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] flex items-center gap-2 fancy-button cursor-pointer"
                            id="btn_next_quest"
                          >
                            <span>다음 수학 기지로 모험 전진하기!</span>
                            <ArrowRight className="w-5 h-5 text-black" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Static guide tip */}
                    {!hasAnswered && (
                      <p className="text-center text-xs font-bold text-stone-400 flex items-center justify-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        문제를 맞히면 점수 25점과 도토리를 더 많이 획득해요!
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="font-bold text-red-500">문제를 불려오던 도중에 에러가 발생했어요.</p>
                    <button onClick={() => loadNewProblem()} className="mt-4 px-4 py-2 bg-stone-200 rounded border border-black">다시 로드</button>
                  </div>
                )}
              </div>
            )}

            {/* 2. PIZZA FRACTIONS PLAYGROUND */}
            {playgroundMode === "pizza" && (
              <div className="space-y-6" id="pizza_playground_container">
                <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-black mb-4">
                  <h4 className="text-lg font-black text-emerald-800">🍕 초록 요정 피자 나누기 교구장</h4>
                  <p className="text-xs font-bold text-stone-600 mt-1 leading-normal">
                    전체 원을 분수로 조각 나누며 등분의 아름다움을 배워요! 분수를 직접 눈으로 맛보세요.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
                  {/* Pizza render zone */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-64 h-64 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] bg-orange-100 overflow-hidden">
                      {/* Interactive Pizza divisions */}
                      {Array.from({ length: pizzaSlices }).map((_, idx) => {
                        const angleStep = 360 / pizzaSlices;
                        const startAngle = idx * angleStep;
                        const isHovered = hoveredSliceIdx === idx;

                        // Create styled slices using rotating clip-paths (standard representation)
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredSliceIdx(idx)}
                            onMouseLeave={() => setHoveredSliceIdx(null)}
                            style={{
                              transform: `rotate(${startAngle}deg)`,
                              transformOrigin: "bottom right",
                              clipPath: `polygon(100% 100%, 0% 100%, 0% 0%)`,
                              position: "absolute",
                              right: "50%",
                              bottom: "50%",
                              width: "50%",
                              height: "50%",
                            }}
                            className={`transition-all duration-150 border-r-2 border-b-2 border-black/30 origin-bottom-right cursor-pointer ${
                              isHovered ? "bg-[#FFD93D] scale-105" : "bg-amber-400"
                            }`}
                          >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-stone-800 text-[10px] select-none pointer-events-none scale-75 origin-top-left font-mono">
                              🍕
                            </div>
                          </div>
                        );
                      })}
                      {/* Pizza crust middle separator */}
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-amber-900/30 -translate-y-1/2" />
                      {/* Center olive dot */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FF6B6B] border-3 border-black text-center flex items-center justify-center font-black text-xs">
                        ⭐
                      </div>
                    </div>
                    <span className="text-sm font-black text-stone-500 mt-6 bg-stone-100 px-3 py-1 rounded-full border border-black">
                      현재 조각 수: {pizzaSlices}개 분할
                    </span>
                  </div>

                  {/* Range selectors */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-base font-black">피자를 골고루 몇 조각으로 쪼갤까요?</label>
                      <input 
                        type="range"
                        min="2"
                        max="8"
                        step="1"
                        value={pizzaSlices}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPizzaSlices(val);
                          triggerSound("correct");
                        }}
                        className="w-full accent-[#FF6B6B] h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        id="slider_pizza_slices"
                      />
                      <div className="flex justify-between font-mono text-xs font-black px-1 text-stone-500">
                        <span>2조각</span>
                        <span>3조각</span>
                        <span>4조각</span>
                        <span>5조각</span>
                        <span>6조각</span>
                        <span>7조각</span>
                        <span>8조각</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border-2 border-black space-y-2.5">
                      <span className="text-xs font-black uppercase text-[#E25C5C] block">쉽게 쓰는 분수 계산법:</span>
                      <p className="text-base font-bold leading-normal">
                        피자 한 판 전체를 <span className="text-xl font-black text-amber-500">{pizzaSlices}</span>명이서 똑같이 한 조각씩 나누어 먹으면,
                        한 명이 먹는 몫은 전체 피자의 <span className="text-xl font-black underline text-red-500">{"1/" + pizzaSlices}</span> 이 돼요!
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {[2, 3, 4, 6, 8].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setPizzaSlices(num);
                              triggerSound("correct");
                            }}
                            className={`px-3 py-1.5 text-xs font-black border-2 border-black rounded-lg transition-all ${
                              pizzaSlices === num ? "bg-[#FF6B6B] text-white" : "bg-stone-50"
                            }`}
                            id={`btn_pizza_preset_${num}`}
                          >
                            1 / {num} 피자
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
                      <span className="text-xl">🦊</span>
                      <p className="text-[11px] font-bold text-rose-700 leading-normal">
                        "아기여우 에밀리가 한 조각을 들고 갔어요! 전체의 분수 {`1/${pizzaSlices}`} 만큼 피자 치즈가 쭉 늘어났답니다!"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACORN WEIGHT BEAM SCALE PLAYGROUND */}
            {playgroundMode === "scale" && (
              <div className="space-y-6" id="scale_playground_container">
                <div className="bg-sky-50 p-4 rounded-2xl border-2 border-black">
                  <h4 className="text-lg font-black text-sky-800">⚖️ 대원 전사 도토리 무게 저울 판</h4>
                  <p className="text-xs font-bold text-stone-600 mt-1 leading-normal">
                    왼쪽 저울과 오른쪽 저울을 똑같이 맞춰서 마법 수식의 균형 원리를 배워요! (덧셈의 수식 평형)
                  </p>
                </div>

                <div className="py-8 bg-sky-100/30 rounded-[32px] border-3 border-dashed border-sky-200 flex flex-col items-center justify-center relative">
                  
                  {/* Balance Beam Animation (Rotates slightly depending on weight mismatch) */}
                  {(() => {
                    const diff = sumRightWeights - leftScaleWeight;
                    const rotationDeg = Math.min(Math.max(diff * 3, -15), 15);

                    return (
                      <div className="w-full flex flex-col items-center justify-center pt-8">
                        
                        {/* Dynamic balanced status quote */}
                        <div className="absolute top-4 bg-white border-2 border-black px-4 py-1 rounded-full text-xs font-black shadow-[2px_2px_0px_#000]">
                          {diff === 0 ? (
                            <span className="text-emerald-600">✨ 어썸! 저울이 완벽하게 맞아떨어졌어요! (등식 성립) ✨</span>
                          ) : diff > 0 ? (
                            <span className="text-red-500">오른쪽이 분량 초과로 무거워요 ({diff}만큼 무거움)</span>
                          ) : (
                            <span className="text-indigo-600">왼쪽이 {Math.abs(diff)}만큼 아직 더 두툼하고 무거워요</span>
                          )}
                        </div>

                        {/* Balance Beam Arm */}
                        <div 
                          style={{ transform: `rotate(${rotationDeg}deg)` }}
                          className="w-80 h-3 bg-stone-700 border-2 border-black rounded-full relative transition-transform duration-300 flex justify-between px-2 items-center"
                        >
                          {/* Left Tray */}
                          <div className="absolute -left-12 -top-12 w-24 h-24 flex flex-col items-center justify-end origin-center">
                            <div className="bg-white border-2 border-black w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                              <span className="text-lg">🐿️</span>
                              <span className="text-xs font-black font-mono text-amber-800">{leftScaleWeight} kg</span>
                            </div>
                            <div className="w-16 h-1 bg-stone-800 border border-black rounded" />
                          </div>

                          {/* Center Fulcrum */}
                          <div className="w-6 h-6 bg-[#FF6B6B] border-3 border-black rounded-full z-10 mx-auto" />

                          {/* Right Tray */}
                          <div className="absolute -right-12 -top-12 w-24 h-24 flex flex-col items-center justify-end origin-center">
                            <div className="bg-white border-2 border-black w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-[2px_2px_0px_#000] relative">
                              <span className="text-lg">🌰</span>
                              <span className="text-xs font-black font-mono text-emerald-800">{sumRightWeights} kg</span>
                            </div>
                            <div className="w-16 h-1 bg-stone-800 border border-black rounded" />
                          </div>
                        </div>

                        {/* Stand */}
                        <div className="w-4 h-20 bg-stone-600 border-2 border-black -mt-0.5" />
                        <div className="w-32 h-4 bg-[#FFD93D] border-3 border-black rounded-t-xl" />
                      </div>
                    );
                  })()}

                  {/* Interaction Control Box */}
                  <div className="w-full max-w-lg mt-8 px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left weight display */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-black">
                      <span className="text-xs font-bold text-stone-500 block">원래 목표 무게 (왼쪽)</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-2xl font-black font-mono text-stone-800">{leftScaleWeight} 도토리</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setLeftScaleWeight(prev => Math.max(prev - 2, 2));
                              triggerSound("incorrect");
                            }}
                            className="w-8 h-8 rounded border-2 border-black bg-stone-50 text-base font-black cursor-pointer align-middle"
                            id="btn_left_weight_minus"
                          >
                            -
                          </button>
                          <button
                            onClick={() => {
                              setLeftScaleWeight(prev => Math.min(prev + 2, 30));
                              triggerSound("correct");
                            }}
                            className="w-8 h-8 rounded border-2 border-black bg-stone-50 text-base font-black cursor-pointer align-middle"
                            id="btn_left_weight_plus"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-2 font-semibold">왼쪽 목표의 숫자를 바꿔 실험해보세요.</p>
                    </div>

                    {/* Right weight controller */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-black">
                      <span className="text-xs font-bold text-stone-500 block">내가 쌓은 저울추 (오른쪽)</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rightScaleWeights.map((w, i) => (
                          <button
                            key={i}
                            title="클릭하면 저울추가 제거됩니다"
                            onClick={() => {
                              setRightScaleWeights(prev => prev.filter((_, idx) => idx !== i));
                              triggerSound("incorrect");
                            }}
                            className="bg-[#4ECDC4] border border-black text-black px-2 py-1 text-xs font-black rounded-lg cursor-pointer hover:bg-red-200"
                            id={`btn_right_weight_item_${i}`}
                          >
                            {w}g ✕
                          </button>
                        ))}
                        {rightScaleWeights.length === 0 && (
                          <span className="text-xs text-stone-400">저울추가 완전히 텅 비어있어요!</span>
                        )}
                      </div>

                      {/* Add weights templates */}
                      <div className="border-t border-dashed border-stone-200 mt-3 pt-2.5">
                        <span className="text-[10px] block font-bold text-stone-400 mb-1">무게추 추가하기:</span>
                        <div className="flex gap-1">
                          {[1, 2, 5, 10].map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                setRightScaleWeights(prev => [...prev, num]);
                                triggerSound("correct");
                              }}
                              className="bg-stone-100 hover:bg-stone-200 border-2 border-stone-300 text-[10px] font-black px-1.5 py-1 rounded cursor-pointer"
                              id={`btn_add_weight_preset_${num}`}
                            >
                              +{num}g
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setRightScaleWeights([]);
                              triggerSound("incorrect");
                            }}
                            className="text-[10px] text-red-500 font-bold ml-auto cursor-pointer border border-stone-200 px-1 hover:bg-red-50"
                            id="btn_clear_weights"
                          >
                            비우기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sumRightWeights === leftScaleWeight && (
                    <div className="absolute bottom-2 bg-yellow-400 border-2 border-black px-3.5 py-1 rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] animate-bounce text-black">
                      🎉 훌륭해요! {leftScaleWeight} = {rightScaleWeights.join(" + ")} 수식이 맞았어요! 🌰
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Quick interactive math trivia or cheat card */}
          <div className="bg-[#4ECDC4] p-5 rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="bg-black text-[#4ECDC4] text-[10px] font-black px-2 py-1 rounded border border-black font-mono">숲속 팁</span>
              <h4 className="text-xl font-black mt-2 leading-tight">곱셈 구구단 쉽게 잡기!</h4>
              <p className="text-xs font-bold leading-relaxed text-stone-800 mt-1">
                곱하기는 똑같은 상자를 여러 번 더하는 지름길이에요! 예를 들어 3마리의 아기 다람쥐가 각각 도토리 5개씩 받았다면 <span className="font-bold underline">3 ✕ 5 = 15</span>가 돼요! 🌰
              </p>
            </div>
            
            <div className="bg-white/80 p-3 rounded-2xl border-2 border-black flex flex-col justify-between">
              <span className="text-[11px] block font-black border-b border-black pb-1 mb-2">⭐ 오늘의 꿀팁 상식 스피드 퀴즈:</span>
              <span className="text-sm font-black leading-tight text-center block text-[#E25C5C] my-2 font-jua">
                "0에 어떤 어마어마한 숫자를 곱하든, 결국 대답은 무조건 0이 된답니다!"
              </span>
              <span className="text-[9px] font-bold text-stone-500 text-right">토리쌤 마법수첩 수록</span>
            </div>
          </div>
          
        </main>
      </div>

      {/* Companion chat drawer component placed beautifully inside (Fixed side/Bottom layout) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        <div className="bg-white border-4 border-black rounded-[40px] shadow-[12px_12px_0px_0px_#000] overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Chat Mascot introduction column */}
          <div className="md:col-span-4 bg-[#FFD93D] p-6 border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full border-3 border-black bg-white flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000]">
                  🐿️
                </div>
                <div>
                  <h3 className="text-xl font-black font-jua leading-tight">토리의 무전기 주파수</h3>
                  <p className="text-xs font-bold text-stone-700">단짝 도토리 친구와 대화하자!</p>
                </div>
              </div>
              
              <div className="bg-white/70 p-4 rounded-2xl border-2 border-black text-xs font-bold leading-normal">
                "안녕! 나는 수학 탐험대의 영리한 도우미🐿️ 다람쥐 '토리'야! 수학에 관한 이야기도 좋고 귀엽다는 이야기, 속상했던 일까지 무엇이든 다정하게 번개 리액션 해줄게!"
              </div>
            </div>

            {/* Quick Suggestion buttons for children - eliminates hard typing */}
            <div className="mt-6 space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-500 block">👇 원클릭 무전 날리기!</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("안녕 토리! 구구단 2단 놀이를 신나게 해보자!")}
                  className="bg-white hover:bg-stone-50 border-2 border-black text-[10px] font-black py-1.5 px-2 rounded-xl text-left truncate cursor-pointer"
                  id="btn_chat_quick_1"
                >
                  🐿️ 구구단 놀이하자
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("오늘 학원 끝나고 수학 100점을 받았어!")}
                  className="bg-white hover:bg-stone-50 border-2 border-black text-[10px] font-black py-1.5 px-2 rounded-xl text-left truncate cursor-pointer"
                  id="btn_chat_quick_2"
                >
                  🎉 수학 100점 인증
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("나 공부하기 싫어지는데 엄청난 칭찬 한 문장 해줘!")}
                  className="bg-white hover:bg-stone-50 border-2 border-black text-[10px] font-black py-1.5 px-2 rounded-xl text-left truncate cursor-pointer"
                  id="btn_chat_quick_3"
                >
                  💖 폭풍 동기부여칭찬
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("수학 더하기 빼기를 세상에서 가장 쉽게 알려줘!")}
                  className="bg-white hover:bg-stone-50 border-2 border-black text-[10px] font-black py-1.5 px-2 rounded-xl text-left truncate cursor-pointer"
                  id="btn_chat_quick_4"
                >
                  🍉 덧셈이 왜 쉬울까?
                </button>
              </div>
            </div>
          </div>

          {/* Active Chat panel column */}
          <div className="md:col-span-8 flex flex-col h-[400px] bg-stone-50">
            {/* Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3" id="chat_scroll_viewport">
              {chatMessages.map((msg) => {
                const isTori = msg.role === "assistant";
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[85%] ${isTori ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {isTori && (
                      <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4ECDC4] flex items-center justify-center text-base shrink-0">
                        🐿️
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className={`p-3.5 rounded-2xl text-sm font-bold border-2 border-black leading-relaxed shadow-[2px_2px_0px_#000] ${
                        isTori 
                          ? "bg-white text-[#3F3A36]" 
                          : "bg-[#FF6B6B] text-white"
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-stone-400 font-mono block text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div className="flex gap-3 mr-auto items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4ECDC4] flex items-center justify-center text-base animate-spin">
                    🐿️
                  </div>
                  <div className="bg-white border-2 border-black px-4 py-2 rounded-2xl text-xs font-bold text-stone-500 animate-pulse">
                    토리가 도토리 통 속에 숨겨진 해답을 뒤적이며 신나게 생각하고 있어요... ✨
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Form Footer */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-3 border-t-4 border-black bg-white flex gap-2 items-center"
              id="form_chat"
            >
              <input
                type="text"
                placeholder="토리에게 직접 궁금한 수식이나 말을 걸어볼까요? (예: 5 + 6에 대해 힌트)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 px-4 py-2.5 border-2 border-stone-300 rounded-xl font-bold text-sm bg-stone-50 focus:bg-white focus:border-black outline-none transition-all placeholder:text-stone-400"
                id="input_chat_text"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-[#4ECDC4] hover:bg-[#3fb8b0] text-black border-2 border-black px-4 py-2.5 rounded-xl font-black text-sm shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all fancy-button cursor-pointer shrink-0"
                id="btn_chat_send"
              >
                무전 송신!
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Edit Nickname Modal Overlay */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal_nickname_overlay">
          <div className="bg-white border-4 border-black p-6 rounded-[32px] shadow-[8px_8px_0px_#000] max-w-sm w-full relative">
            <h3 className="text-2xl font-black font-jua mb-3 flex items-center gap-1.5 text-coral-500">
              <Smile className="w-6 h-6 text-yellow-500" />
              나만의 수학 전사 이름
            </h3>
            <p className="text-xs font-semibold text-stone-500 mb-4 leading-normal">
              토리 쌤이 수학 문제에서 대원님 이름을 다정하게 불러줄 수 있게 귀여운 별명을 입력해 주세요!
            </p>

            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="예: 용기짱 사자, 꼬마 천재"
              maxLength={12}
              className="w-full px-4 py-2 border-2 border-black rounded-xl font-bold bg-stone-50 mb-4 focus:bg-white"
              id="input_modal_nickname"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-black cursor-pointer text-stone-500"
                id="btn_modal_cancel"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempName.trim()) {
                    setProfile(prev => ({ ...prev, nickname: tempName.trim() }));
                    setShowNameModal(false);
                    triggerSound("correct");
                  }
                }}
                className="px-4 py-2 bg-[#FFD93D] border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer"
                id="btn_modal_confirm"
              >
                수정 완료!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

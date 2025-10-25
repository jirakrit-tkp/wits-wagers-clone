import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import QuestionCard from "@/components/QuestionCard";

export default function RoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const socketRef = useRef(null);
  const clientIdRef = useRef(null); // Will be set in useEffect

  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [guess, setGuess] = useState("");
  const [answers, setAnswers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [colorKey, setColorKey] = useState("sky-500");
  const [phase, setPhase] = useState("lobby");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(7);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);

  const colorOptions = ["red-500", "amber-500", "emerald-500", "sky-500", "violet-500", "rose-500"];
  const colorKeyToBg = {
    "red-500": "bg-red-500",
    "amber-500": "bg-amber-500",
    "emerald-500": "bg-emerald-500",
    "sky-500": "bg-sky-500",
    "violet-500": "bg-violet-500",
    "rose-500": "bg-rose-500",
  };

  // Redirect to lobby if phase is lobby
  useEffect(() => {
    if (phase === "lobby" && id) {
      console.log("[Room] Redirecting to lobby");
      router.push(`/room/${id}/lobby`);
    }
  }, [phase, id, router]);

  useEffect(() => {
    if (!id) return;
    
    // Initialize clientId if not already set
    if (!clientIdRef.current) {
      clientIdRef.current = `${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
    }
    
    // Check if user is host from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const isHostParam = urlParams.get("host") === "true";
    const hostIdParam = urlParams.get("hostId");
    
    // Try to restore from sessionStorage (for refresh case)
    const storageKey = `room_${id}`;
    const savedData = sessionStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        console.log("🔄 Restored from sessionStorage:", parsed);
        
        if (parsed.isHost) {
          setIsHost(true);
          setHostId(parsed.hostId);
          clientIdRef.current = parsed.hostId; // Use saved hostId
          setJoined(true);
          setIsRejoining(true);
          console.log(`🔑 Host using saved ID: ${parsed.hostId}`);
        } else if (parsed.playerId && parsed.nickname) {
          setIsHost(false);
          clientIdRef.current = parsed.playerId; // Use saved playerId!
          setNickname(parsed.nickname);
          setColorKey(parsed.color || "sky-500");
          setJoined(true);
          setIsRejoining(true);
          console.log(`🔑 Player will rejoin with SAVED ID: ${parsed.playerId}`);
        }
      } catch (e) {
        console.error("Failed to parse saved data:", e);
      }
    } else if (isHostParam && hostIdParam) {
      // New host session
      setIsHost(true);
      setHostId(hostIdParam);
      clientIdRef.current = hostIdParam;
      
      // Save to sessionStorage
      sessionStorage.setItem(storageKey, JSON.stringify({
        isHost: true,
        hostId: hostIdParam,
        roomId: id
      }));
      console.log(`🆕 New host with ID: ${hostIdParam}`);
    } else {
      console.log(`🆕 New player with ID: ${clientIdRef.current}`);
    }
    
    fetch("/api/socketio").finally(() => {
      const s = io({ path: "/socket.io", transports: ["websocket", "polling"] });
      socketRef.current = s;
      
      // Wait for socket to connect before joining
      s.on("connect", () => {
        console.log("Socket connected:", s.id);
        
        const storageKey = `room_${id}`;
        const savedData = sessionStorage.getItem(storageKey);
        const parsed = savedData ? JSON.parse(savedData) : null;
        
        // Handle host (new or rejoining)
        if ((isHostParam && hostIdParam) || (parsed && parsed.isHost)) {
          const activeHostId = hostIdParam || parsed.hostId;
          
          // First create the room (will check if exists)
          s.emit("createRoom", { 
            roomId: id, 
            hostId: activeHostId
          });
          
          // Then join it
          setTimeout(() => {
            s.emit("joinRoom", { 
              roomId: id, 
              isHost: true,
              hostId: activeHostId
            });
          }, 100); // Small delay to ensure room is created first
          
          setJoined(true);
        }
        // Handle player rejoining after refresh
        else if (parsed && parsed.playerId && parsed.nickname) {
          console.log(`🔄 Player rejoining: ${parsed.nickname} with ID: ${parsed.playerId}`);
          console.log(`📍 clientIdRef.current = ${clientIdRef.current}`);
          setTimeout(() => {
            s.emit("joinRoom", { 
              roomId: id, 
              player: { 
                id: parsed.playerId, // Use saved ID from sessionStorage
                name: parsed.nickname, 
                color: parsed.color 
              },
              isHost: false
            });
            console.log(`✉️ Emitted joinRoom with ID: ${parsed.playerId}`);
          }, 100);
        }
      });
      
      // Listen for room updates
      s.on("roomUpdate", (room) => {
        console.log("Room updated:", room);
        setPhase(room.phase);
        setCurrentQuestion(room.currentQuestion);
        setCurrentRound(room.currentRound);
        setTotalRounds(room.totalRounds);
      });
      
      // Listen for players update
      s.on("playersUpdate", (data) => {
        console.log("Players updated:", data);
        setPlayers(Array.isArray(data) ? data : []);
        
        // Mark rejoining as complete
        setIsRejoining(false);
      });

      // Listen for answers update
      s.on("answersUpdate", (data) => {
        console.log("Answers updated:", data);
        setAnswers(Array.isArray(data) ? data : []);
      });
      
      // Listen for game started
      s.on("gameStarted", (data) => {
        console.log("Game started:", data);
        setPhase(data.phase);
        setCurrentQuestion(data.question);
        setCurrentRound(data.round);
        setHasSubmitted(false);
        setGuess("");
        setRoundResult(null);
      });
      
      // Listen for next round
      s.on("nextRound", (data) => {
        console.log("Next round:", data);
        if (data.phase === "finished") {
          setPhase("finished");
        } else {
          setPhase(data.phase);
          setCurrentQuestion(data.question);
          setCurrentRound(data.round);
          setHasSubmitted(false);
          setGuess("");
          setRoundResult(null);
        }
      });
      
      // Listen for round result
      s.on("roundResult", (result) => {
        console.log("Round result:", result);
        setRoundResult(result);
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  const joinRoom = () => {
    // Host doesn't need a nickname, auto-join (handled in connect event)
    if (isHost) {
      return;
    }

    // Players must have a nickname
    if (!nickname.trim()) return;
    
    const socket = socketRef.current;
    if (!socket) return;

    // Save player data to sessionStorage
    const storageKey = `room_${id}`;
    sessionStorage.setItem(storageKey, JSON.stringify({
      isHost: false,
      playerId: clientIdRef.current,
      nickname: nickname.trim(),
      color: colorKey,
      roomId: id
    }));

    // If socket is already connected, join immediately
    if (socket.connected) {
      console.log(`🔌 Socket already connected, joining room with ID: ${clientIdRef.current}...`);
      socket.emit("joinRoom", { 
        roomId: id, 
        player: { id: clientIdRef.current, name: nickname.trim(), color: colorKey },
        isHost: false
      });
      setJoined(true);
    } else {
      // Wait for connection, then join
      console.log("⏳ Waiting for socket to connect...");
      socket.once("connect", () => {
        console.log(`✅ Socket connected, joining room with ID: ${clientIdRef.current}...`);
        socket.emit("joinRoom", { 
          roomId: id, 
          player: { id: clientIdRef.current, name: nickname.trim(), color: colorKey },
          isHost: false
        });
    setJoined(true);
      });
    }
  };

  const submitAnswer = () => {
    const numericGuess = Number(guess);
    if (!Number.isFinite(numericGuess)) return;
    socketRef.current?.emit("submitAnswer", { roomId: id, playerId: clientIdRef.current, guess: numericGuess });
    setHasSubmitted(true);
    setGuess("");
  };

  const getPhaseDisplay = () => {
    const phaseLabels = {
      lobby: "🎮 กำลังรอเริ่มเกม...",
      question: "❓ ตอบคำถาม",
      reveal: "✨ เฉลยคำตอบ",
      wager: "💰 ลงเดิมพัน",
      scoring: "📊 คำนวณคะแนน",
      finished: "🏆 จบเกม"
    };
    return phaseLabels[phase] || phase;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-100 via-blue-50 to-purple-100 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Circles */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-yellow-200/30 rounded-full blur-xl" />
        <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-purple-200/30 rounded-full blur-xl" />
        <div className="absolute bottom-40 right-1/3 w-36 h-36 bg-pink-200/30 rounded-full blur-xl" />
      </div>

      {/* Header - ซ่อนใน lobby phase */}
      {phase !== "lobby" && (
        <header className="relative z-10 max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-900">Room {id}</h1>
            <p className="text-sm text-blue-900/60 mt-1">{getPhaseDisplay()}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-white/80 hover:bg-white text-gray-700 text-sm px-5 py-2 shadow-md transition"
          >
            ← Back
          </button>
        </header>
      )}

      <section className="relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
        {/* Lobby Phase - Full Width */}
        {phase === "lobby" ? (
          <div className="md:col-span-3 space-y-6">
            {/* Lobby Content */}
            <article className="rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-200 p-6">
              {/* Lobby Phase - Kahoot Style */}
              {isRejoining ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔄</div>
                  <h2 className="text-2xl font-bold text-blue-900 mb-2">
                    กำลังเชื่อมต่อใหม่...
                  </h2>
                  <p className="text-blue-900/60">กรุณารอสักครู่</p>
                </div>
              ) : !joined && !isHost ? (
                <div className="flex flex-col gap-4">
                  <label htmlFor="nickname" className="sr-only">Nickname</label>
                  <input
                    id="nickname"
                    type="text"
                    placeholder="ใส่ชื่อของคุณ"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    className="flex-1 rounded-full border border-blue-300 px-5 py-3 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                  />
                  <div>
                    <p className="text-blue-900/80 text-sm mb-2">เลือกสีของคุณ</p>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setColorKey(key)}
                          aria-label={`choose ${key}`}
                          className={`h-8 w-8 rounded-full border-2 ${colorKey === key ? 'border-blue-900 scale-105' : 'border-transparent'} transition ${colorKeyToBg[key]}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={joinRoom}
                    className="rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 shadow-md transition"
                  >
                    เข้าร่วมห้อง
                  </button>
                </div>
              ) : (
                  <div className="min-h-[600px] flex flex-col py-8">
                    {/* 1. Game PIN - ข้างบนสุด */}
                    <div className="text-center mb-8">
                      <p className="text-gray-600 text-sm mb-2 font-medium">Game PIN</p>
                      <div className="bg-white rounded-xl shadow-lg px-16 py-6 inline-block">
                        <p className="text-8xl font-black text-gray-800 tracking-wider font-mono">
                          {id}
                        </p>
                      </div>
                    </div>

                    {/* 2. จำนวน Players และปุ่ม - w-full between */}
                    <div className="w-full flex items-center justify-between mb-8 px-4">
                      {/* ซ้าย: จำนวน Players */}
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span className="text-2xl font-bold text-gray-800">{players.length}</span>
                        <span className="text-gray-600">Players</span>
                      </div>

                      {/* ขวา: ปุ่ม Start (Host) หรือ Back (Player) */}
                      {isHost ? (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("startGame", { roomId: id })}
                          className="rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 transition shadow-lg"
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push("/")}
                          className="rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2.5 transition"
                        >
                          Back
                        </button>
                      )}
                    </div>

                    {/* 3. Player Names - flex row grid */}
                    <div className="flex-1 overflow-y-auto px-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {players.map((p, i) => {
                          const playerName = typeof p === "object" ? p.name ?? "Player" : String(p);
                          return (
                            <div
                              key={i}
                              className="bg-white rounded-lg shadow-md px-6 py-4 text-center font-semibold text-gray-800 hover:shadow-lg transition"
                            >
                              {playerName}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Waiting Message */}
                      {!isHost && (
                        <div className="text-center mt-8">
                          <p className="text-gray-600 text-lg">Waiting for host to start...</p>
                        </div>
                      )}
                    </div>
                  </div>
              )}
            </article>
          </div>
        ) : (
          /* Other Phases - with Sidebar */
          <>
            <div className="md:col-span-2 space-y-6">
              {/* Host Controls (Simple Inline) */}
              {isHost && (
                <article className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold">
                      Host Controls - {phase === "question" ? "Question Phase" : phase === "reveal" ? "Reveal Phase" : "Game"}
                    </div>
                    <div className="flex gap-2">
                      {phase === "question" && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("revealAnswer", { roomId: id })}
                          className="rounded-md bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 text-sm transition"
                        >
                          Reveal Answer
                        </button>
                      )}
                      {phase === "reveal" && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("nextRound", { roomId: id })}
                          className="rounded-md bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 text-sm transition"
                        >
                          Next Round
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )}

              {/* Main Game Area */}
              <article className="rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-200 p-6">
                {isRejoining && (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🔄</div>
                    <h2 className="text-2xl font-bold text-blue-900 mb-2">
                      กำลังเชื่อมต่อใหม่...
                    </h2>
                    <p className="text-blue-900/60">กรุณารอสักครู่</p>
                  </div>
                )}

                {!isRejoining && !joined && !isHost && (
                  <div className="flex flex-col gap-4">
                    <label htmlFor="nickname" className="sr-only">Nickname</label>
                    <input
                      id="nickname"
                      type="text"
                      placeholder="ใส่ชื่อของคุณ"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                      className="flex-1 rounded-full border border-blue-300 px-5 py-3 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                    />
                    <div>
                      <p className="text-blue-900/80 text-sm mb-2">เลือกสีของคุณ</p>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setColorKey(key)}
                            aria-label={`choose ${key}`}
                            className={`h-8 w-8 rounded-full border-2 ${colorKey === key ? 'border-blue-900 scale-105' : 'border-transparent'} transition ${colorKeyToBg[key]}`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={joinRoom}
                      className="rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 shadow-md transition"
                    >
                      เข้าร่วมห้อง
                    </button>
                  </div>
                )}

                {(joined || isHost) && (
                  <div className="space-y-6">
                    {/* Question Phase */}
                    {phase === "question" && (
                  <>
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                    />
                    
                    {/* Host cannot answer - only players can */}
                    {!isHost && (
                      !hasSubmitted ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label htmlFor="guess" className="sr-only">คำตอบของคุณ</label>
                <input
                  id="guess"
                  type="number"
                            placeholder="ใส่คำตอบเป็นตัวเลข"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                  className="flex-1 rounded-full border border-blue-300 px-5 py-3 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                />
                <button
                  type="button"
                  onClick={submitAnswer}
                  className="rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-md transition"
                >
                            ส่งคำตอบ
                </button>
              </div>
                      ) : (
                        <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200">
                          <span className="text-green-700 font-semibold">✓ ส่งคำตอบแล้ว</span>
                        </div>
                      )
                    )}

              <div>
                      <h3 className="text-blue-900 font-semibold mb-2">คำตอบที่ส่งแล้ว ({answers.length}/{players.length})</h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {answers.map((a, i) => {
                          const player = players.find(p => p.id === a.playerId);
                          return (
                    <li key={i} className="rounded-lg bg-blue-50 text-blue-900 text-sm px-3 py-2 shadow">
                              <div className="flex items-center gap-2 mb-1">
                                {player && (
                                  <span className={`inline-flex h-2 w-2 rounded-full ${colorKeyToBg[player.color] || 'bg-gray-400'}`} />
                                )}
                                <span className="font-semibold text-xs">{player?.name || "???"}</span>
                              </div>
                              <div className="font-bold">{a.guess}</div>
                    </li>
                          );
                        })}
                </ul>
                    </div>
                  </>
                )}

                {/* Reveal Phase */}
                {phase === "reveal" && roundResult && (
                  <div className="space-y-6">
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                    />
                    
                    <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300 p-6 text-center">
                      <div className="text-5xl mb-3">✨</div>
                      <h3 className="text-lg text-green-900/60 mb-2">คำตอบที่ถูกต้อง</h3>
                      <p className="text-4xl font-bold text-green-900 mb-4">{roundResult.correctAnswer}</p>
                      {currentQuestion?.explanation && (
                        <p className="text-sm text-green-900/70">{currentQuestion.explanation}</p>
                      )}
                      {currentQuestion?.source && (
                        <p className="text-xs text-green-900/50 mt-2">แหล่งอ้างอิง: {currentQuestion.source}</p>
                      )}
                    </div>

                    {roundResult.winner && (
                      <div className="rounded-xl bg-yellow-100 border border-yellow-300 p-4 text-center">
                        <p className="text-yellow-900 font-semibold">
                          🏆 คำตอบที่ใกล้ที่สุด: <span className="font-bold">{roundResult.winner.guess}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Finished Phase */}
                {phase === "finished" && (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-3xl font-bold text-blue-900 mb-4">จบเกม!</h2>
                    <p className="text-blue-900/60 mb-6">ดูกระดานคะแนนด้านข้าง</p>
                  </div>
                )}
                  </div>
                )}
              </article>
            </div>

            {/* Players Sidebar - Kahoot Style */}
            <aside className="rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blue-900 font-bold text-lg">ผู้เล่น</h3>
            <div className="flex items-center gap-1 bg-blue-100 rounded-full px-3 py-1">
              <span className="text-blue-900 font-bold">{players.length}</span>
            </div>
          </div>
          
          {players.length === 0 ? (
            <div className="text-center py-12 text-blue-900/50 text-sm">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-semibold">ยังไม่มีผู้เล่น</p>
              <p className="text-xs mt-2">รอผู้เล่นเข้าร่วม...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {players.map((p, i) => {
                const playerColor = p && typeof p === 'object' && p.color ? colorKeyToBg[p.color] ?? 'bg-gray-400' : 'bg-gray-400';
                const playerName = typeof p === "object" ? p.name ?? "Player" : String(p);
                const playerScore = roundResult?.scores?.[p.id] || 0;
                
                return (
                  <div 
                    key={i} 
                    className="group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl px-4 py-3 transition-all hover:shadow-md hover:scale-[1.02] border border-blue-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Player Color Badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${playerColor} shadow-md flex items-center justify-center text-white font-bold text-xs`}>
                          {i + 1}
                        </div>
                        
                        {/* Player Name */}
                        <span className="text-blue-900 font-semibold truncate">
                          {playerName}
                        </span>
                      </div>
                      
                      {/* Score Badge (if game started) */}
                      {roundResult?.scores && (
                        <div className="flex-shrink-0 bg-yellow-400 text-blue-900 font-bold text-sm px-3 py-1 rounded-full shadow-sm">
                          {playerScore}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </aside>
          </>
        )}
      </section>
    </main>
  );
}

RoomPage.displayName = "RoomPage";

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketManager";
import QuestionCard from "@/components/QuestionCard";
import WagerPhase from "@/components/WagerPhase";
import PayoutPhase from "@/components/PayoutPhase";

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
  
  // New state for chip-based game
  const [chips, setChips] = useState({});
  const [answerTiles, setAnswerTiles] = useState([]);
  const [payoutResult, setPayoutResult] = useState(null);
  const [currentBets, setCurrentBets] = useState([]);
  const [confirmedWagers, setConfirmedWagers] = useState([]);
  const [zeroChipPlayers, setZeroChipPlayers] = useState([]);

  const colorOptions = ["red-500", "amber-500", "emerald-500", "sky-500", "violet-500", "rose-500"];
  const colorKeyToBg = {
    "red-500": "bg-red-500",
    "amber-500": "bg-amber-500",
    "emerald-500": "bg-emerald-500",
    "sky-500": "bg-sky-500",
    "violet-500": "bg-violet-500",
    "rose-500": "bg-rose-500",
  };

  // No auto-redirect needed - lobby.js handles redirect to game page when started
  // This page just shows game content when phase !== "lobby"

  useEffect(() => {
    console.log(`[Room] useEffect triggered for room: ${id}, phase: ${phase}`);
    if (!id) return;
    
    // Prevent multiple initializations
    if (socketRef.current) {
      console.log("[Room] Socket already initialized, skipping");
      return;
    }
    
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
    
    // Use singleton socket
    getSocket().then((s) => {
      socketRef.current = s;
      
      // Remove old listeners first to prevent duplicates
      s.off("connect");
      s.off("roomUpdate");
      s.off("playersUpdate");
      s.off("answersUpdate");
      s.off("gameStarted");
      s.off("nextRound");
      s.off("roundResult");
      s.off("chipsUpdate");
      s.off("answersRevealed");
      s.off("betsUpdate");
      s.off("payoutResult");
      s.off("wagersConfirmed");
      s.off("confirmWagerError");
      
      // Set up ALL event listeners FIRST before joining
      // Listen for room updates
      s.on("roomUpdate", (room) => {
        console.log("[Room] roomUpdate event - phase:", room.phase, "round:", room.currentRound);
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
      
      // Listen for round result (legacy - keep for backwards compatibility)
      s.on("roundResult", (result) => {
        console.log("Round result:", result);
        setRoundResult(result);
      });
      
      // Listen for chips updates
      s.on("chipsUpdate", (updatedChips) => {
        console.log("[Room] Chips updated:", updatedChips);
        setChips(updatedChips);
      });
      
      // Listen for answers revealed (transition to wager phase)
      s.on("answersRevealed", (data) => {
        console.log("[Room] Answers revealed, transitioning to wager phase:", data);
        setAnswerTiles(data.answerTiles || []);
        setPhase(data.phase || 'wager');
        setZeroChipPlayers(data.zeroChipPlayers || []);
        setConfirmedWagers([]); // 🔴 Reset confirmed wagers when entering new wager phase
        setCurrentBets([]); // 🔴 Also reset current bets for new round
      });
      
      // Listen for bets updates
      s.on("betsUpdate", (data) => {
        console.log("[Room] Bets updated:", data);
        setCurrentBets(data.bets || []);
        if (data.chips) {
          setChips(data.chips);
        }
      });
      
      // Listen for payout results
      s.on("payoutResult", (result) => {
        console.log("[Room] Payout result:", result);
        setPayoutResult(result);
        setAnswerTiles(result.answerTiles || []);
      });
      
      // Listen for wagers confirmed
      s.on("wagersConfirmed", (data) => {
        console.log("[Room] Wagers confirmed:", data);
        setConfirmedWagers(data.confirmedWagers || []);
      });
      
      // Listen for confirm wager errors
      s.on("confirmWagerError", (data) => {
        console.error("[Room] Confirm wager error:", data.error);
        alert(data.error);
      });
      
      // NOW define the join function AFTER all listeners are set
      const handleRoomJoin = () => {
        const storageKey = `room_${id}`;
        const savedData = sessionStorage.getItem(storageKey);
        const parsed = savedData ? JSON.parse(savedData) : null;
        
        // Handle host (new or rejoining)
        if ((isHostParam && hostIdParam) || (parsed && parsed.isHost)) {
          const activeHostId = hostIdParam || parsed.hostId;
          
          console.log(`[Room] Host creating/joining room ${id} with hostId: ${activeHostId}`);
          
          // First create the room (will check if exists)
          s.emit("createRoom", { 
            roomId: id, 
            hostId: activeHostId
          });
          
          // Then join it
          s.emit("joinRoom", { 
            roomId: id, 
            isHost: true,
            hostId: activeHostId
          });
          
          setJoined(true);
          setIsRejoining(false);
        }
        // Handle player rejoining after refresh
        else if (parsed && parsed.playerId && parsed.nickname) {
          console.log(`[Room] Player rejoining: ${parsed.nickname} with ID: ${parsed.playerId}`);
          s.emit("joinRoom", { 
            roomId: id, 
            player: { 
              id: parsed.playerId,
              name: parsed.nickname, 
              color: parsed.color 
            },
            isHost: false
          });
          setIsRejoining(false);
        }
      };
      
      // Listen for connect events
      s.on("connect", () => {
        console.log("[Room] Socket connected:", s.id);
        handleRoomJoin();
      });
      
      // If socket is already connected, join immediately
      if (s.connected) {
        console.log("[Room] Socket already connected, joining room immediately");
        handleRoomJoin();
        
        // Request current room state to ensure we have latest data
        console.log("[Room] Requesting room state update");
        setTimeout(() => {
          s.emit("requestRoomState", { roomId: id });
        }, 100);
      }
    });

    // Don't disconnect on unmount - socket is managed by socketManager singleton
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

  const placeBet = (tileIndex, amount) => {
    if (!socketRef.current || !clientIdRef.current) return;
    console.log(`[Room] Placing bet: ${amount} chips on tile ${tileIndex}`);
    socketRef.current.emit("placeBet", { 
      roomId: id, 
      playerId: clientIdRef.current, 
      tileIndex, 
      amount 
    });
  };

  const confirmWagers = () => {
    if (!socketRef.current || !clientIdRef.current) return;
    console.log(`[Room] Confirming wagers for player ${clientIdRef.current}`);
    socketRef.current.emit("confirmWagers", {
      roomId: id,
      playerId: clientIdRef.current
    });
  };

  const getPhaseDisplay = () => {
    const phaseLabels = {
      lobby: "🎮 Waiting to Start...",
      question: "❓ Answer Question",
      reveal: "✨ Reveal Answer",
      wager: "💰 Place Wagers",
      payout: "🎉 Results",
      scoring: "📊 Calculate Score",
      finished: "🏆 Game Finished"
    };
    return phaseLabels[phase] || phase;
  };

  return (
    <main className="min-h-screen bg-yellow-200 relative overflow-hidden flex flex-col">
      {/* Radial gradient base - like landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,#fde047_0%,#facc15_35%,#eab308_60%,#ca8a04_100%)] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_35%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.25)_100%)]"
      />

      {/* No header needed - Room PIN in sidebar */}

      <section className="relative z-10 flex-1 flex flex-col md:flex-row gap-0">
        {/* Game Phases Only - Lobby is in separate page */}
        {phase !== "lobby" && (
          <>
            {/* Sidebar - Left (Black) */}
            <aside className="md:w-64 lg:w-72 bg-black text-white flex-shrink-0">
              {/* Desktop Sidebar Content */}
              <div className="hidden md:block p-6 space-y-6">
                {/* Room PIN */}
                <div className="border-b border-white/20 pb-4">
                  <p className="text-xs uppercase tracking-wider text-white/60 mb-1">Room PIN</p>
                  <p className="text-3xl font-black tracking-wider">{id}</p>
                </div>

                {/* Scoreboard */}
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Scoreboard</h3>
                  {players.length === 0 ? (
                    <p className="text-white/40 text-sm">No players yet</p>
                  ) : (
                    <div className="space-y-2">
                      {players
                        .sort((a, b) => (chips[b.id] || 0) - (chips[a.id] || 0))
                        .map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded bg-white/10">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-white/60 text-sm font-bold">{i + 1}.</span>
                              <span className="text-white text-sm font-semibold truncate">
                                {p.name}
                                {p.id === clientIdRef.current && " (You)"}
                              </span>
                            </div>
                            <span className="text-yellow-400 font-bold text-sm">
                              🪙 {chips[p.id] || 0}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Player Status */}
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Player Status</h3>
                  {phase === "question" && (
                    <div className="space-y-1">
                      {players.map((player, i) => {
                        const hasAnswered = answers.some(a => a.playerId === player.id);
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5 px-2 text-sm">
                            <span className="text-white/80">{player.name}</span>
                            <span className={hasAnswered ? "text-green-400" : "text-white/40"}>
                              {hasAnswered ? "✓ Submitted" : "⏳ Waiting"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {phase === "wager" && (
                    <div className="space-y-1">
                      {players.map((player, i) => {
                        const hasConfirmed = confirmedWagers.includes(player.id);
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5 px-2 text-sm">
                            <span className="text-white/80">{player.name}</span>
                            <span className={hasConfirmed ? "text-green-400" : "text-white/40"}>
                              {hasConfirmed ? "✓ Confirmed" : "⏳ Wagering"}
                            </span>
                          </div>
                        );
                      })}
                      <div className="mt-3 pt-3 border-t border-white/20 text-center">
                        <span className="text-green-400 font-bold text-sm">
                          {confirmedWagers.length}/{players.length} Confirmed
                        </span>
                      </div>
                    </div>
                  )}
                  {phase === "payout" && payoutResult && (
                    <div className="space-y-1">
                      {Object.entries(payoutResult.payouts || {}).map(([playerId, payout]) => {
                        const player = players.find(p => p.id === playerId);
                        return (
                          <div key={playerId} className="flex items-center justify-between py-1.5 px-2 text-sm rounded bg-white/5">
                            <span className="text-white/80">{player?.name || "???"}</span>
                            <span className={payout.wonChips > 0 ? "text-yellow-400 font-bold" : "text-white/40"}>
                              {payout.wonChips > 0 ? `+${payout.wonChips} 🪙` : "-"}
                              {payout.isZeroChipBonus && " 🎁"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Navbar + Hamburger (Sticky) */}
              <div className="md:hidden sticky top-0 z-50 bg-black border-b border-white/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60">Room PIN</p>
                    <p className="text-xl font-black tracking-wider">{id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sidebar = document.getElementById('mobile-sidebar');
                      sidebar?.classList.toggle('hidden');
                    }}
                    className="p-2 rounded hover:bg-white/10"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Dropdown */}
                <div id="mobile-sidebar" className="hidden mt-4 space-y-4">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-white/60 mb-2">Scoreboard</h3>
                    <div className="space-y-1">
                      {players.sort((a, b) => (chips[b.id] || 0) - (chips[a.id] || 0)).map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                          <span>{i + 1}. {p.name}</span>
                          <span className="text-yellow-400">🪙 {chips[p.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-white/60 mb-2">Player Status</h3>
                    {phase === "question" && (
                      <div className="space-y-1">
                        {players.map((player, i) => {
                          const hasAnswered = answers.some(a => a.playerId === player.id);
                          return (
                            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-white/80">{player.name}</span>
                              <span className={hasAnswered ? "text-green-400" : "text-white/40"}>
                                {hasAnswered ? "✓" : "⏳"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {phase === "wager" && (
                      <div className="space-y-1">
                        {players.map((player, i) => {
                          const hasConfirmed = confirmedWagers.includes(player.id);
                          return (
                            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-white/80">{player.name}</span>
                              <span className={hasConfirmed ? "text-green-400" : "text-white/40"}>
                                {hasConfirmed ? "✓" : "⏳"}
                              </span>
                            </div>
                          );
                        })}
                        <div className="mt-2 pt-2 border-t border-white/20 text-center text-sm">
                          <span className="text-green-400 font-bold">
                            {confirmedWagers.length}/{players.length} Confirmed
                          </span>
                        </div>
                      </div>
                    )}
                    {phase === "payout" && payoutResult && (
                      <div className="space-y-1">
                        {Object.entries(payoutResult.payouts || {}).map(([playerId, payout]) => {
                          const player = players.find(p => p.id === playerId);
                          return (
                            <div key={playerId} className="flex items-center justify-between py-1.5 text-sm rounded bg-white/5">
                              <span className="text-white/80">{player?.name || "???"}</span>
                              <span className={payout.wonChips > 0 ? "text-yellow-400 font-bold" : "text-white/40"}>
                                {payout.wonChips > 0 ? `+${payout.wonChips}🪙` : "-"}
                                {payout.isZeroChipBonus && "🎁"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content Area - Right (Green) */}
            <div className="flex-1 flex flex-col bg-green-600 overflow-auto">
              {/* Host Controls (Simple Inline) */}
              {isHost && (
                <article className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold">
                      Host Controls - {getPhaseDisplay()}
                    </div>
                    <div className="flex gap-2">
                      {phase === "question" && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("revealAnswer", { roomId: id })}
                          className="rounded-md bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 text-sm transition"
                          disabled
                          title="Auto-reveals when all players answer"
                        >
                          (Auto Reveal)
                        </button>
                      )}
                      {phase === "wager" && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("revealAnswer", { roomId: id })}
                          className="rounded-md bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 text-sm transition"
                        >
                          🎯 Reveal Correct Answer
                        </button>
                      )}
                      {(phase === "reveal" || phase === "payout") && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit("nextRound", { roomId: id })}
                          className="rounded-md bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 text-sm transition"
                        >
                          ▶️ Next Round
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )}

              {/* Main Game Area */}
              <div className="flex-1 p-4">
                {isRejoining && (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🔄</div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Reconnecting...
                    </h2>
                    <p className="text-white/80">Please wait</p>
                  </div>
                )}

                {!isRejoining && !joined && !isHost && (
                  <div className="flex flex-col gap-4">
                    <label htmlFor="nickname" className="sr-only">Nickname</label>
                    <input
                      id="nickname"
                      type="text"
                      placeholder="Enter your name"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                      className="flex-1 rounded-full border border-white/50 px-5 py-3 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white focus:border-white bg-white/20 backdrop-blur"
                    />
                    <div>
                      <p className="text-white text-sm mb-2">Choose your color</p>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setColorKey(key)}
                            aria-label={`choose ${key}`}
                            className={`h-8 w-8 rounded-full border-2 ${colorKey === key ? 'border-white scale-110' : 'border-white/30'} transition ${colorKeyToBg[key]}`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={joinRoom}
                      className="rounded-full bg-white hover:bg-white/90 text-green-700 font-semibold px-6 py-3 shadow-md transition"
                    >
                      Join Room
                    </button>
                  </div>
                )}

                {(joined || isHost) && (
                  <>
                    {/* Question Phase */}
                    {phase === "question" && (
                  <>
                    {/* 1. Question Card - Top */}
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                    />
                    
                    {/* 2. Wits & Wagers Placeholder - Middle */}
                    <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-6 shadow-2xl mb-4">
                      <div className="flex items-center justify-center min-h-[120px]">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/50 text-center tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                          Wits &<br />Wagers
                        </h2>
                      </div>
                    </div>

                    {/* 3. Action Zone (Yellow Theme) - Bottom */}
                    <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-300 shadow-xl overflow-hidden">
                      {!isHost && !hasSubmitted ? (
                        <div className="p-6 bg-gradient-to-r from-yellow-200 to-yellow-100">
                          <div className="mb-3 text-center">
                            <h3 className="text-xl font-bold text-yellow-900 mb-1">💭 Submit Your Answer</h3>
                            <p className="text-yellow-700 text-sm">Enter a number - your best guess!</p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <label htmlFor="guess" className="sr-only">Your Answer</label>
                            <input
                              id="guess"
                              type="number"
                              placeholder="Type a number..."
                              value={guess}
                              onChange={(e) => setGuess(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                              className="flex-1 rounded-xl border-2 border-yellow-400 px-6 py-4 text-yellow-900 text-lg font-bold placeholder-yellow-900/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white shadow-md transition"
                            />
                            <button
                              type="button"
                              onClick={submitAnswer}
                              className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-3 shadow-md transition"
                            >
                              Submit Answer
                            </button>
                          </div>
                        </div>
                      ) : !isHost && hasSubmitted ? (
                        <div className="text-center py-3">
                          <h3 className="text-yellow-900 text-base font-bold mb-2">Answer Submitted</h3>
                          <p className="text-yellow-700 text-sm">Waiting for other players...</p>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <h3 className="text-yellow-900 text-base font-bold mb-2">Host View</h3>
                          <p className="text-yellow-700 text-sm mb-2">Waiting for all players to answer...</p>
                          <p className="text-yellow-900 font-bold text-sm">
                            {answers.length}/{players.length} answered
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Reveal Phase - legacy, kept for backwards compatibility */}
                {phase === "reveal" && roundResult && (
                  <>
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                      correctAnswer={roundResult.correctAnswer}
                    />

                    {/* Show answer tiles if available (same as wager phase but read-only) */}
                    {roundResult.winner && answerTiles && answerTiles.length > 0 && (
                      <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-4 sm:p-6 shadow-2xl">
                        <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 items-stretch justify-center">
                          {answerTiles.map((tile, index) => {
                            const isWinningTile = (tile.isSmallerTile && roundResult.winner.isSmallerTile) || 
                                                  (!tile.isSmallerTile && tile.guess === roundResult.winner.guess);
                            
                            return (
                              <article
                                key={index}
                                className={`flex-1 min-h-[250px] md:min-h-[300px] lg:min-h-[350px] rounded-2xl border-4 p-3 sm:p-4 transition-all flex flex-col justify-between ${
                                  isWinningTile
                                    ? 'bg-gradient-to-b from-yellow-400 to-yellow-500 border-yellow-300 shadow-2xl scale-105 ring-4 ring-yellow-300'
                                    : 'bg-gradient-to-b from-green-600 to-green-700 border-white/90'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`inline-block px-3 py-1 rounded-full text-sm sm:text-base font-black shadow-lg ${
                                    isWinningTile ? 'bg-white text-yellow-600' : 'bg-white/90 text-black'
                                  }`}>
                                    ×{tile.multiplier}
                                  </span>
                                  {isWinningTile && (
                                    <span className="inline-block px-3 py-1 rounded-full text-sm font-black bg-yellow-600 text-white shadow-lg">
                                      🏆 WIN
                                    </span>
                      )}
                    </div>

                                <div className="mb-3 flex-1 flex flex-col items-center justify-center">
                                  {tile.isSmallerTile ? (
                                    <div className="text-center">
                                      <p className={`text-xl sm:text-2xl font-bold ${
                                        isWinningTile ? 'text-yellow-900' : 'text-white'
                                      }`}>
                                        SMALLER
                                      </p>
                                      <p className={`text-sm mt-2 ${
                                        isWinningTile ? 'text-yellow-800' : 'text-white/80'
                                      }`}>
                                        Than all guesses
                        </p>
                      </div>
                    ) : (
                                    <p className={`text-4xl sm:text-5xl lg:text-6xl font-black text-center ${
                                      isWinningTile ? 'text-yellow-900' : 'text-white'
                                    }`}>
                                      {tile.guess}
                                    </p>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!roundResult.winner && (
                      <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-6 shadow-2xl">
                        <div className="flex items-center justify-center min-h-[120px]">
                          <p className="text-2xl font-bold text-white text-center">
                            ❌ No winner - all guesses exceeded the answer!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Zone */}
                    <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-300 shadow-xl overflow-hidden mt-4">
                      <div className="p-6 bg-gradient-to-r from-yellow-200 to-yellow-100">
                        <div className="text-center">
                          <h3 className="text-yellow-900 text-lg font-bold mb-2">Get Ready</h3>
                          <p className="text-yellow-700 text-sm">Next round starting soon...</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Wager Phase */}
                {phase === "wager" && (
                  <>
                    {/* Question Card at Top */}
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                    />
                    
                    {/* Wager Table */}
                  <WagerPhase
                    answerTiles={answerTiles}
                    players={players}
                    chips={chips}
                    myPlayerId={clientIdRef.current}
                    onPlaceBet={placeBet}
                    onConfirmWagers={confirmWagers}
                    currentBets={currentBets}
                    confirmedWagers={confirmedWagers}
                    zeroChipPlayers={zeroChipPlayers}
                    isHost={isHost}
                  />
                  </>
                )}

                {/* Payout Phase */}
                {phase === "payout" && payoutResult && (
                  <>
                    {/* Question Card at Top */}
                    <QuestionCard 
                      question={currentQuestion}
                      round={currentRound}
                      totalRounds={totalRounds}
                      correctAnswer={payoutResult.correctAnswer}
                    />
                    
                    <PayoutPhase
                      correctAnswer={payoutResult.correctAnswer}
                      winningTile={payoutResult.winningTile}
                      answerTiles={payoutResult.answerTiles}
                      payouts={payoutResult.payouts}
                      chips={payoutResult.chips}
                      players={players}
                      currentQuestion={currentQuestion}
                      myPlayerId={clientIdRef.current}
                    />

                    {/* Action Zone with Payout Result */}
                    <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-300 shadow-xl overflow-hidden mt-4">
                      <div className="p-6 bg-gradient-to-r from-yellow-200 to-yellow-100 space-y-3">
                        {/* My Payout Result */}
                        {!isHost && (() => {
                        const myPayout = payoutResult.payouts[clientIdRef.current];
                        const myChips = payoutResult.chips[clientIdRef.current] || 0;
                        
                        if (myPayout && myPayout.wonChips > 0) {
                          // Won chips - Yellow theme
                          return (
                            <div className="text-center">
                              <h3 className="text-yellow-900 text-xl font-bold mb-3">
                                {myPayout.isZeroChipBonus ? 'Special Bonus' : 'You Won'}
                              </h3>
                              <div className="mb-3">
                                <p className="text-4xl md:text-5xl font-black text-yellow-900">
                                  +{myPayout.wonChips} chips
                                </p>
                              </div>
                              {myPayout.isZeroChipBonus ? (
                                <div className="space-y-1 mb-3">
                                  <p className="text-yellow-800 text-sm font-semibold">
                                    Bonus for zero-chip players
                                  </p>
                                  <p className="text-yellow-700 text-xs">
                                    (25% of maximum prize)
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1 mb-3">
                                  {myPayout.bets && myPayout.bets.map((bet, i) => (
                                    <p key={i} className="text-yellow-800 font-semibold text-sm">
                                      {bet.amount} × {bet.multiplier} = {bet.winnings} chips
                                    </p>
                                  ))}
                                </div>
                              )}
                              <p className="text-yellow-900 font-bold text-sm">
                                Total chips: {myChips}
                              </p>
                            </div>
                          );
                        } else {
                          // No chips won - Yellow theme
                          return (
                            <div className="text-center">
                              <h3 className="text-yellow-900 text-xl font-bold mb-3">No Chips Won</h3>
                              <p className="text-yellow-700 text-sm mb-2">Better luck next round!</p>
                              <p className="text-yellow-900 font-bold text-sm">
                                Remaining chips: {myChips}
                              </p>
                            </div>
                          );
                        }
                        })()}
                        
                        {/* Host message */}
                        {isHost && (
                          <div className="text-center py-3">
                            <p className="text-yellow-900 text-base font-bold mb-1">Host View</p>
                            <p className="text-yellow-700 text-sm">Waiting for next round...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Finished Phase */}
                {phase === "finished" && (
                  <>
                    <div className="text-center py-16">
                      <div className="text-8xl mb-6">🏆</div>
                      <h2 className="text-4xl font-bold text-white mb-4">Game Finished!</h2>
                      <p className="text-white/90 text-xl mb-6">Check the leaderboard on the side</p>
                      <div className="text-6xl">🎉</div>
                    </div>

                    {/* Action Zone */}
                    <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-300 shadow-xl overflow-hidden mt-4">
                      <div className="p-6 bg-gradient-to-r from-yellow-200 to-yellow-100">
                        <div className="text-center">
                          <h3 className="text-yellow-900 text-xl font-bold mb-3">Thanks for Playing</h3>
                          <p className="text-yellow-700 text-base font-semibold mb-2">
                            Check the final leaderboard
                          </p>
                          <p className="text-yellow-600 text-sm">
                            See who came out on top!
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
                )}
                    </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

RoomPage.displayName = "RoomPage";

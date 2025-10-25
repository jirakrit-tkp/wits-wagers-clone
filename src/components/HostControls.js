const HostControls = ({ roomId, phase, currentRound, totalRounds, socket, isHost }) => {
  // isHost is now passed as a prop - no need to check again
  
  if (!isHost) {
    console.log("⚠️ HostControls: isHost is false, not rendering");
    return null;
  }
  
  console.log("✅ HostControls: Rendering for phase:", phase);

  const handleStartGame = () => {
    socket?.emit("startGame", { roomId });
  };

  const handleNextRound = () => {
    socket?.emit("nextRound", { roomId });
  };

  const handleRevealAnswer = () => {
    socket?.emit("revealAnswer", { roomId });
  };

  const handleSetPhase = (newPhase) => {
    socket?.emit("setPhase", { roomId, phase: newPhase });
  };

  return (
    <section className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-xl border-2 border-purple-300 p-6 mb-6">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-300 animate-pulse" />
          <h2 className="text-white font-bold text-lg">ควบคุมโฮสต์</h2>
        </div>
        <div className="text-white/80 text-sm font-medium">
          รอบ {currentRound} / {totalRounds}
        </div>
      </header>

      <div className="space-y-3">
        {phase === "lobby" && (
          <button
            type="button"
            onClick={handleStartGame}
            className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-4 shadow-lg transition transform hover:scale-105"
          >
            🎮 เริ่มเกม
          </button>
        )}

        {phase === "question" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleRevealAnswer}
              className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 shadow-lg transition"
            >
              📊 เปิดเฉลยคำตอบ
            </button>
            <button
              type="button"
              onClick={handleNextRound}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 shadow-lg transition"
            >
              ⏭️ ข้ามไปรอบถัดไป
            </button>
          </div>
        )}

        {phase === "reveal" && (
          <button
            type="button"
            onClick={handleNextRound}
            className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-4 shadow-lg transition transform hover:scale-105"
          >
            ▶️ รอบถัดไป
          </button>
        )}

        {phase === "finished" && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 py-4 shadow-lg transition transform hover:scale-105"
          >
            🔄 เริ่มเกมใหม่
          </button>
        )}
      </div>

      {/* Debug controls - can be removed in production */}
      <details className="mt-4">
        <summary className="text-white/60 text-xs cursor-pointer hover:text-white/80 transition">
          ควบคุมขั้นสูง (Debug)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSetPhase("lobby")}
            className="text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 transition"
          >
            Lobby
          </button>
          <button
            type="button"
            onClick={() => handleSetPhase("question")}
            className="text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 transition"
          >
            Question
          </button>
          <button
            type="button"
            onClick={() => handleSetPhase("reveal")}
            className="text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 transition"
          >
            Reveal
          </button>
          <button
            type="button"
            onClick={() => handleSetPhase("finished")}
            className="text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 transition"
          >
            Finished
          </button>
        </div>
      </details>
    </section>
  );
};

HostControls.displayName = "HostControls";

export default HostControls;


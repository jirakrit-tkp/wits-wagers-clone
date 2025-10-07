import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

export default function RoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const socketRef = useRef(null);
  const clientIdRef = useRef(`${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`);

  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [guess, setGuess] = useState("");
  const [answers, setAnswers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [colorKey, setColorKey] = useState("sky-500");
  const colorOptions = ["red-500", "amber-500", "emerald-500", "sky-500", "violet-500", "rose-500"];
  const colorKeyToBg = {
    "red-500": "bg-red-500",
    "amber-500": "bg-amber-500",
    "emerald-500": "bg-emerald-500",
    "sky-500": "bg-sky-500",
    "violet-500": "bg-violet-500",
    "rose-500": "bg-rose-500",
  };

  useEffect(() => {
    if (!id) return;
    fetch("/api/socketio").finally(() => {
      const s = io({ path: "/socket.io", transports: ["websocket", "polling"] });
      socketRef.current = s;
      s.on("answersUpdate", (data) => setAnswers(Array.isArray(data) ? data : []));
      s.on("playersUpdate", (data) => setPlayers(Array.isArray(data) ? data : []));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  const joinRoom = () => {
    if (!nickname.trim()) return;
    socketRef.current?.emit("joinRoom", { roomId: id, player: { id: clientIdRef.current, name: nickname.trim(), color: colorKey } });
    setJoined(true);
  };

  const submitAnswer = () => {
    const numericGuess = Number(guess);
    if (!Number.isFinite(numericGuess)) return;
    socketRef.current?.emit("submitAnswer", { roomId: id, playerId: clientIdRef.current, guess: numericGuess });
    setGuess("");
  };

  return (
    <main className="min-h-screen bg-yellow-50">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-900">Room {id}</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2"
        >
          Back
        </button>
      </header>

      <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
        <article className="md:col-span-2 rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-200 p-6">
          {!joined ? (
            <div className="flex flex-col gap-4">
              <label htmlFor="nickname" className="sr-only">Nickname</label>
              <input
                id="nickname"
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="flex-1 rounded-full border border-blue-300 px-5 py-3 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
              />
              <div>
                <p className="text-blue-900/80 text-sm mb-2">Choose your color</p>
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
                Join Room
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label htmlFor="guess" className="sr-only">Your Guess</label>
                <input
                  id="guess"
                  type="number"
                  placeholder="Enter your guess"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="flex-1 rounded-full border border-blue-300 px-5 py-3 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                />
                <button
                  type="button"
                  onClick={submitAnswer}
                  className="rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-md transition"
                >
                  Submit
                </button>
              </div>

              <div>
                <h3 className="text-blue-900 font-semibold mb-2">Answers so far</h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {answers.map((a, i) => (
                    <li key={i} className="rounded-lg bg-blue-50 text-blue-900 text-sm px-3 py-2 shadow">
                      {typeof a === "object" ? JSON.stringify(a) : String(a)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </article>

        <aside className="rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-200 p-6">
          <h3 className="text-blue-900 font-semibold mb-3">Players</h3>
          <ul className="space-y-2">
            {players.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={`inline-flex h-3 w-3 rounded-full ${p && typeof p === 'object' && p.color ? colorKeyToBg[p.color] ?? 'bg-gray-400' : 'bg-gray-400'}`} />
                <span className="text-blue-900 text-sm">{typeof p === "object" ? p.name ?? "Player" : String(p)}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
    
  );
}

RoomPage.displayName = "RoomPage";

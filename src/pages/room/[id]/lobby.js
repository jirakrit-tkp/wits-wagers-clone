import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketManager";

const LobbyPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const socketRef = useRef(null);
  const clientIdRef = useRef(null);
  const hasJoinedRoomRef = useRef(false); // Flag to prevent duplicate joins
  const currentRoomIdRef = useRef(null); // Track current room id

  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [isRejoining, setIsRejoining] = useState(false);

  // ฟังก์ชันสุ่มสี
  const getRandomColor = () => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    console.log(`[Lobby] useEffect triggered for room: ${id}, hasJoined: ${hasJoinedRoomRef.current}, currentRoom: ${currentRoomIdRef.current}`);
    if (!id) return;
    
    // If room changed, reset flag
    if (currentRoomIdRef.current !== id) {
      console.log(`[Lobby] Room changed from ${currentRoomIdRef.current} to ${id}, resetting flag`);
      hasJoinedRoomRef.current = false;
      currentRoomIdRef.current = id;
    }
    
    // If already joined this room, don't do anything
    if (hasJoinedRoomRef.current) {
      console.log("[Lobby] Already processed this room, skipping entire effect");
      return;
    }
    
    // Initialize clientId
    if (!clientIdRef.current) {
      clientIdRef.current = Math.random().toString(36).substring(2, 15);
    }

    // Check sessionStorage for existing session
    const savedIsHost = sessionStorage.getItem(`room_${id}_isHost`) === "true";
    const savedHostId = sessionStorage.getItem(`room_${id}_hostId`);
    const savedPlayerId = sessionStorage.getItem(`room_${id}_playerId`);
    const savedNickname = sessionStorage.getItem(`room_${id}_nickname`);
    const savedColor = sessionStorage.getItem(`room_${id}_color`);
    const savedJoined = sessionStorage.getItem(`room_${id}_joined`) === "true";
    
    // If socket already initialized, just rejoin the new room
    if (socketRef.current && socketRef.current.connected) {
      console.log("[Lobby] Socket already initialized, rejoining room");
      
      if (savedIsHost && savedHostId) {
        socketRef.current.emit("createRoom", { roomId: id, hostId: savedHostId });
        socketRef.current.emit("joinRoom", { roomId: id, isHost: true, hostId: savedHostId });
        hasJoinedRoomRef.current = true;
        setIsRejoining(false);
      } else if (savedPlayerId && savedNickname && savedJoined) {
        const playerData = {
          id: savedPlayerId,
          name: savedNickname,
          color: savedColor || getRandomColor(),
          score: 0,
          isHost: false,
        };
        socketRef.current.emit("joinRoom", { roomId: id, player: playerData });
        hasJoinedRoomRef.current = true;
        setIsRejoining(false);
      }
      return;
    }
    
    // Prevent multiple socket initializations
    if (socketRef.current) {
      console.log("[Lobby] Socket initializing, skipping");
      return;
    }

    if (savedIsHost && savedHostId) {
      clientIdRef.current = savedHostId;
      setIsHost(true);
      setHostId(savedHostId);
      setJoined(true);
      setIsRejoining(true);
      console.log("[Lobby] Restoring host session:", savedHostId);
      
      // Also save as JSON for room/[id].js
      sessionStorage.setItem(`room_${id}`, JSON.stringify({
        isHost: true,
        hostId: savedHostId,
        roomId: id
      }));
    } else if (savedPlayerId && savedNickname && savedJoined) {
      clientIdRef.current = savedPlayerId;
      setPlayerId(savedPlayerId);
      setNickname(savedNickname);
      setColor(savedColor || getRandomColor());
      setJoined(true);
      setIsRejoining(true);
      console.log("[Lobby] Restoring player session:", savedPlayerId);
      
      // Also save as JSON for room/[id].js
      sessionStorage.setItem(`room_${id}`, JSON.stringify({
        isHost: false,
        playerId: savedPlayerId,
        nickname: savedNickname,
        color: savedColor || getRandomColor(),
        roomId: id
      }));
    }

    // Use singleton socket
    getSocket().then((s) => {
      socketRef.current = s;

      // Remove old listeners first to prevent duplicates
      s.off("connect");
      s.off("roomUpdate");
      s.off("playersUpdate");
      s.off("gameStarted");
      s.off("roomDeleted");
      s.off("leftRoom");
      s.off("error");
      s.off("disconnect");
      s.off("connect_error");

      // Function to handle room creation/joining
      const handleRoomJoin = () => {
        // Prevent duplicate joins
        if (hasJoinedRoomRef.current) {
          console.log("[Lobby] Already joined room, skipping");
          return;
        }
        
        // Auto-create/join for host
        if (savedIsHost && savedHostId) {
          console.log("[Lobby] Host reconnecting, creating room");
          s.emit("createRoom", { roomId: id, hostId: savedHostId });
          s.emit("joinRoom", { roomId: id, isHost: true, hostId: savedHostId });
          hasJoinedRoomRef.current = true; // Mark as joined
          setIsRejoining(false);
        }
        // Auto-rejoin for player
        else if (savedPlayerId && savedNickname && savedJoined) {
          console.log("[Lobby] Player reconnecting");
          const playerData = {
            id: savedPlayerId,
            name: savedNickname,
            color: savedColor || getRandomColor(),
            score: 0,
            isHost: false,
          };
          s.emit("joinRoom", { roomId: id, player: playerData });
          hasJoinedRoomRef.current = true; // Mark as joined
          setIsRejoining(false);
        }
      };

      // Socket event handlers
      s.on("connect", () => {
        console.log("[Lobby] ✅ Socket connected:", s.id);
        console.log("[Lobby] Socket.connected:", s.connected);
        handleRoomJoin();
      });

      // If socket is already connected, join immediately
      if (s.connected) {
        console.log("[Lobby] Socket already connected, joining room immediately");
        handleRoomJoin();
      }

      s.on("roomUpdate", (data) => {
        console.log("[Lobby] Room update:", data);
        if (data.phase && data.phase !== "lobby") {
          // Redirect to main game page when game starts
          router.push(`/room/${id}`);
        }
        setPhase(data.phase || "lobby");
      });

      s.on("playersUpdate", (updatedPlayers) => {
        console.log("[Lobby] Players update:", updatedPlayers);
        setPlayers(updatedPlayers || []);
      });

      s.on("gameStarted", (data) => {
        console.log("[Lobby] Game started:", data);
        router.push(`/room/${id}`);
      });

      s.on("roomDeleted", (data) => {
        console.log("[Lobby] Room deleted:", data);
        // Clear session storage
        sessionStorage.removeItem(`room_${id}_isHost`);
        sessionStorage.removeItem(`room_${id}_hostId`);
        sessionStorage.removeItem(`room_${id}_playerId`);
        sessionStorage.removeItem(`room_${id}_nickname`);
        sessionStorage.removeItem(`room_${id}_color`);
        sessionStorage.removeItem(`room_${id}_joined`);
        // Redirect to home page
        router.push("/");
      });

      s.on("leftRoom", (data) => {
        console.log("[Lobby] Left room:", data);
        // Clear session storage
        sessionStorage.removeItem(`room_${id}_playerId`);
        sessionStorage.removeItem(`room_${id}_nickname`);
        sessionStorage.removeItem(`room_${id}_color`);
        sessionStorage.removeItem(`room_${id}_joined`);
        // Redirect to home page
        router.push("/");
      });

      s.on("error", (error) => {
        console.error("[Lobby] Socket error:", error);
      });

      s.on("disconnect", (reason) => {
        console.log("[Lobby] Socket disconnected:", reason);
      });

      s.on("connect_error", (error) => {
        console.error("[Lobby] Socket connection error:", error);
      });
    });

    // Don't disconnect on unmount - we're redirecting to main game page
    // Socket is managed by socketManager singleton
  }, [id]); // Only depend on id, not router

  // Check URL params for host
  useEffect(() => {
    if (!router.isReady) return;
    
    const urlIsHost = router.query.host === "true";
    const urlHostId = router.query.hostId || router.query.hostid; // Support both cases

    if (urlIsHost && urlHostId && !joined) {
      console.log("[Lobby] Setting up NEW host from URL");
      clientIdRef.current = urlHostId;
      setIsHost(true);
      setHostId(urlHostId);
      setJoined(true);
      setIsRejoining(false); // Host ใหม่ไม่ต้องแสดง "กำลังเชื่อมต่อใหม่"

      // Save both formats for compatibility
      sessionStorage.setItem(`room_${id}_isHost`, "true");
      sessionStorage.setItem(`room_${id}_hostId`, urlHostId);
      sessionStorage.setItem(`room_${id}_joined`, "true");
      
      // Also save as JSON for room/[id].js
      sessionStorage.setItem(`room_${id}`, JSON.stringify({
        isHost: true,
        hostId: urlHostId,
        roomId: id
      }));

      if (socketRef.current?.connected) {
        socketRef.current.emit("createRoom", { roomId: id, hostId: urlHostId });
        socketRef.current.emit("joinRoom", { roomId: id, isHost: true, hostId: urlHostId });
      }
    }
  }, [router.isReady, router.query.host, router.query.hostId, router.query.hostid, id, joined]);

  // Join Room function for players
  const joinRoom = () => {
    if (!nickname.trim()) {
      alert("กรุณาใส่ชื่อ");
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      console.error("[Lobby] Socket not initialized");
      return;
    }

    const newPlayerId = clientIdRef.current || Math.random().toString(36).substring(2, 15);
    clientIdRef.current = newPlayerId;

    const playerData = {
      id: newPlayerId,
      name: nickname,
      color: color,
      score: 0,
      isHost: false,
    };

    console.log("[Lobby] Joining room:", { roomId: id, player: playerData });

    const emitJoin = () => {
      socket.emit("joinRoom", { roomId: id, player: playerData });
      setJoined(true);
      setPlayerId(newPlayerId);

      sessionStorage.setItem(`room_${id}_playerId`, newPlayerId);
      sessionStorage.setItem(`room_${id}_nickname`, nickname);
      sessionStorage.setItem(`room_${id}_color`, color);
      sessionStorage.setItem(`room_${id}_joined`, "true");
      
      // Also save as JSON for room/[id].js
      sessionStorage.setItem(`room_${id}`, JSON.stringify({
        isHost: false,
        playerId: newPlayerId,
        nickname: nickname,
        color: color,
        roomId: id
      }));
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
    }
  };

  // Start Game function for host
  const startGame = () => {
    if (!socketRef.current) return;
    console.log("[Lobby] Starting game");
    socketRef.current.emit("startGame", { roomId: id });
  };

  // Delete Room function for host
  const handleDeleteRoom = () => {
    console.log("[Lobby] handleDeleteRoom called");
    console.log("[Lobby] socketRef.current:", socketRef.current);
    console.log("[Lobby] isHost:", isHost);
    console.log("[Lobby] hostId:", hostId);
    
    if (!socketRef.current || !isHost || !hostId) {
      console.error("[Lobby] Cannot delete room - missing requirements");
      return;
    }
    
    const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ที่จะลบห้องนี้? ผู้เล่นทุกคนจะถูกนำกลับไปหน้าแรก");
    if (!confirmDelete) {
      console.log("[Lobby] Delete cancelled by user");
      return;
    }

    console.log("[Lobby] Emitting deleteRoom event with:", { roomId: id, hostId: hostId });
    socketRef.current.emit("deleteRoom", { roomId: id, hostId: hostId });
  };

  // Leave Room function for players
  const handleLeaveRoom = () => {
    console.log("[Lobby] handleLeaveRoom called");
    console.log("[Lobby] playerId:", playerId);
    
    if (!socketRef.current || !playerId) {
      console.error("[Lobby] Cannot leave room - missing requirements");
      return;
    }

    const confirmLeave = window.confirm("คุณแน่ใจหรือไม่ที่จะออกจากห้อง?");
    if (!confirmLeave) {
      console.log("[Lobby] Leave cancelled by user");
      return;
    }

    console.log("[Lobby] Emitting leaveRoom event with:", { roomId: id, playerId: playerId });
    socketRef.current.emit("leaveRoom", { roomId: id, playerId: playerId });
  };

  if (!joined && !isHost) {
    // Player Join Form
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <article className="rounded-2xl bg-white shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">เข้าร่วมห้อง</h1>
          <p className="text-center text-gray-600 mb-6">รหัสห้อง: <span className="font-mono font-bold text-purple-600">{id}</span></p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinRoom();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อของคุณ
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="ใส่ชื่อของคุณ"
                maxLength={20}
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                เลือกสี
              </label>
              <div className="flex gap-2">
                {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full border-2 ${
                      color === c ? "border-gray-800 scale-110" : "border-gray-300"
                    } transition`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 transition"
            >
              เข้าร่วม
            </button>
          </form>
        </article>
      </div>
    );
  }

  // Lobby view (for both host and players)
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-75" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-300 rounded-full blur-2xl animate-pulse delay-150" />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 text-6xl animate-float">🎮</div>
        <div className="absolute top-40 right-1/4 text-5xl animate-float delay-100">🎯</div>
        <div className="absolute bottom-32 left-1/3 text-4xl animate-float delay-200">✨</div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <article className="rounded-3xl bg-white shadow-2xl w-full max-w-3xl overflow-hidden">
          {isRejoining ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔄</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                กำลังเชื่อมต่อใหม่...
              </h2>
              <p className="text-gray-600">กรุณารอสักครู่</p>
            </div>
          ) : (
            <>
              {/* 1. Game PIN - Room Code at Top */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12 text-center">
                <p className="text-sm font-medium uppercase tracking-wider mb-2 opacity-90">
                  Game PIN
                </p>
                <p className="text-7xl font-black tracking-wider">
                  {id}
                </p>
              </div>

              <div className="p-8">
                {/* 2. จำนวน Players และปุ่ม - w-full between */}
                <div className="w-full flex items-center justify-between mb-6">
                  {/* ซ้าย: จำนวน Players */}
                  <div className="flex items-center gap-2">
                    <svg className="w-7 h-7 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="text-3xl font-bold text-gray-800">{players.length}</span>
                    <span className="text-gray-600 text-lg">Players</span>
                  </div>

                  {/* ขวา: ปุ่ม Start และ Delete (Host) หรือ Leave (Player) */}
                  {isHost ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteRoom}
                        className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-4 text-lg transition shadow-lg transform hover:scale-105"
                        title="Delete Room"
                      >
                        🗑️
                      </button>
                      <button
                        type="button"
                        onClick={startGame}
                        className="rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 text-lg transition shadow-lg transform hover:scale-105"
                      >
                        Start
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeaveRoom}
                      className="rounded-xl bg-red-400 hover:bg-red-500 text-white font-semibold px-6 py-3 transition shadow-lg"
                    >
                      Leave
                    </button>
                  )}
                </div>

                {/* 3. Player Names - flex row */}
                <div className="w-full">
                  {players.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">👥</div>
                      <p className="text-gray-500 text-lg">
                        {isHost ? "รอผู้เล่นเข้าร่วม..." : "กำลังเชื่อมต่อ..."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {players.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl p-4 text-center font-semibold text-white shadow-md transform hover:scale-105 transition"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Host/Player Messages */}
                <div className="mt-8 text-center">
                  {isHost ? (
                    <p className="text-gray-600">
                      คุณคือ <span className="font-bold text-purple-600">Host</span> - กดปุ่ม Start เพื่อเริ่มเกม
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      รอ Host เริ่มเกม...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </article>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-75 {
          animation-delay: 0.75s;
        }
        .delay-100 {
          animation-delay: 1s;
        }
        .delay-150 {
          animation-delay: 1.5s;
        }
        .delay-200 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

LobbyPage.displayName = "LobbyPage";

export default LobbyPage;


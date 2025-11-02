import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketManager";
import questionsData from "@/lib/questions.json";
import ConfirmModal from "@/components/ConfirmModal";
import Snackbar from "@/components/Snackbar";
import QRCode from "qrcode";

const LobbyPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const socketRef = useRef(null);
  const clientIdRef = useRef(null);
  const hasJoinedRoomRef = useRef(false); // Flag to prevent duplicate joins
  const currentRoomIdRef = useRef(null); // Track current room id

  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [hostMode, setHostMode] = useState("gm"); // "gm" or "player"
  const [hostName, setHostName] = useState("");
  const [hostColor, setHostColor] = useState("#DC2626");
  const [playerId, setPlayerId] = useState(null);
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#DC2626");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [isRejoining, setIsRejoining] = useState(false);
  const availableCategories = Object.keys(questionsData);
  const [selectedCategories, setSelectedCategories] = useState(availableCategories);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Modal states
  const [showNameAlert, setShowNameAlert] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [snackbar, setSnackbar] = useState({ isOpen: false, message: "", type: "info" });
  const [socketReady, setSocketReady] = useState(false);

  // Generate QR code when room ID is available
  useEffect(() => {
    if (id && typeof window !== 'undefined') {
      const roomUrl = `${window.location.origin}/room/${id}/lobby`;
      QRCode.toDataURL(roomUrl, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',  // Black pattern (default)
          light: '#FFFFFF'  // White background (default)
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('QR Code generation error:', err);
      });
    }
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Random color function
  const getRandomColor = () => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    if (!id) return;
    
    // If room changed, reset flag
    if (currentRoomIdRef.current !== id) {
      hasJoinedRoomRef.current = false;
      currentRoomIdRef.current = id;
    }
    
    // If already joined this room, don't do anything
    if (hasJoinedRoomRef.current) {
      return;
    }
    
    // Check sessionStorage for existing session FIRST
    const savedIsHost = sessionStorage.getItem(`room_${id}_isHost`) === "true";
    const savedHostId = sessionStorage.getItem(`room_${id}_hostId`);
    const savedHostMode = sessionStorage.getItem(`room_${id}_hostMode`) || "gm";
    const savedPlayerId = sessionStorage.getItem(`room_${id}_playerId`);
    const savedNickname = sessionStorage.getItem(`room_${id}_nickname`);
    const savedColor = sessionStorage.getItem(`room_${id}_color`);
    const savedJoined = sessionStorage.getItem(`room_${id}_joined`) === "true";
    
    // If socket already initialized, just rejoin the new room
    if (socketRef.current && socketRef.current.connected) {
      if (savedIsHost && savedHostId) {
        const savedHostMode = sessionStorage.getItem(`room_${id}_hostMode`) || "gm";
        const savedHostName = sessionStorage.getItem(`room_${id}_hostName`);
        const savedHostColor = sessionStorage.getItem(`room_${id}_hostColor`);
        console.log(`[Lobby] Socket already connected - emitting createRoom: ${id}, hostId: ${savedHostId}, hostMode: ${savedHostMode}, hostName: ${savedHostName}`);
        socketRef.current.emit("createRoom", { roomId: id, hostId: savedHostId, hostMode: savedHostMode });
        socketRef.current.emit("joinRoom", { 
          roomId: id, 
          isHost: true, 
          hostId: savedHostId, 
          hostMode: savedHostMode,
          hostName: savedHostName,
          hostColor: savedHostColor
        });
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
      return;
    }

    // ONLY set clientIdRef if not already set
    if (!clientIdRef.current) {
      if (savedIsHost && savedHostId) {
        clientIdRef.current = savedHostId;
        setIsHost(true);
        setHostId(savedHostId);
        setHostMode(savedHostMode);
        setJoined(true);
        setIsRejoining(true);
        
        sessionStorage.setItem(`room_${id}`, JSON.stringify({
          isHost: true,
          hostId: savedHostId,
          hostMode: savedHostMode,
          roomId: id
        }));
      } else if (savedPlayerId && savedNickname && savedJoined) {
        clientIdRef.current = savedPlayerId;
        setPlayerId(savedPlayerId);
        setNickname(savedNickname);
        setColor(savedColor || getRandomColor());
        setJoined(true);
        setIsRejoining(true);
        
        sessionStorage.setItem(`room_${id}`, JSON.stringify({
          isHost: false,
          playerId: savedPlayerId,
          nickname: savedNickname,
          color: savedColor || getRandomColor(),
          roomId: id
        }));
      } else {
        // Initialize clientId for NEW users (no saved session)
        clientIdRef.current = Math.random().toString(36).substring(2, 15);
      }
    }

    // Use singleton socket
    getSocket().then((s) => {
      socketRef.current = s;
      setSocketReady(true); // Mark socket as ready
      console.log(`[Lobby] Socket ready!`);

      // Remove old listeners first to prevent duplicates
      s.off("connect");
      s.off("roomUpdate");
      s.off("playersUpdate");
      s.off("categoriesUpdate");
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
          return;
        }
        
        // Auto-create/join for host
        if (savedIsHost && savedHostId) {
          const savedHostMode = sessionStorage.getItem(`room_${id}_hostMode`) || "gm";
          const savedHostName = sessionStorage.getItem(`room_${id}_hostName`);
          const savedHostColor = sessionStorage.getItem(`room_${id}_hostColor`);
          console.log(`[Lobby] Host rejoining - emitting createRoom: ${id}, hostId: ${savedHostId}, hostMode: ${savedHostMode}, hostName: ${savedHostName}`);
          s.emit("createRoom", { roomId: id, hostId: savedHostId, hostMode: savedHostMode });
          
          // For GM mode, always join. For player mode, only join if name/color exists
          if (savedHostMode === "gm" || (savedHostMode === "player" && savedHostName && savedHostColor)) {
            s.emit("joinRoom", { 
              roomId: id, 
              isHost: true, 
              hostId: savedHostId, 
              hostMode: savedHostMode,
              hostName: savedHostName,
              hostColor: savedHostColor
            });
            hasJoinedRoomRef.current = true;
            setIsRejoining(false);
          } else {
            // Player mode without name/color - don't mark as joined yet
            hasJoinedRoomRef.current = false;
          }
        }
        // Auto-rejoin for player
        else if (savedPlayerId && savedNickname && savedJoined) {
          const playerData = {
            id: savedPlayerId,
            name: savedNickname,
            color: savedColor || getRandomColor(),
            score: 0,
            isHost: false,
          };
          s.emit("joinRoom", { roomId: id, player: playerData });
          hasJoinedRoomRef.current = true;
          setIsRejoining(false);
        }
      };

      // Socket event handlers
      s.on("connect", () => {
        handleRoomJoin();
      });

      // If socket is already connected, join immediately
      if (s.connected) {
        handleRoomJoin();
      }

      s.on("roomUpdate", (data) => {
        if (data.phase && data.phase !== "lobby") {
          router.push(`/room/${id}`);
        }
        setPhase(data.phase || "lobby");
      });

      s.on("playersUpdate", (updatedPlayers) => {
        setPlayers(updatedPlayers || []);
      });

      s.on("categoriesUpdate", (data) => {
        setSelectedCategories(data.categories || availableCategories);
      });

      s.on("gameStarted", (data) => {
        router.push(`/room/${id}`);
      });

      s.on("roomDeleted", (data) => {
        // Clear session storage
        sessionStorage.removeItem(`room_${id}_isHost`);
        sessionStorage.removeItem(`room_${id}_hostId`);
        sessionStorage.removeItem(`room_${id}_playerId`);
        sessionStorage.removeItem(`room_${id}_nickname`);
        sessionStorage.removeItem(`room_${id}_color`);
        sessionStorage.removeItem(`room_${id}_joined`);
        router.push("/");
      });

      s.on("leftRoom", (data) => {
        // Clear session storage
        sessionStorage.removeItem(`room_${id}_playerId`);
        sessionStorage.removeItem(`room_${id}_nickname`);
        sessionStorage.removeItem(`room_${id}_color`);
        sessionStorage.removeItem(`room_${id}_joined`);
        router.push("/");
      });

      s.on("error", (error) => {
        console.error("[Lobby] Socket error:", error);
        // Show error message to user
        if (error.message) {
          showSnackbar(error.message, "error");
          // If join failed, redirect to home
          if (error.message.includes("Cannot join") || error.message.includes("Room is full")) {
            setTimeout(() => router.push("/"), 2000); // Delay redirect to show snackbar
          }
        }
      });

      s.on("disconnect", (reason) => {
        // Silent disconnect
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
    if (!router.isReady || !socketReady) return; // Wait for both router and socket
    
    console.log(`[Lobby] Router query:`, router.query);
    const urlIsHost = router.query.host === "true";
    const urlHostId = router.query.hostId || router.query.hostid; // Support both cases
    const urlHostMode = router.query.hostMode || "gm";
    const urlHostName = router.query.hostName;
    const urlHostColor = router.query.hostColor;
    console.log(`[Lobby] URL check - isHost: ${urlIsHost}, hostId: ${urlHostId}, hostMode: ${urlHostMode}, hostName: ${urlHostName}, hostColor: ${urlHostColor}, socketReady: ${socketReady}`);

    if (urlIsHost && urlHostId && !joined) {
      clientIdRef.current = urlHostId;
      setIsHost(true);
      setHostId(urlHostId);
      setHostMode(urlHostMode);
      
      // For GM mode, join immediately. For player mode, wait for name/color input
      if (urlHostMode === "gm") {
        setJoined(true);
        setIsRejoining(false);
      } else {
        // Player mode - check if name/color already set
        const savedHostName = sessionStorage.getItem(`room_${id}_hostName`);
        const savedHostColor = sessionStorage.getItem(`room_${id}_hostColor`);
        if (savedHostName && savedHostColor) {
          setHostName(savedHostName);
          setHostColor(savedHostColor);
          setJoined(true);
          setIsRejoining(false);
        } else {
          // Show join form
          setJoined(false);
        }
      }

      sessionStorage.setItem(`room_${id}_isHost`, "true");
      sessionStorage.setItem(`room_${id}_hostId`, urlHostId);
      sessionStorage.setItem(`room_${id}_hostMode`, urlHostMode);
      
      sessionStorage.setItem(`room_${id}`, JSON.stringify({
        isHost: true,
        hostId: urlHostId,
        hostMode: urlHostMode,
        hostName: urlHostName,
        hostColor: urlHostColor,
        roomId: id
      }));

      const emitCreateRoom = () => {
        if (!socketRef.current) return;
        console.log(`[Lobby] Host emitting createRoom: ${id}, hostId: ${urlHostId}, hostMode: ${urlHostMode}`);
        socketRef.current.emit("createRoom", { roomId: id, hostId: urlHostId, hostMode: urlHostMode });
        
        // Only join immediately if GM mode or player mode with saved name/color
        if (urlHostMode === "gm" || (urlHostMode === "player" && urlHostName && urlHostColor)) {
          socketRef.current.emit("joinRoom", { 
            roomId: id, 
            isHost: true, 
            hostId: urlHostId, 
            hostMode: urlHostMode,
            hostName: urlHostName,
            hostColor: urlHostColor
          });
        }
      };

      if (socketRef.current) {
        if (socketRef.current.connected) {
          console.log(`[Lobby] Socket already connected, emitting immediately`);
          emitCreateRoom();
        } else {
          console.log(`[Lobby] ⚠️ Socket not connected yet, waiting...`);
          
          // Try to connect if not connecting
          if (!socketRef.current.connecting) {
            console.log(`[Lobby] Forcing socket connection...`);
            socketRef.current.connect();
          }
          
          // Wait for socket to connect with timeout
          const connectTimeout = setTimeout(() => {
            console.log(`[Lobby] ⚠️ Connect timeout! Trying to emit anyway...`);
            if (socketRef.current) {
              emitCreateRoom();
            }
          }, 3000);
          
          socketRef.current.once("connect", () => {
            clearTimeout(connectTimeout);
            console.log(`[Lobby] ✅ Socket connected! Now emitting createRoom: ${id}`);
            emitCreateRoom();
          });
        }
      } else {
        console.log(`[Lobby] ⚠️ Socket is null, cannot create room`);
      }
    }
  }, [router.isReady, router.query.host, router.query.hostId, router.query.hostid, router.query.hostMode, router.query.hostName, router.query.hostColor, id, joined, socketReady]);

  // Join Room function for players
  const joinRoom = () => {
    if (!nickname.trim()) {
      setShowNameAlert(true);
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
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

  // Snackbar helpers
  const showSnackbar = (message, type = "info") => {
    setSnackbar({ isOpen: true, message, type });
  };

  const closeSnackbar = () => {
    setSnackbar({ isOpen: false, message: "", type: "info" });
  };

  // Toggle category selection
  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? (prev.length === 1 ? prev : prev.filter(c => c !== category))
        : [...prev, category];
      
      // Emit to server for realtime sync
      if (socketRef.current && isHost) {
        socketRef.current.emit("updateCategories", { roomId: id, categories: newCategories });
      }
      
      return newCategories;
    });
  };

  // Start Game function for host
  const startGame = () => {
    if (!socketRef.current) return;
    
    // Validate player count (1-7 players, not including host)
    const playerCount = players.length;
    if (playerCount < 1) {
      showSnackbar("Need at least 1 player to start the game!", "warning");
      return;
    }
    if (playerCount > 7) {
      showSnackbar("Maximum 7 players allowed!", "warning");
      return;
    }
    
    socketRef.current.emit("startGame", { roomId: id, categories: selectedCategories });
  };

  // Delete Room function for host
  const handleDeleteRoom = () => {
    if (!socketRef.current || !isHost || !hostId) return;
    console.log(`[Lobby] Deleting room: ${id}, hostId: ${hostId}`);
    socketRef.current.emit("deleteRoom", { roomId: id, hostId: hostId });
  };

  // Leave Room function for players
  const handleLeaveRoom = () => {
    if (!socketRef.current || !playerId) return;
    socketRef.current.emit("leaveRoom", { roomId: id, playerId: playerId });
  };

  // Join host as player function
  const joinHostAsPlayer = () => {
    if (!hostName.trim()) {
      setShowNameAlert(true);
      return;
    }

    const socket = socketRef.current;
    if (!socket) return;

    // Ensure room is created first
    const emitJoin = () => {
      // Create room first if not exists
      socket.emit("createRoom", { roomId: id, hostId: hostId, hostMode: hostMode });
      
      // Then join as player
      socket.emit("joinRoom", { 
        roomId: id, 
        isHost: true, 
        hostId: hostId, 
        hostMode: hostMode,
        hostName: hostName.trim(),
        hostColor: hostColor
      });
      
      setJoined(true);
      setIsRejoining(false);
      hasJoinedRoomRef.current = true;
      sessionStorage.setItem(`room_${id}_hostName`, hostName.trim());
      sessionStorage.setItem(`room_${id}_hostColor`, hostColor);
      sessionStorage.setItem(`room_${id}_joined`, "true");
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
    }
  };

  // Show join form for host player (not yet joined)
  if (isHost && hostMode === "player" && !joined) {
    return (
      <>
        <Snackbar
          isOpen={showNameAlert}
          onClose={() => setShowNameAlert(false)}
          message="Please enter your name to join as player"
          type="warning"
          duration={3000}
        />
        
        <div className="relative min-h-screen bg-yellow-200 flex items-center justify-center p-4 overflow-hidden">
          {/* Radial gradient base */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,#fde047_0%,#facc15_35%,#eab308_60%,#ca8a04_100%)] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_35%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.25)_100%)]"
          />
          
          {/* Subtle sunburst stripes */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="sunburst-rotate w-full h-full [background:repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,255,255,0.15)_0deg,rgba(255,255,255,0.15)_12deg,rgba(255,255,255,0)_12deg,rgba(255,255,255,0)_28deg)]"
            />
          </div>

          <article className="relative z-10 rounded-2xl bg-white shadow-2xl p-8 max-w-md w-full">
            <h1 className="text-3xl font-bold text-black mb-2 text-center">Host - Join as Player</h1>
            <p className="text-center text-black mb-6">Room Code: <span className="font-mono font-bold text-blue-700">{id}</span></p>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinHostAsPlayer();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="host-name-input" className="block text-sm font-medium text-black mb-2">
                  Your Name
                </label>
                <input
                  id="host-name-input"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <div>
                <label htmlFor="host-color" className="block text-sm font-medium text-black mb-2">
                  Choose Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0284C7", "#7C3AED", "#DB2777"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHostColor(c)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        hostColor === c ? "border-black scale-110" : "border-gray-300"
                      } transition`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 transition"
              >
                Join as Player
              </button>
            </form>
          </article>
        </div>
      </>
    );
  }

  if (!joined && !isHost) {
    // Player Join Form
    return (
      <>
        <Snackbar
          isOpen={showNameAlert}
          onClose={() => setShowNameAlert(false)}
          message="Please enter your name to join the room"
          type="warning"
          duration={3000}
        />
        
        <div className="relative min-h-screen bg-yellow-200 flex items-center justify-center p-4 overflow-hidden">
        {/* Radial gradient base - like landing page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,#fde047_0%,#facc15_35%,#eab308_60%,#ca8a04_100%)] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_35%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.25)_100%)]"
        />
        
        {/* Subtle sunburst stripes */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className="sunburst-rotate w-full h-full [background:repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,255,255,0.15)_0deg,rgba(255,255,255,0.15)_12deg,rgba(255,255,255,0)_12deg,rgba(255,255,255,0)_28deg)]"
          />
        </div>

        <article className="relative z-10 rounded-2xl bg-white shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-black mb-2 text-center">Join Room</h1>
          <p className="text-center text-black mb-6">Room Code: <span className="font-mono font-bold text-blue-700">{id}</span></p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinRoom();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-black mb-2">
                Your Name
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-black mb-2">
                Choose Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0284C7", "#7C3AED", "#DB2777"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full border-2 ${
                      color === c ? "border-black scale-110" : "border-gray-300"
                    } transition`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 transition"
            >
              Join
            </button>
          </form>
        </article>
      </div>
      </>
    );
  }

  // Lobby view (for both host and players)
  return (
    <>
      <Snackbar
        isOpen={showNameAlert}
        onClose={() => setShowNameAlert(false)}
        message="Please enter your name to join the room"
        type="warning"
        duration={3000}
      />
      
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRoom}
        title="Delete Room?"
        message="Are you sure you want to delete this room? All players will be redirected to the home page."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
      />
      
      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveRoom}
        title="Leave Room?"
        message="Are you sure you want to leave this room?"
        confirmText="Leave"
        cancelText="Cancel"
        isDanger={false}
      />
      
      <div className="relative min-h-screen bg-yellow-200 overflow-hidden">
      {/* Radial gradient base - like landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,#fde047_0%,#facc15_35%,#eab308_60%,#ca8a04_100%)] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_35%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.25)_100%)]"
      />
      
      {/* Subtle sunburst stripes */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="sunburst-rotate w-full h-full [background:repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,255,255,0.15)_0deg,rgba(255,255,255,0.15)_12deg,rgba(255,255,255,0)_12deg,rgba(255,255,255,0)_28deg)]"
        />
      </div>

      {/* Subtle geometric shapes - reduced and softer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large soft shapes */}
        <div className="absolute -top-20 -left-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-amber-400 opacity-10 transform rotate-45 rounded-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 sm:w-96 sm:h-96 md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] bg-amber-500 opacity-[0.08] transform -rotate-12 rounded-full" />
        
        {/* Small accent shapes - very subtle */}
        <div className="hidden md:block absolute top-1/4 right-10 w-48 h-48 bg-yellow-500 opacity-[0.08] transform rotate-12 rounded-2xl" />
        <div className="hidden lg:block absolute bottom-1/3 left-20 w-60 h-60 bg-amber-400 opacity-[0.08] transform -rotate-45 rounded-tr-full" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start">
        <article className="w-full overflow-hidden">
          {isRejoining ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔄</div>
              <h2 className="text-3xl font-bold text-black mb-2">
                Reconnecting...
              </h2>
              <p className="text-black">Please wait</p>
            </div>
          ) : (
            <>
              {/* 1. QR Code + Game PIN at Top */}
              <div className="bg-black/90 text-white py-8">
                <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-6">
                  {/* QR Code - Left side */}
                  {qrCodeUrl && (
                    <div className="flex items-center">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code to join room" 
                        className="w-28 h-28 md:w-32 md:h-32"
                      />
                    </div>
                  )}
                  
                  {/* Game PIN - Right side, text aligned left */}
                  <div className="text-start">
                    <p className="text-sm font-medium uppercase tracking-wider mb-2 opacity-90">
                      Game PIN
                    </p>
                    <p className="text-7xl font-black tracking-wider">
                      {id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Selected Categories Display - For All Players */}
                <div className="w-full mb-6 p-4 rounded-xl bg-yellow-100 border-2 border-yellow-300">
                  <p className="text-center text-black font-bold mb-2">Categories</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {selectedCategories.map(category => (
                      <span 
                        key={category} 
                        className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-semibold capitalize"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Players Count และ Action Buttons */}
                <div className="w-full mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* จำนวน Players */}
                    <div className="flex items-center gap-2">
                      <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span className="text-3xl font-bold text-black">{players.length}</span>
                      <span className="text-black text-lg">Players</span>
                    </div>

                    {/* Action Buttons */}
                    {isHost ? (
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center" ref={dropdownRef}>
                      {/* Category Dropdown (Host Only) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="w-full sm:w-auto rounded-xl border-2 border-yellow-400 bg-white px-4 py-3 text-black font-bold hover:bg-yellow-50 transition shadow-lg flex items-center justify-center gap-2"
                          title="Select Categories"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                          <span className="sm:hidden">Categories</span>
                          <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                          <div className="absolute left-0 sm:right-0 mt-2 w-full sm:w-56 bg-white rounded-lg border-2 border-yellow-400 shadow-xl z-50">
                            <div className="p-2">
                              {availableCategories.map(category => (
                                <label
                                  key={category}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-yellow-50 rounded-lg cursor-pointer transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category)}
                                    onChange={() => toggleCategory(category)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-black font-semibold capitalize">
                                    {category}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-xl bg-black/90 hover:bg-red-600 text-white font-bold px-6 py-3 text-base transition shadow-lg"
                        title="Delete Room"
                      >
                        Delete Room
                      </button>
                      <button
                        type="button"
                        onClick={startGame}
                        className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 text-base transition shadow-lg"
                      >
                        Start Game
                      </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLeaveConfirm(true)}
                        className="w-full sm:w-auto rounded-xl bg-black/90 hover:bg-red-500 text-white font-semibold px-6 py-3 transition shadow-lg"
                      >
                        Leave Room
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Player Names - flex row */}
                <div className="w-full">
                  {players.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">👥</div>
                      <p className="text-black text-lg">
                        {isHost ? "Waiting for players..." : "Connecting..."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-row flex-wrap gap-3 justify-center">
                      {players.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-full px-6 py-3 text-center font-semibold bg-white/90 shadow-md transform hover:scale-105 transition backdrop-blur-sm"
                          style={{ color: p.color }}
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
                    <p className="text-black">
                      {"You are "}<span className="font-bold text-blue-700">Host</span>{" - Press Start to begin game"}
                    </p>
                  ) : (
                    <p className="text-black">
                      Waiting for Host to start game...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </article>
      </div>

      <style jsx>{`
        @keyframes sunburst-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sunburst-rotate {
          animation: sunburst-rotate 60s linear infinite;
        }
      `}</style>

      <Snackbar
        isOpen={snackbar.isOpen}
        onClose={closeSnackbar}
        message={snackbar.message}
        type={snackbar.type}
        duration={3000}
      />
    </div>
    </>
  );
};

LobbyPage.displayName = "LobbyPage";

export default LobbyPage;


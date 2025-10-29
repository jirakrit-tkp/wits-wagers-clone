// src/pages/api/socketio.js
import { Server } from "socket.io";
import {
  createRoom,
  addPlayer,
  STARTING_CHIPS,
  removePlayer,
  submitAnswer,
  placeBet,
  removeBet,
  confirmWager,
  revealAnswersAndPrepareWagers,
  revealCorrectAnswerAndPayout,
  getRoom,
  startGame,
  nextRound,
  setPhase,
  deleteRoom,
} from "@/lib/gameState";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log(`🚀 Initializing Socket.io server... [PID: ${process.pid}] [WEB_CONCURRENCY: ${process.env.WEB_CONCURRENCY || 'not set'}]`);
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log(`✅ New socket connected: ${socket.id} [PID: ${process.pid}]`);
      socket.on("createRoom", ({ roomId, hostId }) => {
        // Check if room already exists (e.g., when host refreshes)
        let room = getRoom(roomId);
        
        if (!room) {
          // Room doesn't exist, create it
          createRoom(roomId, hostId);
          room = getRoom(roomId);
          console.log(`Room ${roomId} created by host ${hostId}`);
        } else {
          // Room exists, just update hostId if needed
          if (!room.hostId || room.hostId !== hostId) {
            room.hostId = hostId;
          }
          console.log(`Room ${roomId} already exists, host ${hostId} rejoining`);
        }
        
        socket.join(roomId);
        io.to(roomId).emit("roomCreated", { roomId });
        io.to(roomId).emit("roomUpdate", room);
      });

      socket.on("joinRoom", ({ roomId, player, isHost, hostId }) => {
        const room = getRoom(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Check if socket already in this room to prevent duplicate joins
        const rooms = Array.from(socket.rooms);
        if (rooms.includes(roomId)) {
          console.log(`Socket ${socket.id} already in room ${roomId}, ignoring duplicate join`);
          // Don't send any events to prevent triggering more loops
          return;
        }

        // Join room first
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        // Host joins but is NOT added to players list
        if (isHost) {
          if (!room.hostId && hostId) {
            room.hostId = hostId;
          }
          console.log(`Host ${hostId} joined room ${roomId}`);
          
          // Send room update to everyone in the room
          io.to(roomId).emit("roomUpdate", room);
          
          // Send current players list to the host
          socket.emit("playersUpdate", room.players);
          socket.emit("chipsUpdate", room.chips); // Send chips to host too
          socket.emit("categoriesUpdate", { categories: room.selectedCategories || [] }); // Send categories
          return;
        }

        // Only players are added to the players list
        if (player) {
          console.log(`Checking for existing player with ID: ${player.id}`);
          console.log(`Current players:`, room.players.map(p => ({ id: p.id, name: p.name })));
          
          // Check if player already exists (rejoining after refresh)
          const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
          
          if (existingPlayerIndex >= 0) {
            // Player exists, update their info (don't add duplicate)
            room.players[existingPlayerIndex] = player;
            // Ensure player has chips (in case they joined before game started)
            if (room.chips[player.id] === undefined) {
              room.chips[player.id] = STARTING_CHIPS;
              console.log(`💰 Initialized ${STARTING_CHIPS} chips for rejoining player ${player.id}`);
            }
            console.log(`✅ Player ${player.name} (${player.id}) REJOINED room ${roomId} - NO DUPLICATE ADDED`);
          } else {
            // New player trying to join
            
            // Validation 1: Don't allow join if game already started
            if (room.phase !== 'lobby') {
              console.log(`❌ Player ${player.name} tried to join room ${roomId} but game already started (phase: ${room.phase})`);
              socket.emit("error", { message: "Cannot join - game already started" });
              socket.leave(roomId); // Remove from room
              return;
            }
            
            // Validation 2: Don't allow more than 7 players (not including host)
            if (room.players.length >= 7) {
              console.log(`❌ Player ${player.name} tried to join room ${roomId} but room is full (7/7 players)`);
              socket.emit("error", { message: "Room is full (maximum 7 players)" });
              socket.leave(roomId); // Remove from room
              return;
            }
            
            // All validations passed, add new player
            addPlayer(roomId, player);
            console.log(`➕ NEW player ${player.name} (${player.id}) added to room ${roomId}. Total players: ${room.players.length}`);
          }
          
          const updatedRoom = getRoom(roomId);
          
          // IMPORTANT: Always broadcast to EVERYONE first (including this socket)
          console.log(`[Server] 💰 Chips after player join:`, updatedRoom.chips);
          io.to(roomId).emit("playersUpdate", updatedRoom.players);
          io.to(roomId).emit("roomUpdate", updatedRoom);
          io.to(roomId).emit("answersUpdate", updatedRoom.answers);
          console.log(`[Server] 📤 Emitting chipsUpdate after join:`, updatedRoom.chips);
          io.to(roomId).emit("chipsUpdate", updatedRoom.chips); // Send initial chips when player joins!
          io.to(roomId).emit("categoriesUpdate", { categories: updatedRoom.selectedCategories || [] }); // Send categories
        }
      });

      socket.on("submitAnswer", ({ roomId, playerId, guess }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for submitAnswer`);
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        submitAnswer(roomId, playerId, guess);
        const updatedRoom = getRoom(roomId);
        
        console.log(`Answer submitted in room ${roomId}. Total answers: ${updatedRoom.answers.length}/${updatedRoom.players.length}`);
        io.to(roomId).emit("answersUpdate", updatedRoom.answers);
        
        // Auto-reveal answers and transition to wager phase when all players have submitted
        if (updatedRoom.answers.length === updatedRoom.players.length && updatedRoom.players.length > 0) {
          console.log(`🎯 All players answered! Auto-revealing answers and transitioning to wager phase for room ${roomId}`);
          
          const result = revealAnswersAndPrepareWagers(roomId);
          if (result) {
            const finalRoom = getRoom(roomId);
            console.log(`✅ Transition complete. Phase: ${finalRoom.phase}, Tiles: ${result.answerTiles.length}`);
            console.log(`🎁 Zero-chip players:`, result.zeroChipPlayers);
            io.to(roomId).emit("answersRevealed", result);
            io.to(roomId).emit("roomUpdate", finalRoom);
            io.to(roomId).emit("chipsUpdate", finalRoom.chips);
          }
        }
      });

      socket.on("placeBet", ({ roomId, playerId, tileIndex, amount }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for placeBet`);
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        const result = placeBet(roomId, playerId, tileIndex, amount);
        
        if (result.success) {
          console.log(`✅ Bet placed in room ${roomId}: ${playerId} bet ${amount} on tile ${tileIndex}`);
          const updatedRoom = getRoom(roomId);
          io.to(roomId).emit("betsUpdate", { 
            bets: updatedRoom.bets,
            chips: updatedRoom.chips 
          });
        } else {
          console.log(`❌ Bet failed: ${result.error}`);
          socket.emit("betError", { error: result.error });
        }
      });

      socket.on("removeBet", ({ roomId, playerId, tileIndex }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for removeBet`);
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        const result = removeBet(roomId, playerId, tileIndex);
        
        if (result.success) {
          console.log(`✅ Bet removed in room ${roomId}: ${playerId} removed bet from tile ${tileIndex} (refunded: ${result.refundedAmount})`);
          const updatedRoom = getRoom(roomId);
          io.to(roomId).emit("betsUpdate", { 
            bets: updatedRoom.bets,
            chips: updatedRoom.chips 
          });
        } else {
          console.log(`❌ Remove bet failed: ${result.error}`);
          socket.emit("betError", { error: result.error });
        }
      });

      socket.on("confirmWagers", ({ roomId, playerId }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for confirmWagers`);
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        const result = confirmWager(roomId, playerId);
        
        if (result.success) {
          console.log(`✅ Player ${playerId} confirmed wagers in room ${roomId} (${result.confirmedCount}/${result.totalPlayers})`);
          
          // Broadcast confirmation status to all players
          const updatedRoom = getRoom(roomId);
          io.to(roomId).emit("wagersConfirmed", { 
            confirmedCount: result.confirmedCount,
            totalPlayers: result.totalPlayers,
            confirmedWagers: updatedRoom.confirmedWagers
          });
          
          // Auto-reveal if all players confirmed
          if (result.allConfirmed) {
            console.log(`🎯 All players confirmed wagers! Auto-revealing correct answer for room ${roomId}`);
            
            if (updatedRoom.currentQuestion) {
              const payoutResult = revealCorrectAnswerAndPayout(roomId, updatedRoom.currentQuestion.answer);
              
              if (payoutResult) {
                const finalRoom = getRoom(roomId);
                console.log(`✅ Payouts calculated. Emitting results to room ${roomId}`);
                io.to(roomId).emit("payoutResult", payoutResult);
                io.to(roomId).emit("roomUpdate", finalRoom);
                io.to(roomId).emit("chipsUpdate", finalRoom.chips);
              }
            }
          }
        } else {
          console.log(`❌ Confirm wagers failed for ${playerId}: ${result.error}`);
          socket.emit("confirmWagerError", { error: result.error });
        }
      });

      socket.on("revealAnswer", ({ roomId }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for revealAnswer`);
          return;
        }
        if (!room.currentQuestion) {
          console.error(`No current question in room ${roomId}`);
          return;
        }
        
        console.log(`[Server] Revealing correct answer and calculating payouts for room ${roomId}`);
        const result = revealCorrectAnswerAndPayout(roomId, room.currentQuestion.answer);
        
        if (result) {
          const updatedRoom = getRoom(roomId);
          console.log(`✅ Payouts calculated. Emitting results to room ${roomId}`);
          io.to(roomId).emit("payoutResult", result);
          io.to(roomId).emit("roomUpdate", updatedRoom);
          io.to(roomId).emit("chipsUpdate", updatedRoom.chips);
        }
      });

      socket.on("updateCategories", ({ roomId, categories }) => {
        console.log(`[Server] 📝 updateCategories event received for room ${roomId}, categories:`, categories);
        const room = getRoom(roomId);
        if (!room) {
          console.error(`[Server] Room ${roomId} not found for updateCategories`);
          return;
        }
        
        // Update room categories
        room.selectedCategories = categories;
        console.log(`[Server] ✅ Categories updated for room ${roomId}:`, categories);
        
        // Broadcast to all clients in the room
        io.to(roomId).emit("categoriesUpdate", { categories });
      });

      socket.on("startGame", ({ roomId, categories }) => {
        console.log(`[Server] 🎮 startGame event received for room ${roomId}, categories:`, categories);
        const room = getRoom(roomId);
        if (!room) {
          console.error(`[Server] Room ${roomId} not found for startGame`);
          return;
        }
        
        const result = startGame(roomId, categories);
        if (result) {
          const updatedRoom = getRoom(roomId);
          console.log(`[Server] ✅ Game started in room ${roomId}, round ${result.round}, phase: ${updatedRoom.phase}`);
          console.log(`[Server] 💰 Result chips:`, result.chips);
          console.log(`[Server] 📤 Emitting to room ${roomId}: playersUpdate (${updatedRoom.players.length} players), chips:`, updatedRoom.chips);
          console.log(`[Server] 📤 Emitting gameStarted with:`, result);
          io.to(roomId).emit("gameStarted", result);
          io.to(roomId).emit("roomUpdate", updatedRoom);
          io.to(roomId).emit("playersUpdate", updatedRoom.players);
          io.to(roomId).emit("answersUpdate", updatedRoom.answers);
          console.log(`[Server] 📤 Emitting chipsUpdate:`, updatedRoom.chips);
          io.to(roomId).emit("chipsUpdate", updatedRoom.chips); // Send initial chips!
        } else {
          console.error(`[Server] ❌ Failed to start game in room ${roomId}`);
        }
      });

      socket.on("nextRound", ({ roomId }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for nextRound`);
          return;
        }
        
        const result = nextRound(roomId);
        if (result) {
          const updatedRoom = getRoom(roomId);
          console.log(`Next round in room ${roomId}, phase: ${result.phase}`);
          io.to(roomId).emit("nextRound", result);
          io.to(roomId).emit("roomUpdate", updatedRoom);
          io.to(roomId).emit("playersUpdate", updatedRoom.players);
          io.to(roomId).emit("answersUpdate", updatedRoom.answers);
          io.to(roomId).emit("chipsUpdate", updatedRoom.chips); // Send updated chips!
        }
      });

      socket.on("setPhase", ({ roomId, phase }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for setPhase`);
          return;
        }
        
        const result = setPhase(roomId, phase);
        if (result) {
          const updatedRoom = getRoom(roomId);
          console.log(`Phase changed in room ${roomId} to ${phase}`);
          io.to(roomId).emit("phaseChanged", result);
          io.to(roomId).emit("roomUpdate", updatedRoom);
        }
      });

      socket.on("deleteRoom", ({ roomId, hostId }) => {
        console.log(`[Socket] deleteRoom event received: roomId=${roomId}, hostId=${hostId}`);
        
        const room = getRoom(roomId);
        console.log(`[Socket] Room found:`, room ? `Yes (hostId=${room.hostId})` : 'No');
        
        if (!room) {
          console.error(`[Socket] Room ${roomId} not found for deleteRoom`);
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Verify that the requester is the host
        console.log(`[Socket] Checking host: room.hostId=${room.hostId}, provided hostId=${hostId}`);
        if (room.hostId !== hostId) {
          console.error(`[Socket] User ${hostId} is not the host of room ${roomId}`);
          socket.emit("error", { message: "Only the host can delete the room" });
          return;
        }

        console.log(`[Socket] ✅ Room ${roomId} is being deleted by host ${hostId}`);
        
        // Notify all clients in the room that it's being deleted
        io.to(roomId).emit("roomDeleted", { roomId });
        console.log(`[Socket] Emitted roomDeleted event to room ${roomId}`);
        
        // Delete the room from memory
        const deleted = deleteRoom(roomId);
        console.log(`[Socket] Room ${roomId} deletion result: ${deleted ? 'SUCCESS' : 'FAILED'}`);
      });

      socket.on("leaveRoom", ({ roomId, playerId }) => {
        console.log(`[Socket] leaveRoom event received: roomId=${roomId}, playerId=${playerId}`);
        
        const room = getRoom(roomId);
        if (!room) {
          console.error(`[Socket] Room ${roomId} not found for leaveRoom`);
          socket.emit("error", { message: "Room not found" });
          return;
        }

        console.log(`[Socket] Player ${playerId} is leaving room ${roomId}`);
        
        // Remove player from the room
        const removed = removePlayer(roomId, playerId);
        console.log(`[Socket] Player removal result: ${removed ? 'SUCCESS' : 'FAILED'}`);
        
        if (removed) {
          const updatedRoom = getRoom(roomId);
          // Notify remaining players in the room
          io.to(roomId).emit("playersUpdate", updatedRoom.players);
          io.to(roomId).emit("roomUpdate", updatedRoom);
          console.log(`[Socket] Updated players list sent to room ${roomId}. Remaining players: ${updatedRoom.players.length}`);
        }
        
        // Confirm to the leaving player
        socket.emit("leftRoom", { roomId });
      });

      socket.on("requestRoomState", ({ roomId }) => {
        console.log(`[Socket] requestRoomState received for room ${roomId} from socket ${socket.id}`);
        const room = getRoom(roomId);
        if (!room) {
          console.error(`[Socket] Room ${roomId} not found for requestRoomState`);
          return;
        }
        
        // Send current room state to the requesting socket
        socket.emit("roomUpdate", room);
        socket.emit("playersUpdate", room.players);
        socket.emit("answersUpdate", room.answers);
        socket.emit("chipsUpdate", room.chips); // ✅ ส่ง chips ด้วย!
        console.log(`[Socket] 💰 Sent chips:`, room.chips);
        console.log(`[Socket] Sent room state to socket ${socket.id}: ${room.players.length} players, ${room.answers.length} answers`);
      });

      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      });
    });
  } else {
    console.log("♻️  Socket.io server already initialized");
  }

  res.end();
}

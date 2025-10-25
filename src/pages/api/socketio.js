// src/pages/api/socketio.js
import { Server } from "socket.io";
import {
  createRoom,
  addPlayer,
  submitAnswer,
  placeBet,
  revealAnswer,
  getRoom,
  startGame,
  nextRound,
  setPhase,
} from "@/lib/gameState";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
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
            console.log(`✅ Player ${player.name} (${player.id}) REJOINED room ${roomId} - NO DUPLICATE ADDED`);
          } else {
            // New player, add them
            addPlayer(roomId, player);
            console.log(`➕ NEW player ${player.name} (${player.id}) added to room ${roomId}. Total players: ${room.players.length}`);
          }
          
          const updatedRoom = getRoom(roomId);
          
          // Send updated players list to the rejoining/new player
          socket.emit("playersUpdate", updatedRoom.players);
          socket.emit("roomUpdate", updatedRoom);
          socket.emit("answersUpdate", updatedRoom.answers);
          
          // Now broadcast the updated list to EVERYONE in the room
          io.to(roomId).emit("playersUpdate", updatedRoom.players);
          io.to(roomId).emit("roomUpdate", updatedRoom);
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
        
        console.log(`Answer submitted in room ${roomId}. Total answers: ${updatedRoom.answers.length}`);
        io.to(roomId).emit("answersUpdate", updatedRoom.answers);
      });

      socket.on("placeBet", ({ roomId, playerId, betOn }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for placeBet`);
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        placeBet(roomId, playerId, betOn);
        console.log(`Bet placed in room ${roomId}`);
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
        
        const result = revealAnswer(roomId, room.currentQuestion.answer);
        console.log(`Answer revealed in room ${roomId}`);
        io.to(roomId).emit("roundResult", result);
        io.to(roomId).emit("roomUpdate", room);
      });

      socket.on("startGame", ({ roomId }) => {
        const room = getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for startGame`);
          return;
        }
        
        const result = startGame(roomId);
        if (result) {
          const updatedRoom = getRoom(roomId);
          console.log(`Game started in room ${roomId}, round ${result.round}`);
          io.to(roomId).emit("gameStarted", result);
          io.to(roomId).emit("roomUpdate", updatedRoom);
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
    });
  }

  res.end();
}

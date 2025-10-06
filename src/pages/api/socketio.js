// src/pages/api/socketio.js
import { Server } from "socket.io";
import {
  createRoom,
  addPlayer,
  submitAnswer,
  placeBet,
  revealAnswer,
  getRoom,
} from "@/lib/gameState";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.on("createRoom", (roomId) => {
        createRoom(roomId);
        socket.join(roomId);
        io.to(roomId).emit("roomCreated", { roomId });
      });

      socket.on("joinRoom", ({ roomId, player }) => {
        addPlayer(roomId, player);
        socket.join(roomId);
        io.to(roomId).emit("playersUpdate", getRoom(roomId).players);
      });

      socket.on("submitAnswer", ({ roomId, playerId, guess }) => {
        submitAnswer(roomId, playerId, guess);
        io.to(roomId).emit("answersUpdate", getRoom(roomId).answers);
      });

      socket.on("placeBet", ({ roomId, playerId, betOn }) => {
        placeBet(roomId, playerId, betOn);
      });

      socket.on("revealAnswer", ({ roomId, correctAnswer }) => {
        const result = revealAnswer(roomId, correctAnswer);
        io.to(roomId).emit("roundResult", result);
      });
    });
  }

  res.end();
}

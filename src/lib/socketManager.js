// src/lib/socketManager.js
import io from "socket.io-client";

let socket = null;
let isInitializing = false;

export async function getSocket() {
  // If socket already exists and is connected, return it
  if (socket && socket.connected) {
    console.log("[SocketManager] Reusing existing connected socket:", socket.id);
    return socket;
  }

  // If socket exists but disconnected, try to reconnect
  if (socket && !socket.connected) {
    console.log("[SocketManager] Socket exists but disconnected, attempting reconnect...");
    socket.connect();
    return socket;
  }

  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log("[SocketManager] Socket initialization in progress, waiting...");
    // Wait for initialization to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (socket && !isInitializing) {
          clearInterval(checkInterval);
          resolve(socket);
        }
      }, 50);
    });
  }

  // Initialize new socket
  isInitializing = true;
  console.log("[SocketManager] Creating new socket connection...");

  try {
    // Initialize Socket.IO endpoint first
    await fetch("/api/socketio");

    // Create new socket
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("[SocketManager] ✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[SocketManager] ❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[SocketManager] Connection error:", error);
    });

    isInitializing = false;
    return socket;
  } catch (error) {
    console.error("[SocketManager] Failed to initialize socket:", error);
    isInitializing = false;
    throw error;
  }
}

export function disconnectSocket() {
  if (socket) {
    console.log("[SocketManager] Disconnecting socket...");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocketInstance() {
  return socket;
}


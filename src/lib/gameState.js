// src/lib/gameState.js
const rooms = {};

export function createRoom(roomId) {
  rooms[roomId] = {
    id: roomId,
    players: [],
    questions: [],
    currentRound: 0,
    answers: [],
    bets: [],
    scores: {},
  };
  return rooms[roomId];
}

export function getRoom(roomId) {
  return rooms[roomId];
}

export function addPlayer(roomId, player) {
  const room = getRoom(roomId);
  if (!room) return;
  room.players.push(player);
  room.scores[player.id] = 0;
}

export function submitAnswer(roomId, playerId, guess) {
  const room = getRoom(roomId);
  if (!room) return;
  room.answers.push({ playerId, guess });
}

export function placeBet(roomId, playerId, betOn) {
  const room = getRoom(roomId);
  if (!room) return;
  room.bets.push({ playerId, betOn });
}

export function revealAnswer(roomId, correctAnswer) {
  const room = getRoom(roomId);
  if (!room) return;

  // หาคำตอบที่ใกล้สุดแต่ไม่เกิน
  const validAnswers = room.answers
    .map(a => ({ ...a, diff: correctAnswer - a.guess }))
    .filter(a => a.diff >= 0)
    .sort((a, b) => a.diff - b.diff);

  const winner = validAnswers[0];
  if (!winner) return;

  // ให้แต้มกับคนที่เดิมพันถูก
  for (const bet of room.bets) {
    if (bet.betOn === winner.playerId) {
      room.scores[bet.playerId] += 10; // สมมติแต้มคงที่
    }
  }

  return { winner, scores: room.scores };
}

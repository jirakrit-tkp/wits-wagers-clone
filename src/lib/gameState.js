// src/lib/gameState.js
import questions from './questions.json';

const rooms = {};

export function createRoom(roomId, hostId) {
  rooms[roomId] = {
    id: roomId,
    hostId: hostId || null,
    players: [],
    phase: 'lobby', // 'lobby' | 'question' | 'reveal' | 'wager' | 'scoring' | 'finished'
    questions: [],
    currentQuestion: null,
    currentRound: 0,
    totalRounds: 7,
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

  // Find the closest answer without exceeding the correct answer
  const validAnswers = room.answers
    .map(a => ({ ...a, diff: correctAnswer - a.guess }))
    .filter(a => a.diff >= 0)
    .sort((a, b) => a.diff - b.diff);

  const winner = validAnswers[0];
  if (!winner) return;

  // Award points to those who bet correctly
  for (const bet of room.bets) {
    if (bet.betOn === winner.playerId) {
      room.scores[bet.playerId] += 10; // Fixed points
    }
  }

  room.phase = 'reveal';
  return { winner, scores: room.scores, correctAnswer };
}

// Get a random question from a specific category or all categories
export function getRandomQuestion(category = null) {
  let questionPool = [];
  let categoryName = null;
  
  if (category && questions[category]) {
    questionPool = questions[category];
    categoryName = category;
  } else {
    // Get questions from all categories
    Object.entries(questions).forEach(([cat, categoryQuestions]) => {
      if (Array.isArray(categoryQuestions)) {
        categoryQuestions.forEach(q => {
          questionPool.push({ ...q, category: cat });
        });
      }
    });
  }
  
  if (questionPool.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * questionPool.length);
  const selectedQuestion = questionPool[randomIndex];
  
  // Ensure category is set
  if (!selectedQuestion.category && categoryName) {
    selectedQuestion.category = categoryName;
  }
  
  return selectedQuestion;
}

// Start the game
export function startGame(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  const question = getRandomQuestion();
  if (!question) return null;
  
  room.phase = 'question';
  room.currentQuestion = question;
  room.currentRound = 1;
  room.answers = [];
  room.bets = [];
  
  return { phase: room.phase, question, round: room.currentRound };
}

// Move to next round
export function nextRound(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  room.currentRound += 1;
  
  if (room.currentRound > room.totalRounds) {
    room.phase = 'finished';
    return { phase: room.phase, scores: room.scores };
  }
  
  const question = getRandomQuestion();
  if (!question) return null;
  
  room.phase = 'question';
  room.currentQuestion = question;
  room.answers = [];
  room.bets = [];
  
  return { phase: room.phase, question, round: room.currentRound };
}

// Set room phase
export function setPhase(roomId, phase) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  room.phase = phase;
  return { phase: room.phase };
}

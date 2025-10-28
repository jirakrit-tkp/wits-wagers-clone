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

export function deleteRoom(roomId) {
  if (rooms[roomId]) {
    delete rooms[roomId];
    return true;
  }
  return false;
}

export function addPlayer(roomId, player) {
  const room = getRoom(roomId);
  if (!room) return;
  room.players.push(player);
  room.scores[player.id] = 0;
}

export function removePlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return false;
  
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex >= 0) {
    room.players.splice(playerIndex, 1);
    delete room.scores[playerId];
    return true;
  }
  return false;
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

  let winner = validAnswers[0] || null;
  
  // If no one answered without exceeding (all guesses are too high),
  // then NO WINNER - no one gets points
  if (!winner && room.answers.length > 0) {
    console.log('[gameState] ❌ No winner - all guesses exceeded the correct answer!');
    const sortedByGuess = [...room.answers].sort((a, b) => a.guess - b.guess);
    const smallestGuess = sortedByGuess[0];
    console.log(`[gameState] Smallest guess was: ${smallestGuess.playerId} with ${smallestGuess.guess} (but correct answer was ${correctAnswer})`);
  } else if (winner) {
    console.log(`[gameState] ✅ Winner: ${winner.playerId} with ${winner.guess} (correct: ${correctAnswer})`);
  }

  // Award points ONLY if there's a winner
  if (winner) {
    for (const bet of room.bets) {
      if (bet.betOn === winner.playerId) {
        room.scores[bet.playerId] += 10; // Fixed points
      }
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
  console.log(`[gameState] startGame called for room ${roomId}`);
  const room = getRoom(roomId);
  if (!room) {
    console.error(`[gameState] ❌ Room ${roomId} not found!`);
    return null;
  }
  
  console.log(`[gameState] Room found with ${room.players.length} players, current phase: ${room.phase}`);
  
  const question = getRandomQuestion();
  if (!question) {
    console.error(`[gameState] ❌ No question available!`);
    return null;
  }
  
  console.log(`[gameState] Question selected: ${question.question}`);
  room.phase = 'question';
  room.currentQuestion = question;
  room.currentRound = 1;
  room.answers = [];
  room.bets = [];
  
  console.log(`[gameState] ✅ Phase changed to: ${room.phase}, round: ${room.currentRound}`);
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

// src/lib/gameState.js
import questions from './questions.json';

const rooms = {};

const STARTING_CHIPS = 500;

export function createRoom(roomId, hostId) {
  rooms[roomId] = {
    id: roomId,
    hostId: hostId || null,
    players: [],
    phase: 'lobby', // 'lobby' | 'question' | 'reveal' | 'wager' | 'payout' | 'finished'
    questions: [],
    currentQuestion: null,
    currentRound: 0,
    totalRounds: 7,
    answers: [],
    answerTiles: [], // Sorted unique answers with multipliers
    bets: [], // { playerId, tileIndex, amount }
    confirmedWagers: [], // [playerId] - players who confirmed their bets
    chips: {}, // { playerId: chipCount }
    chipsAtWagerStart: {}, // Snapshot of chips at the START of wager phase
    scores: {}, // Keep for backwards compatibility, but chips are primary now
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
  room.chips[player.id] = STARTING_CHIPS;
  room.scores[player.id] = 0; // Keep for backwards compatibility
  console.log(`[gameState] Player ${player.id} added with ${STARTING_CHIPS} chips`);
}

export function removePlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return false;
  
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex >= 0) {
    room.players.splice(playerIndex, 1);
    delete room.chips[playerId];
    delete room.scores[playerId];
    return true;
  }
  return false;
}

export function submitAnswer(roomId, playerId, guess) {
  const room = getRoom(roomId);
  if (!room) return;
  
  // Check if player already submitted
  const existingIndex = room.answers.findIndex(a => a.playerId === playerId);
  if (existingIndex >= 0) {
    // Update existing answer
    room.answers[existingIndex].guess = guess;
    console.log(`[gameState] Player ${playerId} updated answer to ${guess}`);
  } else {
    room.answers.push({ playerId, guess });
    console.log(`[gameState] Player ${playerId} submitted answer: ${guess}`);
  }
}

// Calculate multipliers and create answer tiles
export function createAnswerTiles(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  console.log(`[gameState] Creating answer tiles for room ${roomId}`);
  
  // Group answers by unique values and get player IDs for each
  const answerMap = new Map();
  room.answers.forEach(({ playerId, guess }) => {
    if (!answerMap.has(guess)) {
      answerMap.set(guess, []);
    }
    answerMap.get(guess).push(playerId);
  });
  
  // Sort unique answers ascending
  const sortedAnswers = Array.from(answerMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([guess, playerIds]) => ({ guess, playerIds }));
  
  const numTiles = sortedAnswers.length;
  console.log(`[gameState] Found ${numTiles} unique answers`);
  
  // Assign multipliers based on position
  const tiles = sortedAnswers.map((answer, index) => {
    let multiplier;
    
    if (numTiles % 2 === 1) {
      // Odd number: symmetric from center
      const center = Math.floor(numTiles / 2);
      const distance = Math.abs(index - center);
      multiplier = distance + 2; // x2 at center, x3, x4, ...
    } else {
      // Even number: both middle tiles get x3
      const leftMiddle = numTiles / 2 - 1;
      const rightMiddle = numTiles / 2;
      
      if (index === leftMiddle || index === rightMiddle) {
        multiplier = 3;
      } else if (index < leftMiddle) {
        multiplier = leftMiddle - index + 3;
      } else {
        multiplier = index - rightMiddle + 3 + 1;
      }
    }
    
    return {
      guess: answer.guess,
      playerIds: answer.playerIds,
      multiplier,
      index
    };
  });
  
  // Add "Smaller than smallest guess" tile
  const smallestMultiplier = Math.max(...tiles.map(t => t.multiplier));
  tiles.unshift({
    guess: null, // Special marker for "smaller than all"
    playerIds: [],
    multiplier: smallestMultiplier + 1,
    index: -1, // Special index
    isSmallerTile: true
  });
  
  room.answerTiles = tiles;
  console.log(`[gameState] Created ${tiles.length} tiles (including "Smaller"):`, 
    tiles.map(t => t.isSmallerTile ? `Smaller(x${t.multiplier})` : `${t.guess}(x${t.multiplier})`).join(', '));
  
  return tiles;
}

export function placeBet(roomId, playerId, tileIndex, amount) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  
  // Validate chip amount
  const currentChips = room.chips[playerId] || 0;
  
  // 🔴 Special case: Zero-chip player (had 0 chips AT THE START of wager phase) can place ONE bet without chips
  const chipsAtStart = room.chipsAtWagerStart?.[playerId] || 0;
  const isZeroChipBet = amount === 0 && chipsAtStart === 0;
  
  if (!isZeroChipBet) {
    if (amount > currentChips) {
      console.log(`[gameState] ❌ Player ${playerId} tried to bet ${amount} but only has ${currentChips} chips`);
      return { success: false, error: 'Not enough chips' };
    }
    
    if (amount <= 0) {
      return { success: false, error: 'Bet amount must be positive' };
    }
    
    // Deduct chips immediately when bet is placed
    room.chips[playerId] -= amount;
  }
  
  // Add bet (with special flag for zero-chip bets)
  room.bets.push({ playerId, tileIndex, amount, isZeroChipBet });
  
  if (isZeroChipBet) {
    console.log(`[gameState] 🎁 Player ${playerId} placed ZERO-CHIP bet on tile ${tileIndex} (had 0 chips at wager start)`);
  } else {
    console.log(`[gameState] ✅ Player ${playerId} bet ${amount} chips on tile ${tileIndex} (remaining: ${room.chips[playerId]})`);
  }
  
  return { success: true, remainingChips: room.chips[playerId], isZeroChipBet };
}

// Reveal answers and transition to wager phase
export function revealAnswersAndPrepareWagers(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  console.log(`[gameState] Revealing answers for room ${roomId}`);
  
  // Create answer tiles with multipliers
  const tiles = createAnswerTiles(roomId);
  
  // 🔴 IMPORTANT: Take snapshot of chips BEFORE wager phase starts
  // This is to distinguish between:
  // 1. Players who had 0 chips BEFORE wager (true zero-chip players)
  // 2. Players who bet all their chips and ended up with 0 (not zero-chip players)
  room.chipsAtWagerStart = { ...room.chips };
  console.log(`[gameState] 📸 Snapshot taken - chips at wager start:`, room.chipsAtWagerStart);
  
  // Check for players with 0 chips AT THE START of wager phase
  const zeroChipPlayers = room.players.filter(p => (room.chips[p.id] || 0) === 0);
  const allPlayersZeroChips = zeroChipPlayers.length === room.players.length && room.players.length > 0;
  
  if (allPlayersZeroChips) {
    // Case 2: ถ้าทุกคนหมดชิป - ไม่ให้ชิปมาเลย ต้องเลือกถูกก่อน
    // ถ้าเลือกถูกจะได้ 250 chips ใน payout phase
    console.log(`[gameState] ⚠️ All players have 0 chips! Must guess correctly to get 250 chips`);
  } else if (zeroChipPlayers.length > 0) {
    // Case 1: มีบางคนหมดชิป - จะได้รางวัลพิเศษ 25% ของรางวัลสูงสุด
    console.log(`[gameState] ⚠️ ${zeroChipPlayers.length} player(s) have 0 chips - will receive special reward`);
  }
  
  // Change phase to wager
  room.phase = 'wager';
  room.bets = []; // Reset bets for this round
  room.confirmedWagers = []; // Reset confirmed wagers
  
  return {
    phase: room.phase,
    answerTiles: tiles,
    zeroChipPlayers: zeroChipPlayers.map(p => p.id)
  };
}

// Player confirms their wagers
export function confirmWager(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  
  // Check if player already confirmed
  if (room.confirmedWagers.includes(playerId)) {
    console.log(`[gameState] Player ${playerId} already confirmed wagers`);
    return { success: true, alreadyConfirmed: true };
  }
  
  // Check if zero-chip player has placed their special bet
  // 🔴 Use chipsAtWagerStart to check if player was TRULY zero-chip at the start
  const playerChipsAtStart = room.chipsAtWagerStart[playerId] || 0;
  if (playerChipsAtStart === 0) {
    const hasZeroChipBet = room.bets.some(b => b.playerId === playerId && b.isZeroChipBet);
    if (!hasZeroChipBet) {
      console.log(`[gameState] ❌ Player ${playerId} (zero chips at start) must place a bet before confirming`);
      return { success: false, error: 'You must select 1 betting tile before confirming' };
    }
  }
  
  // Add to confirmed list
  room.confirmedWagers.push(playerId);
  console.log(`[gameState] ✅ Player ${playerId} confirmed wagers (${room.confirmedWagers.length}/${room.players.length})`);
  
  // Check if all players confirmed
  const allConfirmed = room.confirmedWagers.length === room.players.length && room.players.length > 0;
  
  return { 
    success: true, 
    confirmedCount: room.confirmedWagers.length,
    totalPlayers: room.players.length,
    allConfirmed 
  };
}

// Determine winning tile and payout
export function revealCorrectAnswerAndPayout(roomId, correctAnswer) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  console.log(`[gameState] Revealing correct answer: ${correctAnswer} for room ${roomId}`);
  
  // Find the winning tile (highest guess that doesn't exceed correct answer)
  let winningTileIndex = -1; // Default to "Smaller" tile (index 0 after unshift)
  let winningTile = null;
  
  // answerTiles[0] is "Smaller" tile, so check from index 1 onwards
  for (let i = 1; i < room.answerTiles.length; i++) {
    const tile = room.answerTiles[i];
    if (tile.guess <= correctAnswer) {
      winningTileIndex = i;
      winningTile = tile;
    } else {
      break; // Since tiles are sorted, no need to check further
    }
  }
  
  // If winningTileIndex is still -1 or we never found a valid tile, "Smaller" wins
  if (winningTileIndex === -1) {
    winningTileIndex = 0;
    winningTile = room.answerTiles[0]; // "Smaller than smallest" tile
    console.log(`[gameState] 🎯 All guesses too high! "Smaller than smallest" (x${winningTile.multiplier}) wins!`);
  } else {
    console.log(`[gameState] 🎯 Winning tile: ${winningTile.guess} (x${winningTile.multiplier})`);
  }
  
  // Calculate payouts
  const payouts = {}; // { playerId: { wonChips, bets: [...], isZeroChipBonus: boolean } }
  let maxWinnings = 0;
  
  room.bets.forEach(bet => {
    // Check if bet is on winning tile
    const betTileIndex = bet.tileIndex;
    
    if (betTileIndex === winningTileIndex) {
      const multiplier = winningTile.multiplier;
      const winnings = bet.amount * multiplier;
      
      if (!payouts[bet.playerId]) {
        payouts[bet.playerId] = { wonChips: 0, bets: [], isZeroChipBonus: false };
      }
      
      payouts[bet.playerId].wonChips += winnings;
      payouts[bet.playerId].bets.push({
        tileIndex: betTileIndex,
        amount: bet.amount,
        multiplier,
        winnings
      });
      
      // Track max winnings for zero-chip bonus calculation
      if (winnings > maxWinnings) {
        maxWinnings = winnings;
      }
      
      // Add winnings to player's chips
      room.chips[bet.playerId] = (room.chips[bet.playerId] || 0) + winnings;
      
      console.log(`[gameState] 💰 Player ${bet.playerId} won ${winnings} chips (${bet.amount} x ${multiplier})`);
    }
  });
  
  // Handle zero-chip bets
  // Find bets placed by players with 0 chips (isZeroChipBet flag)
  const zeroChipBets = room.bets.filter(b => b.isZeroChipBet === true);
  
  if (zeroChipBets.length > 0) {
    // Check if ALL players had 0 chips at wager start
    const allPlayersWereZeroChip = room.players.every(p => (room.chipsAtWagerStart[p.id] || 0) === 0);
    
    let bonusAmount;
    if (allPlayersWereZeroChip) {
      // Case 2: ทุกคนหมดชิป → ถ้าเลือกถูกได้ 250 chips
      bonusAmount = 250;
      console.log(`[gameState] 🎁 All players had 0 chips - bonus: ${bonusAmount} chips (fixed)`);
    } else {
      // Case 1: หมดบางคน → ถ้าเลือกถูกได้ 25% ของรางวัลสูงสุด
      bonusAmount = Math.floor(maxWinnings * 0.25);
      console.log(`[gameState] 🎁 Zero-chip bonus available: ${bonusAmount} chips (25% of ${maxWinnings})`);
    }
    
    zeroChipBets.forEach(bet => {
      // Check if the zero-chip bet is on the WINNING tile
      if (bet.tileIndex === winningTileIndex) {
        room.chips[bet.playerId] = (room.chips[bet.playerId] || 0) + bonusAmount;
        
        if (!payouts[bet.playerId]) {
          payouts[bet.playerId] = { wonChips: 0, bets: [], isZeroChipBonus: true };
        }
        payouts[bet.playerId].wonChips += bonusAmount;
        payouts[bet.playerId].isZeroChipBonus = true;
        
        console.log(`[gameState] 🎁✅ Player ${bet.playerId} guessed correctly! Receives bonus: ${bonusAmount} chips`);
      } else {
        console.log(`[gameState] 🎁❌ Player ${bet.playerId} guessed wrong tile ${bet.tileIndex} (winning: ${winningTileIndex}) - no bonus`);
      }
    });
  }
  
  // Log losing bets
  room.bets.forEach(bet => {
    if (bet.tileIndex !== winningTileIndex) {
      console.log(`[gameState] ❌ Player ${bet.playerId} lost ${bet.amount} chips on tile ${bet.tileIndex}`);
    }
  });
  
  room.phase = 'payout';
  
  return {
    correctAnswer,
    winningTileIndex,
    winningTile,
    payouts,
    chips: room.chips,
    answerTiles: room.answerTiles,
    maxWinnings
  };
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
  room.answerTiles = [];
  room.bets = [];
  room.confirmedWagers = [];
  
  console.log(`[gameState] ✅ Phase changed to: ${room.phase}, round: ${room.currentRound}`);
  console.log(`[gameState] 💰 Player chips:`, room.chips);
  
  return { 
    phase: room.phase, 
    question, 
    round: room.currentRound,
    chips: room.chips 
  };
}

// Move to next round
export function nextRound(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  room.currentRound += 1;
  
  if (room.currentRound > room.totalRounds) {
    room.phase = 'finished';
    
    // Sort players by chips for final leaderboard
    const leaderboard = room.players
      .map(p => ({
        id: p.id,
        name: p.name,
        chips: room.chips[p.id] || 0
      }))
      .sort((a, b) => b.chips - a.chips);
    
    console.log(`[gameState] 🏆 Game finished! Final leaderboard:`, leaderboard);
    
    return { 
      phase: room.phase, 
      chips: room.chips,
      leaderboard 
    };
  }
  
  const question = getRandomQuestion();
  if (!question) return null;
  
  room.phase = 'question';
  room.currentQuestion = question;
  room.answers = [];
  room.answerTiles = [];
  room.bets = [];
  room.confirmedWagers = [];
  
  console.log(`[gameState] ▶️ Round ${room.currentRound} started`);
  
  return { 
    phase: room.phase, 
    question, 
    round: room.currentRound,
    chips: room.chips 
  };
}

// Set room phase
export function setPhase(roomId, phase) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  room.phase = phase;
  return { phase: room.phase };
}

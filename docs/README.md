# Wits & Wagers Clone - Developer Documentation

## Overview

This is a real-time multiplayer trivia and wagering game built with Next.js and Socket.IO. Players submit numerical answers to trivia questions, then bet chips on which guess is closest to (but not exceeding) the correct answer. The game operates in phases: lobby → question → wager → payout, repeating for multiple rounds.

### Architecture

The system follows a **client-server architecture** with real-time synchronization:

- **Client Side (Next.js React)**: Handles UI, user interactions, and displays game state
- **Server Side (Next.js API + Socket.IO)**: Manages game state in memory, processes game logic, and broadcasts updates
- **State Management**: Server-side authoritative state stored in `gameState.js` (in-memory `rooms` object)
- **Real-time Communication**: Socket.IO bidirectional events for all game actions

**Key Design Decision**: Game state lives entirely server-side in memory. This keeps the system simple for single-instance deployments, enables quick state resets, and ensures all clients stay synchronized via Socket.IO broadcasts.

---

## System Flow

### 1. Room Creation & Lobby Phase

```
User visits index.js
  ↓
Creates/joins room → Redirects to /room/[id]/lobby
  ↓
Socket connects → emit("createRoom") / emit("joinRoom")
  ↓
Server creates/adds player → Broadcasts roomUpdate, playersUpdate, chipsUpdate
  ↓
Host clicks "Start Game" → emit("startGame")
  ↓
Server: startGame() → Sets phase="question", selects question, initializes chips
  ↓
Broadcasts: gameStarted → All clients navigate to game page
```

### 2. Question Phase

```
Client receives gameStarted → Sets phase="question"
  ↓
Players enter numerical guesses → emit("submitAnswer")
  ↓
Server: submitAnswer() → Stores answer in room.answers[]
  ↓
When all players answered → Auto-triggers revealAnswersAndPrepareWagers()
  ↓
Creates answer tiles with multipliers → Snapshot chipsAtWagerStart
  ↓
Broadcasts: answersRevealed → Phase changes to "wager"
```

### 3. Wager Phase

```
Client receives answersRevealed → Displays answer tiles
  ↓
Players place bets on tiles → emit("placeBet") / emit("removeBet")
  ↓
Server: placeBet() → Deducts chips immediately, stores bet in room.bets[]
  ↓
Broadcasts: betsUpdate (includes updated chips)
  ↓
Players confirm wagers → emit("confirmWagers")
  ↓
Server: confirmWager() → Adds to room.confirmedWagers[]
  ↓
When all confirmed → Auto-triggers revealCorrectAnswerAndPayout()
  ↓
Calculates winning tile, payouts → Updates chips
  ↓
Broadcasts: payoutResult → Phase changes to "payout"
```

### 4. Payout Phase

```
Client receives payoutResult → Displays results, updated chips
  ↓
Players review winnings → Click "Next Question"
  ↓
emit("readyForNextRound") → Server tracks in room.readyForNextRound[]
  ↓
When all ready → Auto-triggers nextRound()
  ↓
Selects new question, resets state → Back to Question Phase
  ↓
Repeat for 7 rounds → Final phase="finished"
```

### 5. Host Controls Flow

Host has special controls (`HostControls.js`):

- **Force Next Phase**: `emit("setPhase")` → Server handles phase transitions with special logic:
  - `question → wager`: Calls `revealAnswersAndPrepareWagers()` first
  - `wager → payout`: Calls `revealCorrectAnswerAndPayout()` first
  - Other transitions: Simple `setPhase()`
- **Next Round**: Direct `emit("nextRound")` → Advances to next question
- **Delete Room**: `emit("deleteRoom")` → Broadcasts `roomDeleted`, cleans up state

---

## Socket & Real-time Logic

### Client → Server Events

#### Room Management
- **`createRoom`**: `{ roomId, hostId, hostMode }`
  - Creates room in `gameState`, joins socket to room
  - Emits: `roomCreated`, `roomUpdate`

- **`joinRoom`**: `{ roomId, player?, isHost, hostId?, hostMode?, hostName?, hostColor? }`
  - Adds player to room, initializes chips (500), joins socket
  - Special handling: If host in "player" mode, adds host to `players[]`
  - Emits: `playersUpdate`, `chipsUpdate`, `roomUpdate`, `answersUpdate`, `categoriesUpdate`

- **`leaveRoom`**: `{ roomId, playerId }`
  - Removes player from room, cleans up chips/scores
  - Emits: `playersUpdate`, `roomUpdate`, `chipsUpdate`

- **`deleteRoom`**: `{ roomId, hostId }` (host only)
  - Validates host, deletes room from memory
  - Emits: `roomDeleted` (triggers client redirects)

#### Game Flow
- **`startGame`**: `{ roomId, categories }`
  - Calls `startGame()`, selects question, initializes chips
  - Emits: `gameStarted`, `roomUpdate`, `playersUpdate`, `answersUpdate`, `chipsUpdate`

- **`nextRound`**: `{ roomId }` (host only)
  - Calls `nextRound()`, selects new question, resets answers/bets
  - Emits: `nextRound`, `roomUpdate`, `playersUpdate`, `answersUpdate`, `chipsUpdate`

- **`setPhase`**: `{ roomId, phase }` (host only)
  - Forces phase change with special transition logic
  - Emits: `phaseChanged` or `answersRevealed` / `payoutResult` (depending on transition)

#### Answer Submission
- **`submitAnswer`**: `{ roomId, playerId, guess }`
  - Stores/updates answer in `room.answers[]`
  - Emits: `answersUpdate`
  - **Auto-trigger**: When `answers.length === players.length`, calls `revealAnswersAndPrepareWagers()`

#### Wagering
- **`placeBet`**: `{ roomId, playerId, tileIndex, amount }`
  - Validates chips, deducts immediately, stores bet
  - Special: Zero-chip players can place `amount=0` bets (flagged `isZeroChipBet`)
  - Emits: `betsUpdate` (includes updated chips)

- **`removeBet`**: `{ roomId, playerId, tileIndex }`
  - Removes bet, refunds chips (unless zero-chip bet)
  - Emits: `betsUpdate`

- **`confirmWagers`**: `{ roomId, playerId }`
  - Adds to `confirmedWagers[]`, validates zero-chip players have bet
  - Emits: `wagersConfirmed`
  - **Auto-trigger**: When all confirmed, calls `revealCorrectAnswerAndPayout()`

#### Payout Phase
- **`readyForNextRound`**: `{ roomId, playerId }`
  - Tracks ready players in `readyForNextRound[]`
  - Emits: `readyForNextRoundUpdate`
  - **Auto-trigger**: When all ready, calls `nextRound()`

- **`revealAnswer`**: `{ roomId }` (host only, manual trigger)
  - Alternative to auto-trigger, manually calculates payouts
  - Emits: `payoutResult`, `roomUpdate`, `chipsUpdate`

#### Configuration
- **`updateCategories`**: `{ roomId, categories }` (host only)
  - Updates `room.selectedCategories`
  - Emits: `categoriesUpdate`

### Server → Client Events

- **`roomCreated`**: `{ roomId }` - Room initialized
- **`roomUpdate`**: Full room object - State sync after any change
- **`playersUpdate`**: Array of players - Player list changes
- **`chipsUpdate`**: `{ playerId: chips }` - Chip count changes
- **`answersUpdate`**: Array of `{ playerId, guess }` - Answer submissions
- **`gameStarted`**: `{ phase, question, round, chips }` - Game begins
- **`answersRevealed`**: `{ phase, answerTiles, zeroChipPlayers }` - Transition to wager
- **`betsUpdate`**: `{ bets, chips }` - Bet placements/removals
- **`wagersConfirmed`**: `{ confirmedCount, totalPlayers, confirmedWagers }` - Confirmation status
- **`payoutResult`**: `{ correctAnswer, winningTileIndex, winningTile, payouts, chips, answerTiles }` - Round results
- **`nextRound`**: `{ phase, question, round, chips }` - New round starts
- **`phaseChanged`**: `{ phase }` - Manual phase change
- **`categoriesUpdate`**: `{ categories }` - Category selection changed
- **`readyForNextRoundUpdate`**: `{ readyCount, totalPlayers, readyPlayers }` - Readiness status
- **`roomDeleted`**: `{ roomId }` - Room cleanup
- **`error`**: `{ message }` - Error notifications

### Synchronization Patterns

1. **State Sync on Join**: When a player joins, server broadcasts full room state (`roomUpdate`, `playersUpdate`, `chipsUpdate`, etc.) to ensure new client is in sync.

2. **Optimistic Updates**: Client updates local state immediately (e.g., chips deduction on bet), but server is authoritative. Server broadcasts correct state after processing.

3. **Auto-advance Triggers**: Multiple auto-advance mechanisms:
   - All answers submitted → Auto-reveal to wager phase
   - All wagers confirmed → Auto-calculate payouts
   - All players ready → Auto-advance to next round

4. **Broadcast Strategy**: Most server actions broadcast to entire room (`io.to(roomId).emit()`), ensuring all clients stay synchronized.

---

## Game Logic / State Management

### Room State Structure

Each room (`rooms[roomId]`) contains:

```javascript
{
  id: string,
  hostId: string,
  hostMode: "gm" | "player",
  players: [{ id, name, color, score, isHost? }],
  phase: "lobby" | "question" | "wager" | "payout" | "finished",
  questions: [],
  currentQuestion: { question, answer, category },
  currentRound: number,
  totalRounds: 7,
  answers: [{ playerId, guess }],
  answerTiles: [{ guess, playerIds, multiplier, index }],
  bets: [{ playerId, tileIndex, amount, isZeroChipBet }],
  confirmedWagers: [playerId],
  readyForNextRound: [playerId],
  chips: { playerId: chipCount },
  chipsAtWagerStart: { playerId: chipCount }, // Snapshot
  scores: { playerId: score }, // Legacy, chips are primary
  selectedCategories: string[]
}
```

### Key Game Logic Functions

#### `createAnswerTiles(roomId)`

Creates betting tiles from player answers with multipliers:

1. Groups answers by unique value (e.g., multiple players guess "50")
2. Sorts unique answers ascending
3. Assigns multipliers based on position:
   - Odd number of tiles: Center gets x2, outer tiles get higher multipliers (x3, x4, ...)
   - Even number: Two middle tiles get x3, others scale outward
4. Prepends "Smaller than smallest" tile with highest multiplier + 1
5. Returns tiles array stored in `room.answerTiles`

**Why this design**: Creates betting tiers where more extreme (but valid) guesses have higher potential payouts, incentivizing risk-taking.

#### `revealAnswersAndPrepareWagers(roomId)`

Critical transition function from question → wager phase:

1. Calls `createAnswerTiles()` to generate betting options
2. **Snapshots `chipsAtWagerStart`** - Essential for zero-chip player detection
3. Identifies zero-chip players (those with 0 chips at wager start)
4. Resets `bets[]` and `confirmedWagers[]`
5. Sets `phase = "wager"`

**Why snapshot**: Distinguishes between players who had 0 chips BEFORE wagering vs. those who bet all chips and ended up at 0. Only the former can use zero-chip betting mechanic.

#### `placeBet(roomId, playerId, tileIndex, amount)`

Places a bet with chip validation:

1. Checks if player has enough chips (or is zero-chip player)
2. **Deducts chips immediately** when bet is placed (not on confirm)
3. Stores bet with `isZeroChipBet` flag if applicable
4. Returns success/failure

**Why immediate deduction**: Prevents players from placing multiple bets with same chips, ensures chips are locked in during wager phase.

#### `confirmWager(roomId, playerId)`

Validates and confirms a player's wagers:

1. Checks if already confirmed (idempotent)
2. **Zero-chip validation**: Zero-chip players MUST have placed at least one bet (checked via `chipsAtWagerStart`)
3. Adds to `confirmedWagers[]`
4. Checks if all players confirmed → triggers auto-advance

**Why zero-chip validation**: Ensures zero-chip players participate (they must guess correctly to get bonus).

#### `revealCorrectAnswerAndPayout(roomId, correctAnswer)`

Calculates winning tile and distributes payouts:

1. Finds winning tile: Highest guess that doesn't exceed `correctAnswer`
   - Iterates through sorted answer tiles (index 1+)
   - If all guesses too high, "Smaller" tile (index 0) wins
2. Calculates payouts for bets on winning tile:
   - `winnings = bet.amount * tile.multiplier`
   - Adds winnings to player chips
3. **Zero-chip bonus logic**:
   - If ALL players had 0 chips: Fixed 250 chip bonus for correct guess
   - If SOME players had 0 chips: 25% of max winnings as bonus
   - Only applies if zero-chip bet is on winning tile
4. Sets `phase = "payout"`
5. Returns payout results with updated chips

**Why zero-chip bonus**: Prevents eliminated players from being stuck, incentivizes participation even when out of chips.

#### `nextRound(roomId)`

Advances to next round:

1. Increments `currentRound`
2. Checks if `currentRound > totalRounds` → Sets `phase = "finished"`
3. Selects new question from `selectedCategories`
4. Resets: `answers[]`, `answerTiles[]`, `bets[]`, `confirmedWagers[]`, `readyForNextRound[]`
5. Keeps chips (accumulated across rounds)

### State Transitions

```
lobby → [startGame] → question
  ↓ [all answers submitted]
wager → [all wagers confirmed] → payout
  ↓ [all players ready] OR [host nextRound]
question (new round)
  ↓ [7 rounds complete]
finished
```

### Chip Flow

- **Initial**: All players start with 500 chips (`STARTING_CHIPS`)
- **Betting**: Chips deducted immediately on `placeBet()`, refunded if bet removed
- **Winnings**: Added to chips when payout calculated (bet amount × multiplier)
- **Zero-chip mechanic**: Special bets don't deduct chips, but win bonuses if correct
- **Persistent**: Chips accumulate across rounds, game ends after 7 rounds

---

## Key Technologies & Design Rationale

### Next.js 15.5.4

**Why**: Full-stack framework with API routes, SSR capabilities, and built-in routing. Perfect for combining React frontend with Socket.IO server in one codebase.

**Usage**:
- `pages/api/socketio.js`: Custom API route for Socket.IO server initialization
- `pages/room/[id].js`: Dynamic routing for game rooms
- `pages/_app.js`: Global layout and socket singleton initialization

### Socket.IO 4.8.1

**Why**: Real-time bidirectional communication essential for multiplayer game. Handles WebSocket connections, fallback to polling, reconnection logic, and room-based messaging.

**Patterns Used**:
- **Room-based messaging**: `socket.join(roomId)`, `io.to(roomId).emit()` ensures all players in a room receive updates
- **Singleton socket manager**: `socketManager.js` ensures single socket instance per client, prevents duplicate connections
- **Event-driven architecture**: All game actions flow through Socket.IO events, server as single source of truth

**Design Decision**: Server-side state with Socket.IO broadcasts is simpler than syncing client state. No need for Redux/Zustand when server broadcasts authoritative state updates.

### In-Memory State Storage

**Why**: `gameState.js` stores all rooms in a JavaScript object (`const rooms = {}`). This is simple, fast, and sufficient for single-instance deployments.

**Trade-offs**:
- ✅ **Pros**: Fast reads/writes, easy state inspection, quick resets
- ❌ **Cons**: Lost on server restart, doesn't scale horizontally (needs sticky sessions or Redis for multi-instance)

**Future consideration**: For production with multiple instances, migrate to Redis or database with pub/sub for state synchronization.

### Session Storage

**Why**: Client-side persistence using `sessionStorage` to survive page refreshes and navigation.

**Usage**:
- Stores `clientId` (player/host ID), `isHost`, `nickname`, `color`
- Enables reconnection: On page load, client checks sessionStorage and rejoins room with existing identity
- Host mode: Stores `hostName`, `hostColor` for host-as-player mode

**Design Decision**: Session storage (not localStorage) ensures data clears when browser closes, preventing stale player IDs across sessions.

### QR Code Generation

**Why**: `qrcode` library generates QR codes for easy mobile join via lobby URL. Essential for quick multiplayer setup without typing room codes.

### Tailwind CSS 4

**Why**: Utility-first CSS framework for rapid UI development. All styling done via className strings, no separate CSS files needed.

### Host Modes: GM vs Player

**Design**: Host can choose two modes:
- **GM Mode**: Host controls game, doesn't play (default)
- **Player Mode**: Host participates as regular player with name/color

**Implementation**: `hostMode` stored in room state, affects UI visibility (GM sees controls, player sees normal player interface) and player list inclusion.

### Force Next Phase Logic

**Special handling in `setPhase` handler**:
- `question → wager`: Must call `revealAnswersAndPrepareWagers()` first (can't just change phase)
- `wager → payout`: Must call `revealCorrectAnswerAndPayout()` first

**Why**: Phase transitions require data preparation (answer tiles, payout calculations). Simple phase change would leave clients in broken state.

---

## Future Maintenance Notes

### Edge Cases & Gotchas

1. **Socket Connection Timing**: 
   - Clients must wait for socket connection before emitting events
   - `socketManager.js` handles async initialization with polling fallback
   - Always check `socket.connected` before emitting

2. **Duplicate Join Prevention**:
   - `hasJoinedRoomRef` flag prevents multiple `joinRoom` emissions
   - Server checks `socket.rooms` to detect duplicate joins
   - Important for page refreshes and navigation

3. **Host Player Mode Edge Cases**:
   - Host must be added to `players[]` when `hostMode === "player"`, but not when `hostMode === "gm"`
   - Logic in `joinRoom` handler checks if host player already in list before adding
   - Session storage must track `hostName` and `hostColor` separately from regular player data

4. **Zero-Chip Player Detection**:
   - Must snapshot `chipsAtWagerStart` at exact moment wager phase begins
   - Distinguishes between "had 0 before wager" vs "bet all chips and now at 0"
   - Only true zero-chip players can use zero-chip betting mechanic

5. **Auto-advance Race Conditions**:
   - Multiple auto-advance triggers (all answers, all confirmed, all ready) must be idempotent
   - Server checks state before triggering to prevent duplicate phase changes
   - Clients should handle duplicate events gracefully

6. **State Synchronization**:
   - Always broadcast full room state after mutations
   - New players receive full state on join to catch up
   - Session storage helps with reconnection, but server state is authoritative

### Areas for Improvement

1. **State Persistence**: 
   - Current: In-memory only, lost on restart
   - Future: Redis or database for state persistence and multi-instance support

2. **Error Handling**:
   - More comprehensive error messages to clients
   - Retry logic for failed socket operations
   - Graceful degradation if socket disconnects mid-game

3. **Testing**:
   - No automated tests currently
   - Consider adding unit tests for `gameState.js` functions
   - Integration tests for Socket.IO event flows

4. **Performance**:
   - Room cleanup: Currently rooms persist until manually deleted
   - Consider auto-cleanup for inactive rooms after X minutes
   - Monitor memory usage with many concurrent rooms

5. **Host Controls**:
   - "Force Next Phase" bypasses normal game flow
   - Could add validation to prevent invalid phase transitions
   - Consider phase transition history/logging for debugging

6. **Answer Tile Multiplier Algorithm**:
   - Current algorithm works but could be more configurable
   - Consider making multiplier calculation configurable per room
   - Document multiplier distribution more clearly in UI

### Code Organization Notes

- **`gameState.js`**: Pure functions, no side effects except console.log. Easy to test and reason about.
- **`socketio.js`**: All Socket.IO event handlers. Centralized location for all real-time logic.
- **Components**: Most components are presentational, game logic lives in `gameState.js`.
- **Session Storage Keys**: Follow pattern `room_${roomId}_${key}` for scoping to specific rooms.

### Debugging Tips

1. **Check Server Logs**: Extensive `console.log` statements in `gameState.js` and `socketio.js` show state transitions
2. **Browser Console**: Client-side logs show socket events and state updates
3. **Room State Inspection**: `rooms[roomId]` can be inspected in server console for live debugging
4. **Socket.IO Inspector**: Use browser DevTools Network tab to see Socket.IO events
5. **Session Storage**: Check `sessionStorage` in browser DevTools to verify client data persistence

---

## Quick Reference

### Game Phases
- `lobby`: Waiting for players, host can start game
- `question`: Players submit numerical answers
- `wager`: Players bet chips on answer tiles
- `payout`: Results displayed, chips updated
- `finished`: Game complete after 7 rounds

### Key Constants
- `STARTING_CHIPS = 500`: Initial chips per player
- `totalRounds = 7`: Number of questions per game

### Important Files
- `src/lib/gameState.js`: Game logic and state management
- `src/pages/api/socketio.js`: Socket.IO event handlers
- `src/lib/socketManager.js`: Client-side socket singleton
- `src/pages/room/[id].js`: Main game room component
- `src/pages/room/[id]/lobby.js`: Lobby/waiting room

### Socket Events Summary
**Client → Server**: `createRoom`, `joinRoom`, `leaveRoom`, `deleteRoom`, `startGame`, `nextRound`, `setPhase`, `submitAnswer`, `placeBet`, `removeBet`, `confirmWagers`, `readyForNextRound`, `revealAnswer`, `updateCategories`

**Server → Client**: `roomCreated`, `roomUpdate`, `playersUpdate`, `chipsUpdate`, `answersUpdate`, `gameStarted`, `answersRevealed`, `betsUpdate`, `wagersConfirmed`, `payoutResult`, `nextRound`, `phaseChanged`, `categoriesUpdate`, `readyForNextRoundUpdate`, `roomDeleted`, `error`

---

*Last Updated: Based on codebase analysis. This documentation reflects the current implementation and should be updated as the codebase evolves.*


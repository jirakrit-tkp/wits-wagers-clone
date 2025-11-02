# Wits & Wagers Clone - เอกสารสำหรับนักพัฒนา

## Overview

นี่คือเกม trivia แบบ multiplayer แบบ real-time ที่สร้างด้วย Next.js และ Socket.IO ผู้เล่นส่งคำตอบที่เป็นตัวเลขสำหรับคำถาม trivia แล้ววางเดิมพันด้วย chips ว่าใครจะเดาคำตอบได้ใกล้ที่สุดโดยไม่เกินคำตอบที่ถูกต้อง เกมดำเนินใน phases: lobby → question → wager → payout ซ้ำหลายรอบ

### Architecture

ระบบใช้สถาปัตยกรรม **client-server** พร้อมการ synchronize แบบ real-time:

- **Client Side (Next.js React)**: จัดการ UI, การโต้ตอบของผู้ใช้, และแสดง game state
- **Server Side (Next.js API + Socket.IO)**: จัดการ game state ใน memory, ประมวลผล game logic, และ broadcast การอัปเดต
- **State Management**: Server-side authoritative state เก็บใน `gameState.js` (in-memory `rooms` object)
- **Real-time Communication**: Socket.IO bidirectional events สำหรับการกระทำทั้งหมดในเกม

**Key Design Decision**: Game state อยู่ฝั่ง server-side ทั้งหมดใน memory ทำให้ระบบเรียบง่ายสำหรับ single-instance deployments, ทำให้ reset state ได้รวดเร็ว, และรับประกันว่า clients ทั้งหมด synchronize ผ่าน Socket.IO broadcasts

---

## System Flow

### 1. Room Creation & Lobby Phase

```
User เปิดหน้า index.js
  ↓
สร้าง/เข้าร่วม room → Redirect ไป /room/[id]/lobby
  ↓
Socket เชื่อมต่อ → emit("createRoom") / emit("joinRoom")
  ↓
Server สร้าง/เพิ่ม player → Broadcasts roomUpdate, playersUpdate, chipsUpdate
  ↓
Host กด "Start Game" → emit("startGame")
  ↓
Server: startGame() → ตั้ง phase="question", เลือกคำถาม, เริ่มต้น chips
  ↓
Broadcasts: gameStarted → Clients ทั้งหมดนำทางไปหน้าเกม
```

### 2. Question Phase

```
Client รับ gameStarted → ตั้ง phase="question"
  ↓
ผู้เล่นใส่ตัวเลขเดา → emit("submitAnswer")
  ↓
Server: submitAnswer() → เก็บคำตอบใน room.answers[]
  ↓
เมื่อผู้เล่นทุกคนตอบแล้ว → Auto-triggers revealAnswersAndPrepareWagers()
  ↓
สร้าง answer tiles พร้อม multipliers → Snapshot chipsAtWagerStart
  ↓
Broadcasts: answersRevealed → Phase เปลี่ยนเป็น "wager"
```

### 3. Wager Phase

```
Client รับ answersRevealed → แสดง answer tiles
  ↓
ผู้เล่นวางเดิมพันบน tiles → emit("placeBet") / emit("removeBet")
  ↓
Server: placeBet() → หัก chips ทันที, เก็บ bet ใน room.bets[]
  ↓
Broadcasts: betsUpdate (รวม chips ที่อัปเดตแล้ว)
  ↓
ผู้เล่นยืนยัน wagers → emit("confirmWagers")
  ↓
Server: confirmWager() → เพิ่มเข้า room.confirmedWagers[]
  ↓
เมื่อทุกคนยืนยันแล้ว → Auto-triggers revealCorrectAnswerAndPayout()
  ↓
คำนวณ winning tile, payouts → อัปเดต chips
  ↓
Broadcasts: payoutResult → Phase เปลี่ยนเป็น "payout"
```

### 4. Payout Phase

```
Client รับ payoutResult → แสดงผลลัพธ์, chips ที่อัปเดต
  ↓
ผู้เล่นตรวจสอบเงินรางวัล → กด "Next Question"
  ↓
emit("readyForNextRound") → Server ติดตามใน room.readyForNextRound[]
  ↓
เมื่อทุกคนพร้อม → Auto-triggers nextRound()
  ↓
เลือกคำถามใหม่, reset state → กลับไป Question Phase
  ↓
ทำซ้ำ 7 รอบ → Phase สุดท้าย="finished"
```

### 5. Host Controls Flow

Host มี controls พิเศษ (`HostControls.js`):

- **Force Next Phase**: `emit("setPhase")` → Server จัดการ phase transitions ด้วย logic พิเศษ:
  - `question → wager`: เรียก `revealAnswersAndPrepareWagers()` ก่อน
  - `wager → payout`: เรียก `revealCorrectAnswerAndPayout()` ก่อน
  - Transitions อื่น: เรียก `setPhase()` ธรรมดา
- **Next Round**: เรียก `emit("nextRound")` โดยตรง → ไปคำถามถัดไป
- **Delete Room**: `emit("deleteRoom")` → Broadcasts `roomDeleted`, ทำความสะอาด state

---

## Socket & Real-time Logic

### Client → Server Events

#### Room Management
- **`createRoom`**: `{ roomId, hostId, hostMode }`
  - สร้าง room ใน `gameState`, join socket เข้า room
  - Emits: `roomCreated`, `roomUpdate`

- **`joinRoom`**: `{ roomId, player?, isHost, hostId?, hostMode?, hostName?, hostColor? }`
  - เพิ่ม player เข้า room, เริ่มต้น chips (500), join socket
  - การจัดการพิเศษ: ถ้า host อยู่ในโหมด "player", เพิ่ม host เข้า `players[]`
  - Emits: `playersUpdate`, `chipsUpdate`, `roomUpdate`, `answersUpdate`, `categoriesUpdate`

- **`leaveRoom`**: `{ roomId, playerId }`
  - ลบ player ออกจาก room, ทำความสะอาด chips/scores
  - Emits: `playersUpdate`, `roomUpdate`, `chipsUpdate`

- **`deleteRoom`**: `{ roomId, hostId }` (host เท่านั้น)
  - ตรวจสอบ host, ลบ room จาก memory
  - Emits: `roomDeleted` (ทำให้ clients redirect)

#### Game Flow
- **`startGame`**: `{ roomId, categories }`
  - เรียก `startGame()`, เลือกคำถาม, เริ่มต้น chips
  - Emits: `gameStarted`, `roomUpdate`, `playersUpdate`, `answersUpdate`, `chipsUpdate`

- **`nextRound`**: `{ roomId }` (host เท่านั้น)
  - เรียก `nextRound()`, เลือกคำถามใหม่, reset answers/bets
  - Emits: `nextRound`, `roomUpdate`, `playersUpdate`, `answersUpdate`, `chipsUpdate`

- **`setPhase`**: `{ roomId, phase }` (host เท่านั้น)
  - บังคับเปลี่ยน phase ด้วย transition logic พิเศษ
  - Emits: `phaseChanged` หรือ `answersRevealed` / `payoutResult` (ขึ้นอยู่กับ transition)

#### Answer Submission
- **`submitAnswer`**: `{ roomId, playerId, guess }`
  - เก็บ/อัปเดตคำตอบใน `room.answers[]`
  - Emits: `answersUpdate`
  - **Auto-trigger**: เมื่อ `answers.length === players.length`, เรียก `revealAnswersAndPrepareWagers()`

#### Wagering
- **`placeBet`**: `{ roomId, playerId, tileIndex, amount }`
  - ตรวจสอบ chips, หักทันที, เก็บ bet
  - พิเศษ: Zero-chip players สามารถวาง `amount=0` bets (ทำเครื่องหมาย `isZeroChipBet`)
  - Emits: `betsUpdate` (รวม chips ที่อัปเดต)

- **`removeBet`**: `{ roomId, playerId, tileIndex }`
  - ลบ bet, คืน chips (เว้นแต่ zero-chip bet)
  - Emits: `betsUpdate`

- **`confirmWagers`**: `{ roomId, playerId }`
  - เพิ่มเข้า `confirmedWagers[]`, ตรวจสอบว่า zero-chip players ได้วางเดิมพัน
  - Emits: `wagersConfirmed`
  - **Auto-trigger**: เมื่อทุกคนยืนยันแล้ว, เรียก `revealCorrectAnswerAndPayout()`

#### Payout Phase
- **`readyForNextRound`**: `{ roomId, playerId }`
  - ติดตาม players ที่พร้อมใน `readyForNextRound[]`
  - Emits: `readyForNextRoundUpdate`
  - **Auto-trigger**: เมื่อทุกคนพร้อม, เรียก `nextRound()`

- **`revealAnswer`**: `{ roomId }` (host เท่านั้น, manual trigger)
  - ทางเลือกแทน auto-trigger, คำนวณ payouts ด้วยมือ
  - Emits: `payoutResult`, `roomUpdate`, `chipsUpdate`

#### Configuration
- **`updateCategories`**: `{ roomId, categories }` (host เท่านั้น)
  - อัปเดต `room.selectedCategories`
  - Emits: `categoriesUpdate`

### Server → Client Events

- **`roomCreated`**: `{ roomId }` - Room เริ่มต้นแล้ว
- **`roomUpdate`**: Full room object - State sync หลังจากมีการเปลี่ยนแปลงใดๆ
- **`playersUpdate`**: Array ของ players - การเปลี่ยนแปลงรายชื่อผู้เล่น
- **`chipsUpdate`**: `{ playerId: chips }` - การเปลี่ยนแปลงจำนวน chips
- **`answersUpdate`**: Array ของ `{ playerId, guess }` - การส่งคำตอบ
- **`gameStarted`**: `{ phase, question, round, chips }` - เกมเริ่ม
- **`answersRevealed`**: `{ phase, answerTiles, zeroChipPlayers }` - Transition ไป wager phase
- **`betsUpdate`**: `{ bets, chips }` - การวาง/ลบเดิมพัน
- **`wagersConfirmed`**: `{ confirmedCount, totalPlayers, confirmedWagers }` - สถานะการยืนยัน
- **`payoutResult`**: `{ correctAnswer, winningTileIndex, winningTile, payouts, chips, answerTiles }` - ผลลัพธ์รอบ
- **`nextRound`**: `{ phase, question, round, chips }` - รอบใหม่เริ่ม
- **`phaseChanged`**: `{ phase }` - การเปลี่ยน phase ด้วยมือ
- **`categoriesUpdate`**: `{ categories }` - การเลือกหมวดหมู่เปลี่ยน
- **`readyForNextRoundUpdate`**: `{ readyCount, totalPlayers, readyPlayers }` - สถานะความพร้อม
- **`roomDeleted`**: `{ roomId }` - การทำความสะอาด room
- **`error`**: `{ message }` - การแจ้งเตือน error

### Synchronization Patterns

1. **State Sync on Join**: เมื่อ player join, server broadcast room state เต็ม (`roomUpdate`, `playersUpdate`, `chipsUpdate`, ฯลฯ) เพื่อให้ client ใหม่ synchronize

2. **Optimistic Updates**: Client อัปเดต local state ทันที (เช่น หัก chips เมื่อวางเดิมพัน), แต่ server เป็น authoritative. Server broadcast state ที่ถูกต้องหลังจากประมวลผล

3. **Auto-advance Triggers**: กลไก auto-advance หลายตัว:
   - คำตอบทั้งหมดถูกส่ง → Auto-reveal ไป wager phase
   - Wagers ทั้งหมดถูกยืนยัน → Auto-calculate payouts
   - Players ทั้งหมดพร้อม → Auto-advance ไปรอบถัดไป

4. **Broadcast Strategy**: การกระทำของ server ส่วนใหญ่ broadcast ไปทั้ง room (`io.to(roomId).emit()`), รับประกันว่า clients ทั้งหมด synchronize

---

## Game Logic / State Management

### Room State Structure

แต่ละ room (`rooms[roomId]`) ประกอบด้วย:

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

สร้าง betting tiles จากคำตอบของผู้เล่นพร้อม multipliers:

1. จัดกลุ่มคำตอบตามค่าที่ไม่ซ้ำ (เช่น ผู้เล่นหลายคนเดา "50")
2. เรียงคำตอบที่ไม่ซ้ำจากน้อยไปมาก
3. มอบหมาย multipliers ตามตำแหน่ง:
   - จำนวน tiles เป็นคี่: ตำแหน่งกลางได้ x2, tiles ด้านนอกได้ multipliers สูงกว่า (x3, x4, ...)
   - จำนวนเป็นคู่: tiles กลางสองตัวได้ x3, อื่นๆ scale ออกไปด้านนอก
4. เพิ่ม "Smaller than smallest" tile ด้านหน้า พร้อม multiplier สูงสุด + 1
5. ส่งคืน tiles array ที่เก็บใน `room.answerTiles`

**Why this design**: สร้าง betting tiers ที่การเดาที่สุดโต่ง (แต่ยังถูกต้อง) มี potential payouts สูงกว่า, ส่งเสริมให้ผู้เล่นเสี่ยงมากขึ้น

#### `revealAnswersAndPrepareWagers(roomId)`

ฟังก์ชัน transition สำคัญจาก question → wager phase:

1. เรียก `createAnswerTiles()` เพื่อสร้างตัวเลือกการเดิมพัน
2. **Snapshots `chipsAtWagerStart`** - สำคัญสำหรับการตรวจจับ zero-chip players
3. ระบุ zero-chip players (ผู้ที่มี 0 chips เมื่อเริ่ม wager phase)
4. Reset `bets[]` และ `confirmedWagers[]`
5. ตั้ง `phase = "wager"`

**Why snapshot**: แยกความแตกต่างระหว่างผู้เล่นที่มี 0 chips ก่อน wagering กับผู้ที่เดิมพัน chips ทั้งหมดและเหลือ 0. เฉพาะกลุ่มแรกเท่านั้นที่ใช้กลไก zero-chip betting

#### `placeBet(roomId, playerId, tileIndex, amount)`

วางเดิมพันพร้อมการตรวจสอบ chips:

1. ตรวจสอบว่าผู้เล่นมี chips เพียงพอ (หรือเป็น zero-chip player)
2. **หัก chips ทันที** เมื่อวางเดิมพัน (ไม่ใช่ตอนยืนยัน)
3. เก็บ bet พร้อม flag `isZeroChipBet` ถ้าต้องการ
4. ส่งคืน success/failure

**Why immediate deduction**: ป้องกันไม่ให้ผู้เล่นวางเดิมพันหลายครั้งด้วย chips เดียวกัน, รับประกันว่า chips ถูก lock ตลอด wager phase

#### `confirmWager(roomId, playerId)`

ตรวจสอบและยืนยัน wagers ของผู้เล่น:

1. ตรวจสอบว่ายืนยันแล้วหรือยัง (idempotent)
2. **Zero-chip validation**: Zero-chip players ต้องวางเดิมพันอย่างน้อย 1 ครั้ง (ตรวจสอบผ่าน `chipsAtWagerStart`)
3. เพิ่มเข้า `confirmedWagers[]`
4. ตรวจสอบว่าทุกคนยืนยันแล้ว → trigger auto-advance

**Why zero-chip validation**: รับประกันว่า zero-chip players เข้าร่วม (พวกเขาต้องเดาถูกจึงจะได้ bonus)

#### `revealCorrectAnswerAndPayout(roomId, correctAnswer)`

คำนวณ winning tile และแจกจ่าย payouts:

1. หา winning tile: การเดาสูงสุดที่ไม่เกิน `correctAnswer`
   - วนผ่าน answer tiles ที่เรียงแล้ว (index 1+)
   - ถ้าการเดาทั้งหมดสูงเกินไป, "Smaller" tile (index 0) ชนะ
2. คำนวณ payouts สำหรับ bets บน winning tile:
   - `winnings = bet.amount * tile.multiplier`
   - เพิ่ม winnings เข้า player chips
3. **Zero-chip bonus logic**:
   - ถ้า players ทั้งหมดมี 0 chips: Fixed bonus 250 chips สำหรับการเดาที่ถูกต้อง
   - ถ้า players บางคนมี 0 chips: 25% ของ max winnings เป็น bonus
   - ใช้ได้เฉพาะเมื่อ zero-chip bet อยู่บน winning tile
4. ตั้ง `phase = "payout"`
5. ส่งคืน payout results พร้อม chips ที่อัปเดต

**Why zero-chip bonus**: ป้องกันไม่ให้ผู้เล่นที่ถูก淘汰ติดอยู่, ส่งเสริมการมีส่วนร่วมแม้เมื่อไม่มี chips

#### `nextRound(roomId)`

ไปรอบถัดไป:

1. เพิ่ม `currentRound`
2. ตรวจสอบว่า `currentRound > totalRounds` → ตั้ง `phase = "finished"`
3. เลือกคำถามใหม่จาก `selectedCategories`
4. Reset: `answers[]`, `answerTiles[]`, `bets[]`, `confirmedWagers[]`, `readyForNextRound[]`
5. เก็บ chips ไว้ (สะสมตลอดหลายรอบ)

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

- **Initial**: ผู้เล่นทุกคนเริ่มด้วย 500 chips (`STARTING_CHIPS`)
- **Betting**: Chips ถูกหักทันทีเมื่อ `placeBet()`, คืนถ้า bet ถูกลบ
- **Winnings**: เพิ่มเข้า chips เมื่อคำนวณ payout (bet amount × multiplier)
- **Zero-chip mechanic**: Bets พิเศษไม่หัก chips, แต่ได้ bonus ถ้าถูกต้อง
- **Persistent**: Chips สะสมตลอดหลายรอบ, เกมจบหลังจาก 7 รอบ

---

## Key Technologies & Design Rationale

### Next.js 15.5.4

**Why**: Full-stack framework ที่มี API routes, SSR capabilities, และ built-in routing. เหมาะสำหรับรวม React frontend กับ Socket.IO server ใน codebase เดียว

**Usage**:
- `pages/api/socketio.js`: Custom API route สำหรับ Socket.IO server initialization
- `pages/room/[id].js`: Dynamic routing สำหรับ game rooms
- `pages/_app.js`: Global layout และ socket singleton initialization

### Socket.IO 4.8.1

**Why**: Real-time bidirectional communication ที่จำเป็นสำหรับเกม multiplayer. จัดการ WebSocket connections, fallback ไป polling, reconnection logic, และ room-based messaging

**Patterns Used**:
- **Room-based messaging**: `socket.join(roomId)`, `io.to(roomId).emit()` รับประกันว่า players ทั้งหมดใน room ได้รับ updates
- **Singleton socket manager**: `socketManager.js` รับประกัน socket instance เดียวต่อ client, ป้องกัน duplicate connections
- **Event-driven architecture**: การกระทำทั้งหมดในเกมไหลผ่าน Socket.IO events, server เป็น single source of truth

**Design Decision**: Server-side state พร้อม Socket.IO broadcasts เรียบง่ายกว่าการ sync client state. ไม่ต้องใช้ Redux/Zustand เมื่อ server broadcast authoritative state updates

### In-Memory State Storage

**Why**: `gameState.js` เก็บ rooms ทั้งหมดใน JavaScript object (`const rooms = {}`). เรียบง่าย, เร็ว, และเพียงพอสำหรับ single-instance deployments

**Trade-offs**:
- ✅ **Pros**: อ่าน/เขียนเร็ว, ตรวจสอบ state ง่าย, reset เร็ว
- ❌ **Cons**: สูญหายเมื่อ server restart, ไม่ scale แบบ horizontal (ต้อง sticky sessions หรือ Redis สำหรับ multi-instance)

**Future consideration**: สำหรับ production ที่มีหลาย instances, migrate ไป Redis หรือ database พร้อม pub/sub สำหรับ state synchronization

### Session Storage

**Why**: Client-side persistence โดยใช้ `sessionStorage` เพื่ออยู่รอดจากการ refresh หน้าและ navigation

**Usage**:
- เก็บ `clientId` (player/host ID), `isHost`, `nickname`, `color`
- เปิดใช้งาน reconnection: เมื่อโหลดหน้า, client ตรวจสอบ sessionStorage และ rejoin room ด้วย identity เดิม
- Host mode: เก็บ `hostName`, `hostColor` สำหรับ host-as-player mode

**Design Decision**: Session storage (ไม่ใช่ localStorage) รับประกันว่าข้อมูลถูกลบเมื่อ browser ปิด, ป้องกัน stale player IDs ข้าม sessions

### QR Code Generation

**Why**: Library `qrcode` สร้าง QR codes เพื่อ join ผ่าน mobile ด้วย lobby URL. จำเป็นสำหรับการตั้งค่า multiplayer อย่างรวดเร็วโดยไม่ต้องพิมพ์ room codes

### Tailwind CSS 4

**Why**: Utility-first CSS framework สำหรับพัฒนา UI อย่างรวดเร็ว. styling ทั้งหมดทำผ่าน className strings, ไม่ต้องใช้ไฟล์ CSS แยก

### Host Modes: GM vs Player

**Design**: Host สามารถเลือกได้สองโหมด:
- **GM Mode**: Host ควบคุมเกม, ไม่เล่น (default)
- **Player Mode**: Host มีส่วนร่วมเป็น player ธรรมดาพร้อม name/color

**Implementation**: `hostMode` เก็บใน room state, ส่งผลต่อ UI visibility (GM เห็น controls, player เห็น player interface ธรรมดา) และการรวมใน player list

### Force Next Phase Logic

**Special handling ใน `setPhase` handler**:
- `question → wager`: ต้องเรียก `revealAnswersAndPrepareWagers()` ก่อน (ไม่ใช่แค่เปลี่ยน phase)
- `wager → payout`: ต้องเรียก `revealCorrectAnswerAndPayout()` ก่อน

**Why**: Phase transitions ต้องการการเตรียมข้อมูล (answer tiles, payout calculations). การเปลี่ยน phase ธรรมดาจะทำให้ clients อยู่ในสถานะที่เสียหาย

---

## Future Maintenance Notes

### Edge Cases & Gotchas

1. **Socket Connection Timing**: 
   - Clients ต้องรอ socket connection ก่อน emit events
   - `socketManager.js` จัดการ async initialization พร้อม polling fallback
   - ตรวจสอบ `socket.connected` เสมอก่อน emit

2. **Duplicate Join Prevention**:
   - Flag `hasJoinedRoomRef` ป้องกันการ emit `joinRoom` หลายครั้ง
   - Server ตรวจสอบ `socket.rooms` เพื่อตรวจจับ duplicate joins
   - สำคัญสำหรับ page refreshes และ navigation

3. **Host Player Mode Edge Cases**:
   - Host ต้องถูกเพิ่มเข้า `players[]` เมื่อ `hostMode === "player"`, แต่ไม่ใช่เมื่อ `hostMode === "gm"`
   - Logic ใน `joinRoom` handler ตรวจสอบว่า host player อยู่ใน list แล้วหรือยังก่อนเพิ่ม
   - Session storage ต้องติดตาม `hostName` และ `hostColor` แยกจากข้อมูล player ธรรมดา

4. **Zero-Chip Player Detection**:
   - ต้อง snapshot `chipsAtWagerStart` ในช่วงเวลาที่เริ่ม wager phase อย่างแน่นอน
   - แยกความแตกต่างระหว่าง "มี 0 ก่อน wager" กับ "เดิมพัน chips ทั้งหมดและตอนนี้เหลือ 0"
   - เฉพาะ zero-chip players จริงเท่านั้นที่ใช้กลไก zero-chip betting

5. **Auto-advance Race Conditions**:
   - Auto-advance triggers หลายตัว (คำตอบทั้งหมด, ยืนยันทั้งหมด, พร้อมทั้งหมด) ต้องเป็น idempotent
   - Server ตรวจสอบ state ก่อน trigger เพื่อป้องกันการเปลี่ยน phase ซ้ำ
   - Clients ควรจัดการ duplicate events อย่างสวยงาม

6. **State Synchronization**:
   - Broadcast room state เต็มเสมอหลัง mutations
   - Players ใหม่ได้รับ state เต็มเมื่อ join เพื่อ catch up
   - Session storage ช่วยในการ reconnection, แต่ server state เป็น authoritative

### Areas for Improvement

1. **State Persistence**: 
   - ปัจจุบัน: In-memory เท่านั้น, สูญหายเมื่อ restart
   - อนาคต: Redis หรือ database สำหรับ state persistence และ multi-instance support

2. **Error Handling**:
   - ข้อความ error ที่ครอบคลุมมากขึ้นไปยัง clients
   - Retry logic สำหรับ socket operations ที่ล้มเหลว
   - Graceful degradation ถ้า socket disconnect ระหว่างเกม

3. **Testing**:
   - ไม่มี automated tests ในปัจจุบัน
   - พิจารณาเพิ่ม unit tests สำหรับ functions ใน `gameState.js`
   - Integration tests สำหรับ Socket.IO event flows

4. **Performance**:
   - Room cleanup: ปัจจุบัน rooms อยู่จนกว่าจะถูกลบด้วยมือ
   - พิจารณา auto-cleanup สำหรับ rooms ที่ไม่ใช้งานหลังจาก X นาที
   - ตรวจสอบ memory usage เมื่อมี rooms พร้อมกันหลายตัว

5. **Host Controls**:
   - "Force Next Phase" ข้าม game flow ธรรมดา
   - อาจเพิ่ม validation เพื่อป้องกัน phase transitions ที่ไม่ถูกต้อง
   - พิจารณา phase transition history/logging สำหรับ debugging

6. **Answer Tile Multiplier Algorithm**:
   - Algorithm ปัจจุบันทำงานได้แต่สามารถ configurable มากขึ้น
   - พิจารณาทำ multiplier calculation ให้ configurable ต่อ room
   - Document multiplier distribution ชัดเจนขึ้นใน UI

### Code Organization Notes

- **`gameState.js`**: Pure functions, ไม่มี side effects นอกเหนือจาก console.log. ทดสอบและเข้าใจง่าย
- **`socketio.js`**: Socket.IO event handlers ทั้งหมด. สถานที่รวมสำหรับ real-time logic ทั้งหมด
- **Components**: Components ส่วนใหญ่เป็น presentational, game logic อยู่ใน `gameState.js`
- **Session Storage Keys**: ตามรูปแบบ `room_${roomId}_${key}` เพื่อ scope ไปยัง rooms เฉพาะ

### Debugging Tips

1. **Check Server Logs**: `console.log` statements มากมายใน `gameState.js` และ `socketio.js` แสดง state transitions
2. **Browser Console**: Client-side logs แสดง socket events และ state updates
3. **Room State Inspection**: `rooms[roomId]` สามารถตรวจสอบใน server console สำหรับ live debugging
4. **Socket.IO Inspector**: ใช้ browser DevTools Network tab เพื่อดู Socket.IO events
5. **Session Storage**: ตรวจสอบ `sessionStorage` ใน browser DevTools เพื่อยืนยัน client data persistence

---

## Quick Reference

### Game Phases
- `lobby`: รอ players, host สามารถเริ่มเกม
- `question`: Players ส่งคำตอบเป็นตัวเลข
- `wager`: Players วางเดิมพัน chips บน answer tiles
- `payout`: แสดงผลลัพธ์, อัปเดต chips
- `finished`: เกมเสร็จหลังจาก 7 รอบ

### Key Constants
- `STARTING_CHIPS = 500`: Chips เริ่มต้นต่อ player
- `totalRounds = 7`: จำนวนคำถามต่อเกม

### Important Files
- `src/lib/gameState.js`: Game logic และ state management
- `src/pages/api/socketio.js`: Socket.IO event handlers
- `src/lib/socketManager.js`: Client-side socket singleton
- `src/pages/room/[id].js`: Main game room component
- `src/pages/room/[id]/lobby.js`: Lobby/waiting room

### Socket Events Summary
**Client → Server**: `createRoom`, `joinRoom`, `leaveRoom`, `deleteRoom`, `startGame`, `nextRound`, `setPhase`, `submitAnswer`, `placeBet`, `removeBet`, `confirmWagers`, `readyForNextRound`, `revealAnswer`, `updateCategories`

**Server → Client**: `roomCreated`, `roomUpdate`, `playersUpdate`, `chipsUpdate`, `answersUpdate`, `gameStarted`, `answersRevealed`, `betsUpdate`, `wagersConfirmed`, `payoutResult`, `nextRound`, `phaseChanged`, `categoriesUpdate`, `readyForNextRoundUpdate`, `roomDeleted`, `error`

---

*อัปเดตล่าสุด: ตามการวิเคราะห์ codebase. เอกสารนี้สะท้อนการใช้งานปัจจุบันและควรอัปเดตเมื่อ codebase พัฒนา*


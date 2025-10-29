# Wits & Wagers Clone

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js Version](https://img.shields.io/badge/next.js-15.5.4-black)](https://nextjs.org/)
[![Socket.IO](https://img.shields.io/badge/socket.io-4.8.1-blue)](https://socket.io/)

A real-time multiplayer trivia and wagering game where players submit answers, then bet chips on which guess is closest without going over. Built for remote play with friends and family.

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Deployment](#-deployment)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Recent Updates](#-recent-updates)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Credits](#-credits)
- [License](#-license)

## 🎯 Project Description

**Wits & Wagers Clone** is a web-based multiplayer game adaptation of the popular board game. Players don't need to know exact answers—just make smart wagers on the best guesses!

### What makes it stand out?

- **Real-time Synchronization**: Socket.IO ensures instant updates across all players
- **QR Code Joining**: Scan to join games quickly on mobile devices
- **Session Persistence**: Players can refresh without losing progress
- **Smart Reconnection**: Automatic reconnection with state recovery
- **Zero-Chip Players**: Special betting mechanic for players out of chips
- **Responsive Design**: Seamless experience on desktop, tablet, and mobile

### Key Challenges Solved

1. **Socket Connection Timing**: Implemented async socket initialization with fallback mechanisms
2. **Room State Management**: Single-instance deployment prevents state loss across requests
3. **Duplicate Listeners**: Socket singleton pattern prevents memory leaks
4. **Player Validation**: 1-7 player limit with mid-game join prevention
5. **Mobile UX**: Icon animations and responsive layouts for small screens

## ✨ Features

### For Players
- 🎲 Real-time multiplayer for 1-7 players (plus host)
- 📊 Submit numerical guesses to trivia questions
- 💰 Bet chips on answers you think are closest
- 🎯 Zero-chip special betting for comeback opportunities
- 📱 QR code scanning for quick mobile joining
- 🔄 Auto-reconnect on connection loss
- 🏆 Live leaderboard with chip counts

### For Hosts
- 🎮 Create and manage game rooms
- 🏷️ Select question categories (General, Entertainment, Dirty)
- ▶️ Control game flow (start, next round, end game)
- 👥 See player status in real-time
- 🗑️ Delete room and end game anytime
- 📊 View answer distribution during wagering

### System Features
- ⚡ Real-time updates via WebSocket (Socket.IO)
- 🎨 Beautiful UI with Tailwind CSS and custom animations
- 🔒 No authentication required—just share a PIN
- 📱 Fully responsive with mobile-first design
- 🎭 Decorative floating icons with animations
- 🌈 Color-coded players and answer tiles
- ♿ Accessible with semantic HTML

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15.5.4 (with Turbopack)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **QR Code**: qrcode 1.5.4
- **Real-time**: Socket.IO Client 4.8.1

### Backend
- **Runtime**: Node.js
- **Server**: Socket.IO Server 4.8.1
- **State Management**: In-memory (with persistence support)
- **API Routes**: Next.js API routes

### Development Tools
- **Linting**: ESLint 9
- **Build Tool**: Next.js with Turbopack
- **Package Manager**: npm

## 📦 Installation & Setup

### Prerequisites

- Node.js (version 18.0.0 or higher)
- npm (comes with Node.js)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/jirakrit-tkp/wits-wagers-clone.git
cd wits-wagers-clone
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`

### Environment Variables

No environment variables required for local development! Socket.IO runs on the same server as Next.js.

## 🚀 Deployment

### Deploying to Render.com (Recommended)

#### Prerequisites
- A [Render.com](https://render.com) account (free tier available)
- Your GitHub repository connected to Render

#### Step 1: Create Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `wits-wagers-clone` (or your choice)
   - **Environment**: `Node`
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `npm install; npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free` or `Starter` (recommended for no sleep)

#### Step 2: Set Environment Variables

In Render Dashboard → **Environment** tab, add:

```env
WEB_CONCURRENCY=1
PORT=10000
```

**Important**: `WEB_CONCURRENCY=1` ensures single-instance deployment to preserve in-memory room state.

#### Step 3: Deploy

Click **Create Web Service**. Render will:
- Install dependencies
- Build your Next.js app
- Start the server
- Provide a live URL (e.g., `https://your-app.onrender.com`)

#### Free Tier Considerations

⚠️ **Free instances spin down after 15 minutes of inactivity**, causing:
- 30-50 second wake-up time on first request
- All room state lost during sleep

**Recommendation**: Upgrade to **Starter ($7/month)** for:
- No sleep/downtime
- Faster performance
- Always-available rooms

### Alternative: Vercel Deployment

**Note**: Socket.IO requires persistent WebSocket connections. Vercel's serverless functions are not ideal for this use case. Render or similar PaaS platforms are recommended.

If you still want to try Vercel:
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts

**Limitation**: Serverless functions timeout after a period, disconnecting sockets.

## 📖 Usage Guide

### Creating a Game (Host)

1. Navigate to the landing page
2. Click **"Create Room"**
3. A room code will be generated (e.g., `T5MR`)
4. Click **"Enter"** to go to the lobby
5. Share the room code or QR code with players
6. Select question categories (optional)
7. Wait for players to join
8. Click **"Start Game"** when ready (requires 1-7 players)

### Joining a Game (Player)

1. On the landing page, enter the room code in **"Join"**
2. Click **"Join"** button
3. Enter your name and choose a color
4. Click **"Join"** to enter the lobby
5. Wait for the host to start the game

### Gameplay Flow

#### Phase 1: Question (30-60s)
1. Read the trivia question
2. Submit your numerical guess
3. Wait for all players to submit
4. Host can see who's submitted

#### Phase 2: Wager (60-90s)
1. View all guesses as betting tiles (sorted lowest to highest)
2. Place chips on tile(s) you think are closest without going over
3. Adjust bets by clicking tiles multiple times
4. "Smaller than all" tile available if you think all guesses are too high
5. Click **"Confirm Wagers"** when ready
6. **Zero-chip players**: Click any tile for special free bet (25% of max prize or 250 chips)

#### Phase 3: Payout
1. Correct answer is revealed
2. Winning tile highlighted in gold
3. Chip payouts calculated:
   - **6x multiplier**: If you guessed the winning tile
   - **2x multiplier**: If you bet on the winning tile
   - **Special bonus**: Zero-chip winners get 25% of max or 250 chips
4. Updated chip counts shown
5. Host clicks **"Next Round"**

#### End Game
- After 7 rounds, final leaderboard is displayed
- Player with most chips wins!
- Host can start a new game

### Tips for Players

- **Conservative guesses** often win (closer without going over)
- **Bet big** when you're confident
- **Diversify bets** when uncertain
- **Watch for patterns** in other players' guessing styles
- **Zero chips?** You get a free special bet—make it count!

## 📂 Project Structure

```
wits-wagers-clone/
├── public/                      # Static assets
│   ├── favicon.ico
│   └── *.svg                   # Icon assets
│
├── src/
│   ├── components/              # React components
│   │   ├── ConfirmModal.js     # Confirmation dialogs
│   │   ├── HostControls.js     # Host action buttons
│   │   ├── HowToPlayModal.js   # Game instructions
│   │   ├── Modal.js            # Base modal component
│   │   ├── PayoutPhase.js      # Results and payout display
│   │   ├── QuestionCard.js     # Question display
│   │   ├── SiteFooter.js       # Footer with how-to-play
│   │   ├── Snackbar.js         # Toast notifications
│   │   └── WagerPhase.js       # Betting interface
│   │
│   ├── lib/                    # Core logic and utilities
│   │   ├── gameState.js        # Game state management
│   │   ├── questions.json      # Trivia question database
│   │   └── socketManager.js    # Socket.IO singleton
│   │
│   ├── pages/                  # Next.js pages
│   │   ├── api/
│   │   │   └── socketio.js     # Socket.IO server setup
│   │   ├── room/
│   │   │   ├── [id].js         # Game room (main gameplay)
│   │   │   └── [id]/
│   │   │       └── lobby.js    # Pre-game lobby
│   │   ├── _app.js             # App wrapper
│   │   ├── _document.js        # HTML document
│   │   └── index.js            # Landing page
│   │
│   └── styles/
│       └── globals.css         # Global styles and animations
│
├── .gitignore
├── eslint.config.mjs           # ESLint configuration
├── jsconfig.json               # JavaScript config
├── next.config.mjs             # Next.js configuration
├── package.json
├── postcss.config.mjs          # PostCSS config
└── README.md
```

## 🆕 Recent Updates

### v2.0.0 - Socket & UX Improvements (Oct 2025)

#### Fixed
- **Socket Connection Timing**: Added `socketReady` state to prevent race conditions
- **Room Creation**: Implemented connection retry logic with 3s timeout
- **Room Deletion**: Fixed "Room not found" error by ensuring proper socket initialization
- **Single Instance**: Set `WEB_CONCURRENCY=1` for Render deployment

#### Added
- **QR Code**: Automatic QR code generation for easy mobile joining
- **Player Validation**: Enforce 1-7 player limit, prevent mid-game joins
- **Snackbar Notifications**: Replace alerts with elegant toast messages
- **Decorative Icons**: Animated floating icons in placeholder sections
- **Responsive Layouts**: Improved mobile and tablet layouts
- **Category Badge**: Moved to top-left of question cards

#### Improved
- **Host Controls**: Moved to sidebar, vertical layout to prevent overflow
- **Action Buttons**: Better responsive behavior in lobby
- **Zero-Chip UX**: Removed redundant confirmation modal
- **Debug Logging**: Added comprehensive logs for troubleshooting

## 🗺️ Roadmap

### Planned Features

- [ ] **Custom Questions**: Allow hosts to add custom questions
- [ ] **Game Settings**: Configurable round count, starting chips, timer
- [ ] **Sound Effects**: Audio feedback for actions and phase changes
- [ ] **Animations**: Smooth transitions between phases
- [ ] **Chat System**: In-game text chat for players
- [ ] **Game History**: Save and replay past games
- [ ] **Achievements**: Unlock badges for milestones
- [ ] **Leaderboards**: Global or friend leaderboards
- [ ] **Team Mode**: Play as teams instead of individuals
- [ ] **Question Packs**: Themed question categories (Movies, Sports, Science)
- [ ] **Admin Dashboard**: Manage questions, rooms, and users
- [ ] **PWA Support**: Install as mobile app

### Future Enhancements

- Migration to TypeScript for type safety
- Redis/Database for persistent room storage
- User accounts and profiles
- Private/public room options
- Spectator mode
- Multiple languages (i18n)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
   ```bash
   git fork https://github.com/jirakrit-tkp/wits-wagers-clone.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test on both desktop and mobile
   - Ensure no linting errors (`npm run lint`)

4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Include screenshots for UI changes

### Code Style Guidelines

- Use functional components with hooks (no class components)
- Always add `displayName` to components
- Use semantic HTML tags (`<section>`, `<article>`, `<header>`)
- Avoid inline CSS styles (use Tailwind classes)
- Add `alt` text to all images
- Wrap special characters in JSX: `{"It's fine"}`
- Avoid `any` type; use `unknown` or specific types

### Reporting Issues

Found a bug or have a feature request?

1. Check [Issues](https://github.com/jirakrit-tkp/wits-wagers-clone/issues) first
2. Create a new issue with:
   - Clear description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots/logs if applicable
   - Device and browser info

## 🙏 Credits

### Original Game

- **Wits & Wagers** by Dominic Crapuchettes, North Star Games
- [BoardGameGeek Page](https://boardgamegeek.com/boardgame/20100/wits-wagers)

### Technologies & Libraries

- [Next.js](https://nextjs.org/) - React framework
- [React](https://react.dev/) - UI library
- [Socket.IO](https://socket.io/) - Real-time engine
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide React](https://lucide.dev/) - Icon library
- [QRCode](https://github.com/soldair/node-qrcode) - QR code generation

### Acknowledgments

- TechUp program for guidance
- Open-source community for tools and libraries
- Friends and family for playtesting

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Wits & Wagers Clone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with ❤️ for game night enthusiasts**

[Report Bug](https://github.com/jirakrit-tkp/wits-wagers-clone/issues) · [Request Feature](https://github.com/jirakrit-tkp/wits-wagers-clone/issues) · [Play Now](https://wits-wagers-clone.onrender.com)

⭐ Star this repo if you enjoy playing!

</div>

# Wits & Wagers - Real-Time Multiplayer Trivia Game

A real-time multiplayer trivia and wagering game where players submit answers to trivia questions, then bet chips on which answer they think is closest to the correct one without going over.

## 📖 Description

**Wits & Wagers** is a web-based implementation of the popular board game, designed for remote play with friends and family. Players don't need to know the exact answer to win—they just need to make smart wagers on the best guesses!

### What Makes This Project Stand Out:
- **Real-time synchronization** using Socket.IO ensures all players see updates instantly
- **Session persistence** allows players to refresh their browser without losing their game state
- **Responsive design** works seamlessly on desktop and mobile devices
- **Host controls** for managing game flow without requiring all players to be ready
- **Multiple question categories** (General, Entertainment, Dirty) for varied gameplay

### Key Challenges Solved:
- Maintaining player state across page refreshes and reconnections
- Preventing duplicate socket listeners and memory leaks in React
- Synchronizing game phases across multiple clients with minimal latency
- Managing complex betting logic with chip constraints

---

## 📋 Table of Contents

- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/wits-wagers.git
cd wits-wagers
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Development Server
```bash
npm run dev
```

The application will start at `http://localhost:3000`

### Environment Variables
No additional environment variables are required for local development. The Socket.IO server runs on the same port as the Next.js application.

---

## 🎮 Usage Guide

### Creating a Game (Host)

1. Visit the homepage at `http://localhost:3000`
2. Click **"Host Game"**
3. Enter your desired room PIN (e.g., "ABC123")
4. Share the room PIN with your players
5. Wait for players to join in the lobby
6. Select question categories (optional)
7. Click **"Start"** to begin the game

### Joining a Game (Player)

1. Visit the homepage
2. Click **"Join Game"**
3. Enter the room PIN provided by the host
4. Choose your name and color
5. Click **"Join"**
6. Wait in the lobby for the host to start

### Gameplay Flow

**Phase 1: Question**
- All players see a trivia question
- Submit your best guess (closest without going over wins)
- Wait for all players to submit

**Phase 2: Wager**
- View all submitted answers arranged as betting tiles
- Place chips on the answer(s) you think are closest
- Confirm your wagers when ready

**Phase 3: Payout**
- See the correct answer revealed
- Watch chip payouts calculated based on bets
- Winning tile earns multiplier rewards

**Phase 4: Next Round**
- Host clicks "Next Round" to continue
- Game continues for 7 rounds by default
- Final leaderboard shown at the end

### Host Controls

During gameplay, the host has access to:
- **Next Round** (in payout phase) - Advance to the next question
- **New Game** (after game ends) - Start a fresh game
- **Delete Room** (anytime) - End the game and kick all players

---

## ✨ Features

### Core Gameplay
- ✅ Real-time multiplayer for 2-8+ players
- ✅ Trivia questions from multiple categories
- ✅ Chip-based wagering system with multipliers
- ✅ Automatic answer sorting and tile generation
- ✅ Smart payout calculations with bonus for zero-chip players

### Technical Features
- ✅ Session persistence across page refreshes
- ✅ Automatic reconnection handling
- ✅ Host migration support
- ✅ No authentication required - just share a PIN
- ✅ Responsive UI for all screen sizes
- ✅ Real-time player status indicators
- ✅ Performance-optimized with minimal logging

### User Experience
- ✅ Clean, colorful interface inspired by the board game
- ✅ Visual feedback for all actions
- ✅ Progress indicators (rounds, player status)
- ✅ Category tags for questions
- ✅ Correct answer explanations

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15.5.4** - React framework with server-side rendering
- **React 19** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time bidirectional communication

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Socket.IO Server** - WebSocket server for real-time events
- **Node.js** - JavaScript runtime

### Build Tools
- **Turbopack** - Fast bundler (Next.js 15 default)
- **ESLint** - Code linting

---

## 📁 Project Structure

```
wits-wagers/
├── src/
│   ├── components/          # React components
│   │   ├── HostControls.js
│   │   ├── QuestionCard.js
│   │   ├── WagerPhase.js
│   │   ├── PayoutPhase.js
│   │   └── SiteFooter.js
│   ├── lib/                 # Utilities and data
│   │   ├── gameState.js     # Game logic and state management
│   │   ├── questions.json   # Trivia question database
│   │   └── socketManager.js # Socket.IO singleton manager
│   ├── pages/               # Next.js pages
│   │   ├── api/
│   │   │   └── socketio.js  # Socket.IO server endpoint
│   │   ├── room/
│   │   │   ├── [id].js      # Game room page
│   │   │   └── [id]/
│   │   │       └── lobby.js # Pre-game lobby
│   │   ├── _app.js
│   │   ├── _document.js
│   │   └── index.js         # Landing page
│   └── styles/
│       └── globals.css      # Global styles
├── public/                  # Static assets
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs
1. Check if the issue already exists in [Issues](https://github.com/yourusername/wits-wagers/issues)
2. Create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features
1. Open a new issue with the **enhancement** label
2. Describe the feature and its benefits
3. Include mockups or examples if possible

### Submitting Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add comments for complex logic
- Test thoroughly on both desktop and mobile
- Ensure no console errors in production builds

---

## 🙏 Credits

- **Original Game**: [Wits & Wagers](https://boardgamegeek.com/boardgame/20100/wits-wagers) by Dominic Crapuchettes
- **Inspiration**: Board game mechanics adapted for online play
- **Technologies**: Built with Next.js, Socket.IO, and Tailwind CSS

Special thanks to the open-source community for excellent documentation and examples.

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 [Your Name]

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

## 🔮 Roadmap / Future Plans

- [ ] Add more question categories and difficulty levels
- [ ] Implement game replay/history feature
- [ ] Add sound effects and animations
- [ ] Create admin panel for managing questions
- [ ] Support custom question uploads
- [ ] Add timer for question phase
- [ ] Implement achievements/badges system
- [ ] Mobile app version (React Native)
- [ ] Spectator mode for observers
- [ ] Tournament bracket system

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/wits-wagers/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/wits-wagers/discussions)

---

<div align="center">

**Made with ❤️ for game night enthusiasts**

⭐ Star this repo if you enjoy playing!

</div>

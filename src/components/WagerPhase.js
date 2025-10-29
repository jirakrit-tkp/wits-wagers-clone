import { useState, useEffect } from "react";
import ConfirmModal from "./ConfirmModal";

const WagerPhase = ({ 
  answerTiles, 
  players, 
  chips, 
  myPlayerId, 
  onPlaceBet,
  onRemoveBet,
  onConfirmWagers,
  currentBets,
  confirmedWagers,
  zeroChipPlayers,
  isHost 
}) => {
  const [pendingBets, setPendingBets] = useState({}); // { tileIndex: amount } - before confirm
  const [error, setError] = useState("");
  const [showZeroChipConfirm, setShowZeroChipConfirm] = useState(false);
  const [pendingTileSelection, setPendingTileSelection] = useState(null);
  
  const myChips = chips[myPlayerId] || 0;
  const totalPendingBet = Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0);
  const remainingChips = myChips - totalPendingBet;
  
  // Calculate total bet placed already (from server)
  const myPlacedBets = currentBets.filter(b => b.playerId === myPlayerId);
  const totalPlacedBet = myPlacedBets.reduce((sum, b) => sum + b.amount, 0);
  
  // Check if current player has confirmed
  const hasConfirmed = confirmedWagers?.includes(myPlayerId) || false;
  const confirmedCount = confirmedWagers?.length || 0;
  const totalPlayers = players.length;
  
  // Check if current player is zero-chip player
  const isZeroChipPlayer = zeroChipPlayers?.includes(myPlayerId) || false;
  
  // Check if ALL players are zero-chip (to determine bonus amount)
  const allPlayersZeroChip = zeroChipPlayers?.length === players.length && players.length > 0;
  
  // For zero-chip players, check if they've selected a tile
  const myZeroChipBet = isZeroChipPlayer ? currentBets.find(b => b.playerId === myPlayerId && b.isZeroChipBet) : null;
  const hasSelectedTile = !!myZeroChipBet; // Convert to boolean (handles both null and undefined)

  const handleBetChange = (tileIndex, value) => {
    const totalDesired = parseInt(value) || 0;
    
    if (totalDesired < 0) {
      setError("Amount must be positive");
      return;
    }
    
    // Get already placed bet on this tile
    const placedBet = myPlacedBets.find(b => b.tileIndex === tileIndex)?.amount || 0;
    
    // Calculate how much more we need to bet (can be negative if reducing)
    const additionalBet = totalDesired - placedBet;
    
    // Update pending bets
    const newBets = { ...pendingBets, [tileIndex]: totalDesired };
    
    // Calculate total pending (excluding already placed bets)
    const totalPending = Object.entries(newBets).reduce((sum, [idx, amt]) => {
      const alreadyPlaced = myPlacedBets.find(b => b.tileIndex === parseInt(idx))?.amount || 0;
      return sum + Math.max(0, amt - alreadyPlaced);
    }, 0);
    
    if (totalPending > myChips) {
      setError(`Not enough chips! You have ${myChips} chips`);
      return;
    }
    
    setError("");
    setPendingBets(newBets);
  };

  const handlePlaceBets = () => {
    Object.entries(pendingBets).forEach(([tileIndex, totalAmount]) => {
      const tileIdx = parseInt(tileIndex);
      const placedBet = myPlacedBets.find(b => b.tileIndex === tileIdx)?.amount || 0;
      
      if (totalAmount === 0 && placedBet > 0) {
        // User wants to remove the bet
        onRemoveBet(tileIdx);
      } else if (totalAmount !== placedBet) {
        // Need to update bet: remove old and place new
        if (placedBet > 0) {
          onRemoveBet(tileIdx);
        }
        if (totalAmount > 0) {
          onPlaceBet(tileIdx, totalAmount);
        }
      }
    });
    setPendingBets({});
  };

  const handleConfirmWagers = () => {
    // Place any pending bets first
    if (Object.keys(pendingBets).length > 0) {
      handlePlaceBets();
    }
    // Then confirm
    onConfirmWagers();
  };

  const handleZeroChipTileSelect = (tileIndex) => {
    if (!isZeroChipPlayer || hasSelectedTile) return;
    setPendingTileSelection(tileIndex);
    setShowZeroChipConfirm(true);
  };

  const confirmZeroChipSelection = () => {
    if (pendingTileSelection === null) return;
    
    // Place a zero-chip bet
    onPlaceBet(pendingTileSelection, 0);
    console.log(`[WagerPhase] Zero-chip player selected tile ${pendingTileSelection}`);
    
    // Reset state
    setPendingTileSelection(null);
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "???";
  };

  if (!answerTiles || answerTiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-blue-900">Loading betting options...</p>
      </div>
    );
  }

  // Get confirmation message data
  const getConfirmationMessage = () => {
    if (pendingTileSelection === null) return { title: "", message: "" };
    const tile = answerTiles[pendingTileSelection];
    const tileName = tile?.isSmallerTile ? 'Smaller than all' : tile?.guess;
    const bonusMessage = allPlayersZeroChip 
      ? 'If correct, you get 250 chips'
      : 'If correct, you get 25% of max prize';
    
    return {
      title: "Confirm Selection?",
      message: `Select "${tileName}"?\n\n${bonusMessage}\n\n(Cannot change after selection)`
    };
  };

  const confirmData = getConfirmationMessage();

  return (
    <>
      <ConfirmModal
        isOpen={showZeroChipConfirm}
        onClose={() => {
          setShowZeroChipConfirm(false);
          setPendingTileSelection(null);
        }}
        onConfirm={confirmZeroChipSelection}
        title={confirmData.title}
        message={confirmData.message}
        confirmText="Confirm"
        cancelText="Cancel"
        isDanger={false}
      />
      
      <div>
        {error && (
          <div className="rounded-lg bg-red-100 border border-red-300 p-3 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

      {/* Wager Table - Snooker Style */}
      <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-4 sm:p-6 shadow-2xl mb-6">
        <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 items-stretch justify-center">
          {answerTiles.map((tile, index) => {
            const pendingBet = pendingBets[index] || 0;
            const placedBet = myPlacedBets.find(b => b.tileIndex === index)?.amount || 0;
            const totalBetOnTile = placedBet + pendingBet;
            const potentialWin = totalBetOnTile * tile.multiplier;
            
            // Check if this tile is selected by zero-chip player
            const isSelectedByZeroChip = isZeroChipPlayer && myZeroChipBet?.tileIndex === index;
            
            // Get all bets on this tile (from all players)
            const allBetsOnTile = currentBets.filter(b => b.tileIndex === index);
            
            return (
              <article
                key={index}
                className={`flex-1 min-h-[250px] md:min-h-[300px] lg:min-h-[350px] rounded-2xl border-4 border-white/90 p-3 sm:p-4 transition-all flex flex-col justify-between ${
                  isSelectedByZeroChip
                    ? 'bg-gradient-to-b from-purple-500 to-purple-600 shadow-2xl scale-105 ring-4 ring-purple-300'
                    : placedBet > 0
                    ? 'bg-gradient-to-b from-green-500 to-green-600 shadow-2xl scale-105'
                    : pendingBet > 0
                    ? 'bg-gradient-to-b from-orange-400 to-orange-500 shadow-xl'
                    : isZeroChipPlayer && !hasSelectedTile
                    ? 'bg-gradient-to-b from-green-600 to-green-700 hover:from-purple-600 hover:to-purple-700 hover:shadow-2xl cursor-pointer'
                    : 'bg-gradient-to-b from-green-600 to-green-700 hover:shadow-xl'
                }`}
                onClick={() => isZeroChipPlayer && !hasSelectedTile && handleZeroChipTileSelect(index)}
              >
                {/* Multiplier Badge - Top */}
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block px-3 py-1 rounded-full text-sm sm:text-base font-black bg-white/90 text-black shadow-lg">
                    ×{tile.multiplier}
                  </span>
                  <div className="text-right">
                    {isSelectedByZeroChip && (
                      <span className="block text-white text-xs font-bold bg-purple-500/80 rounded-full px-2 py-1">
                        🎁 Selected
                      </span>
                    )}
                    {totalBetOnTile > 0 && !isSelectedByZeroChip && (
                      <span className="block text-white text-xs font-bold bg-black/40 rounded-full px-2 py-1">
                        → {potentialWin} 🪙
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Display */}
                <div className="mb-3 flex-1 flex flex-col items-center justify-center">
                  {tile.isSmallerTile ? (
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-white">
                        SMALLER
                      </p>
                      <p className="text-sm text-white/80 mt-2">
                        Than all guesses
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white text-center mb-2">
                        {tile.guess}
                      </p>
                      {tile.playerIds && tile.playerIds.length > 0 && (
                        <div className="text-xs text-white/70 text-center mt-1">
                          {tile.playerIds.map(pid => getPlayerName(pid)).join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Show all bets on this tile (realtime) */}
                {allBetsOnTile.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {allBetsOnTile.map((bet, betIdx) => {
                      const player = players.find(p => p.id === bet.playerId);
                      const playerName = player?.name || "Unknown";
                      const playerColor = player?.color || '#fff';
                      const isMe = bet.playerId === myPlayerId;
                      const canRemove = isMe && !hasConfirmed;
                      return (
                        <div 
                          key={betIdx} 
                          className={`text-xs font-semibold rounded-full px-2 py-1 flex items-center justify-between ${
                            isMe ? 'bg-white/20' : 'bg-black/30'
                          } ${canRemove ? 'cursor-pointer hover:bg-white/30' : ''}`}
                          onClick={canRemove ? (e) => {
                            e.stopPropagation();
                            onRemoveBet(index);
                          } : undefined}
                          title={canRemove ? 'Click to remove bet' : ''}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: playerColor }}
                            />
                            <span className="text-white truncate">
                              {playerName}{isMe && ' (You)'}
                            </span>
                          </div>
                          <span className="ml-2 whitespace-nowrap text-white">
                            {bet.isZeroChipBet ? '🎁' : `${bet.amount} 🪙`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bet Input or Selection Button */}
                {!isHost && !isZeroChipPlayer && (
                  <div>
                    <label htmlFor={`bet-${index}`} className="sr-only">
                      Additional chips to bet
                    </label>
                    <input
                      id={`bet-${index}`}
                      type="number"
                      min="0"
                      max={myChips + placedBet}
                      value={pendingBets[index] !== undefined ? pendingBets[index] : (placedBet || "")}
                      onChange={(e) => handleBetChange(index, e.target.value)}
                      placeholder={placedBet > 0 ? placedBet.toString() : "0"}
                      className="w-full rounded-lg border-2 border-white/50 bg-white/90 px-3 py-2 text-center text-lg font-bold text-black focus:ring-2 focus:ring-yellow-400 focus:outline-none focus:bg-white"
                    />
                  </div>
                )}
                
                {/* Zero-Chip Player: Click to select */}
                {!isHost && isZeroChipPlayer && !hasSelectedTile && (
                  <div className="text-center py-2">
                    <div className="text-white text-sm font-bold bg-purple-500/80 rounded-full px-3 py-1">
                      👆 Click to select
                    </div>
                  </div>
                )}
                
                {!isHost && isSelectedByZeroChip && (
                  <div className="text-center py-2">
                    <div className="text-white text-sm font-bold">
                      ✅ You selected this tile
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Action Zone (Yellow Theme) */}
      <div className="rounded-xl bg-yellow-100 shadow-xl overflow-hidden">
        <div className="p-6 space-y-4">
          {!isHost && (
            <>
              {/* Special Chance Info (for zero-chip players) */}
            {isZeroChipPlayer && !hasConfirmed && (
              <div className="text-center py-3 border-t border-b border-purple-300">
                <h4 className="text-purple-900 font-bold text-sm mb-2">
                  {hasSelectedTile ? 'Tile Selected' : 'Special Chance'}
                </h4>
                {hasSelectedTile && myZeroChipBet ? (
                  <div className="space-y-1">
                    <p className="text-purple-800 font-semibold text-sm">
                      You selected: <span className="font-black">{myZeroChipBet.tileIndex === 0 ? 'Smaller than all' : answerTiles[myZeroChipBet.tileIndex]?.guess}</span>
                    </p>
                    <p className="text-purple-700 text-xs">
                      {allPlayersZeroChip 
                        ? 'If correct → Get 250 chips'
                        : 'If correct → Get 25% of max prize'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-purple-800 text-sm">
                      Out of chips? Click a tile above
                    </p>
                    <p className="text-purple-700 text-xs">
                      {allPlayersZeroChip 
                        ? 'If correct → Get 250 chips'
                        : 'If correct → Get 25% of max prize'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Chips Info Display (for non-zero-chip players) */}
            {!isZeroChipPlayer && !hasConfirmed && (
              <div className="flex items-center justify-center gap-15 text-center">
                {/* Current Chips */}
                <div>
                  <p className="text-blue-600 text-sm font-semibold mb-1">💰 Current</p>
                  <p className="text-blue-900 text-3xl font-black">{myChips}</p>
                </div>
                
                {/* Pending Bets */}
                <div>
                  <p className="text-orange-600 text-sm font-semibold mb-1">⏳ Pending</p>
                  <p className="text-orange-900 text-3xl font-black">{totalPendingBet}</p>
                </div>
                
                {/* Remaining */}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${
                    remainingChips < 0 ? 'text-red-600' : 'text-purple-600'
                  }`}>
                    {remainingChips < 0 ? '⚠️ Over!' : '🎯 Remaining'}
                  </p>
                  <p className={`text-3xl font-black ${
                    remainingChips < 0 ? 'text-red-900' : 'text-purple-900'
                  }`}>
                    {remainingChips}
                  </p>
                </div>
              </div>
            )}

            {/* Header (for non-zero-chip players only) */}
            {!hasConfirmed && !isZeroChipPlayer && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-yellow-900 mb-1">
                  🎲 Place Your Bets
                </h3>
                <p className="text-yellow-700 text-sm">
                  Enter bet amounts in the tiles above, then place your bets!
                </p>
              </div>
            )}

            {/* Place Pending Bets Button (for normal players) */}
            {!isZeroChipPlayer && totalPendingBet > 0 && !hasConfirmed && remainingChips >= 0 && (
              <button
                type="button"
                onClick={handlePlaceBets}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-6 py-3 shadow-md transition"
              >
                Place Bets ({totalPendingBet} chips)
              </button>
            )}

            {/* Confirm Wagers Button */}
            {!hasConfirmed ? (
              isZeroChipPlayer && !hasSelectedTile ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-gray-400 text-white font-bold text-base px-6 py-3 shadow-md cursor-not-allowed opacity-60"
                >
                  Select a tile first
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmWagers}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-6 py-3 shadow-md transition"
                >
                  {totalPlacedBet > 0 && !isZeroChipPlayer 
                    ? `Confirm Wagers (${totalPlacedBet} chips)` 
                    : 'Confirm Wagers'
                  }
                </button>
              )
            ) : (
              <div className="text-center py-3">
                <h3 className="text-yellow-900 text-base font-bold mb-2">Confirmed</h3>
                <p className="text-yellow-700 text-sm">
                  Waiting for others... ({confirmedCount}/{totalPlayers})
                </p>
              </div>
            )}
          </>
        )}

          {/* Host Message */}
          {isHost && (
            <div className="text-center py-3">
              <h3 className="text-yellow-900 text-base font-bold mb-2">Host View</h3>
              <p className="text-yellow-700 text-sm mb-2">Waiting for players to confirm wagers...</p>
              <p className="text-yellow-900 font-bold text-sm">
                {confirmedCount}/{totalPlayers} confirmed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

WagerPhase.displayName = "WagerPhase";

export default WagerPhase;


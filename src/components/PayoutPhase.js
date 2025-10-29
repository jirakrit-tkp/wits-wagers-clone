const PayoutPhase = ({ 
  correctAnswer, 
  winningTile, 
  answerTiles, 
  payouts, 
  chips, 
  players,
  currentQuestion,
  myPlayerId,
  currentBets
}) => {
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "???";
  };

  const myPayout = payouts[myPlayerId];
  const myChips = chips[myPlayerId] || 0;

  return (
    <div>
      {/* Wager Table with Winning Tile Highlighted */}
      <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-4 sm:p-6 shadow-2xl mb-6">
        <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 items-stretch justify-center">
          {answerTiles.map((tile, index) => {
            const isWinningTile = (tile.isSmallerTile && winningTile.isSmallerTile) || 
                                  (!tile.isSmallerTile && tile.guess === winningTile.guess);
            
            // Get all bets on this tile (from currentBets)
            const allBetsOnTile = (currentBets || []).filter(b => b.tileIndex === index);
            const totalBetAmount = allBetsOnTile.reduce((sum, bet) => sum + (bet.amount || 0), 0);
            
            return (
              <article
                key={index}
                className={`flex-1 min-h-[250px] md:min-h-[300px] lg:min-h-[350px] rounded-2xl border-4 p-3 sm:p-4 transition-all flex flex-col justify-between ${
                  isWinningTile
                    ? 'bg-gradient-to-b from-yellow-400 to-yellow-500 border-yellow-300 shadow-2xl scale-105 ring-4 ring-yellow-300'
                    : 'bg-gradient-to-b from-green-600 to-green-700 border-white/90'
                }`}
              >
                {/* Multiplier Badge - Top */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm sm:text-base font-black shadow-lg ${
                    isWinningTile ? 'bg-white text-yellow-600' : 'bg-white/90 text-black'
                  }`}>
                    ×{tile.multiplier}
                  </span>
                  {isWinningTile && (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-black bg-yellow-600 text-white shadow-lg">
                      🏆 WIN
                    </span>
                  )}
                </div>

                {/* Answer Display */}
                <div className="mb-3 flex-1 flex flex-col items-center justify-center">
                  {tile.isSmallerTile ? (
                    <div className="text-center">
                      <p className={`text-xl sm:text-2xl font-bold ${
                        isWinningTile ? 'text-yellow-900' : 'text-white'
                      }`}>
                        SMALLER
                      </p>
                      <p className={`text-sm mt-2 ${
                        isWinningTile ? 'text-yellow-800' : 'text-white/80'
                      }`}>
                        Than all guesses
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-4xl sm:text-5xl lg:text-6xl font-black text-center mb-2 ${
                        isWinningTile ? 'text-yellow-900' : 'text-white'
                      }`}>
                        {tile.guess}
                      </p>
                      {tile.playerIds && tile.playerIds.length > 0 && (
                        <div className="text-center">
                          <p className={`text-xs font-semibold ${
                            isWinningTile ? 'text-yellow-900/70' : 'text-white/70'
                          }`}>
                            by {tile.playerIds.map(id => getPlayerName(id)).join(", ")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Show all bets on this tile (realtime) */}
                {allBetsOnTile.length > 0 && (
                  <div className="space-y-1">
                    {allBetsOnTile.map((bet, betIdx) => {
                      const player = players.find(p => p.id === bet.playerId);
                      const playerName = player?.name || "Unknown";
                      const playerColor = player?.color || '#fff';
                      const isMe = bet.playerId === myPlayerId;
                      return (
                        <div 
                          key={betIdx} 
                          className={`text-xs font-semibold rounded-full px-2 py-1 flex items-center justify-between ${
                            isWinningTile
                              ? (isMe ? 'bg-yellow-300' : 'bg-yellow-200/80')
                              : (isMe ? 'bg-white/20' : 'bg-black/30')
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: playerColor }}
                            />
                            <span className={`truncate ${
                              isWinningTile ? 'text-yellow-900' : 'text-white'
                            }`}>
                              {playerName}{isMe && ' (You)'}
                            </span>
                          </div>
                          <span className={`ml-2 whitespace-nowrap ${
                            isWinningTile ? 'text-yellow-900' : 'text-white'
                          }`}>
                            {bet.isZeroChipBet ? '🎁' : `${bet.amount} 🪙`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

    </div>
  );
};

PayoutPhase.displayName = "PayoutPhase";

export default PayoutPhase;


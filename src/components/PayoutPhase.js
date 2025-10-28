const PayoutPhase = ({ 
  correctAnswer, 
  winningTile, 
  answerTiles, 
  payouts, 
  chips, 
  players,
  currentQuestion,
  myPlayerId
}) => {
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "???";
  };

  const myPayout = payouts[myPlayerId];
  const myChips = chips[myPlayerId] || 0;

  return (
    <div className="space-y-6">
      {/* Correct Answer Display */}
      <article className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300 p-6 text-center">
        <div className="text-5xl mb-3">✨</div>
        <h3 className="text-lg text-green-900/60 mb-2">Correct Answer</h3>
        <p className="text-5xl font-bold text-green-900 mb-4">{correctAnswer}</p>
        {currentQuestion?.explanation && (
          <p className="text-sm text-green-900/70 mt-2">{currentQuestion.explanation}</p>
        )}
        {currentQuestion?.source && (
          <p className="text-xs text-green-900/50 mt-2">Source: {currentQuestion.source}</p>
        )}
      </article>

      {/* Winning Tile Display */}
      <article className="rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center shadow-xl">
        <div className="text-4xl mb-2">🏆</div>
        <h3 className="text-white text-sm font-medium mb-2">Winning Tile</h3>
        {winningTile.isSmallerTile ? (
          <div>
            <p className="text-3xl font-bold text-white mb-1">Smaller than all</p>
            <p className="text-yellow-900 text-sm">Smaller than smallest</p>
          </div>
        ) : (
          <p className="text-4xl font-bold text-white">{winningTile.guess}</p>
        )}
        <div className="mt-3">
          <span className="inline-block bg-white text-yellow-600 px-4 py-2 rounded-full font-bold text-lg">
            ×{winningTile.multiplier}
          </span>
        </div>
        {winningTile.playerIds && winningTile.playerIds.length > 0 && (
          <p className="text-yellow-900 text-sm mt-2">
            Answered by: {winningTile.playerIds.map(pid => getPlayerName(pid)).join(", ")}
          </p>
        )}
      </article>

      {/* My Payout */}
      {myPayout && myPayout.wonChips > 0 ? (
        <article className={`rounded-xl p-6 shadow-xl animate-pulse ${
          myPayout.isZeroChipBonus 
            ? 'bg-gradient-to-r from-purple-400 to-pink-400' 
            : 'bg-gradient-to-r from-green-400 to-green-500'
        }`}>
          <div className="text-center">
            <div className="text-5xl mb-3">{myPayout.isZeroChipBonus ? '🎁' : '🎉'}</div>
            <h3 className="text-white text-xl font-bold mb-2">
              {myPayout.isZeroChipBonus ? 'Special Bonus!' : 'You Won!'}
            </h3>
            <p className="text-4xl font-black text-white mb-4">
              +{myPayout.wonChips} 🪙
            </p>
            {myPayout.isZeroChipBonus ? (
              <div className="space-y-1">
                <p className="text-white text-sm">
                  🌟 Bonus for zero-chip players 🌟
                </p>
                <p className="text-purple-100 text-sm">
                  (25% of maximum prize)
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {myPayout.bets.map((bet, i) => (
                  <p key={i} className="text-green-900 text-sm">
                    {bet.amount} × {bet.multiplier} = {bet.winnings} chips
                  </p>
                ))}
              </div>
            )}
            <p className="text-white font-semibold mt-3">
              Total chips: {myChips} 🪙
            </p>
          </div>
        </article>
      ) : (
        <article className="rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 p-6 shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">😢</div>
            <h3 className="text-gray-700 text-lg font-semibold mb-2">No Chips Won</h3>
            <p className="text-gray-600 text-sm">Try again next round!</p>
            <p className="text-gray-700 font-semibold mt-2">
              Remaining chips: {myChips} 🪙
            </p>
          </div>
        </article>
      )}

      {/* All Payouts Summary */}
      <article className="rounded-xl bg-white border border-blue-200 p-6">
        <h3 className="text-blue-900 font-bold text-lg mb-4">💰 Payout Summary</h3>
        {Object.keys(payouts).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(payouts).map(([playerId, payout]) => (
              <div 
                key={playerId} 
                className={`flex justify-between items-center p-3 rounded-lg ${
                  payout.isZeroChipBonus 
                    ? 'bg-purple-100 border border-purple-300'
                    : playerId === myPlayerId 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">
                    {getPlayerName(playerId)}
                    {playerId === myPlayerId && " (You)"}
                  </span>
                  {payout.isZeroChipBonus && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                      🎁 Bonus
                    </span>
                  )}
                </div>
                <span className={`font-bold ${
                  payout.isZeroChipBonus ? 'text-purple-600' : 'text-green-600'
                }`}>
                  +{payout.wonChips} 🪙
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No winners this round</p>
        )}
      </article>

      {/* Answer Tiles Reference */}
      <details className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <summary className="cursor-pointer font-semibold text-blue-900 hover:text-blue-700">
          View all betting tiles
        </summary>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {answerTiles.map((tile, index) => (
            <div
              key={index}
              className={`rounded-lg p-3 text-center ${
                tile === winningTile
                  ? 'bg-yellow-200 border-2 border-yellow-500'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="text-xs font-semibold text-gray-600 mb-1">
                ×{tile.multiplier}
              </div>
              {tile.isSmallerTile ? (
                <p className="text-sm font-bold text-purple-700">Smaller</p>
              ) : (
                <p className="text-lg font-bold text-blue-900">{tile.guess}</p>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

PayoutPhase.displayName = "PayoutPhase";

export default PayoutPhase;


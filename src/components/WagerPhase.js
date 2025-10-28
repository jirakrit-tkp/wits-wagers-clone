import { useState, useEffect } from "react";

const WagerPhase = ({ 
  answerTiles, 
  players, 
  chips, 
  myPlayerId, 
  onPlaceBet,
  onConfirmWagers,
  currentBets,
  confirmedWagers,
  zeroChipPlayers,
  isHost 
}) => {
  const [pendingBets, setPendingBets] = useState({}); // { tileIndex: amount } - before confirm
  const [error, setError] = useState("");
  
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
    const amount = parseInt(value) || 0;
    
    if (amount < 0) {
      setError("จำนวนชิปต้องเป็นบวก");
      return;
    }
    
    const newBets = { ...pendingBets, [tileIndex]: amount };
    const newTotal = Object.values(newBets).reduce((sum, amt) => sum + amt, 0);
    
    if (newTotal > myChips) {
      setError(`มีชิปไม่พอ! เหลือ ${myChips} ชิป`);
      return;
    }
    
    setError("");
    setPendingBets(newBets);
  };

  const handlePlaceBets = () => {
    Object.entries(pendingBets).forEach(([tileIndex, amount]) => {
      if (amount > 0) {
        onPlaceBet(parseInt(tileIndex), amount);
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
    
    // Get tile info for confirmation message
    const tile = answerTiles[tileIndex];
    const tileName = tile?.isSmallerTile ? 'น้อยกว่าคำตอบทั้งหมด' : tile?.guess;
    const bonusMessage = allPlayersZeroChip 
      ? 'ถ้าถูกจะได้ 250 ชิป'
      : 'ถ้าถูกจะได้ 25% ของรางวัลสูงสุด';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `ยืนยันการเลือกช่อง "${tileName}"?\n\n` +
      `${bonusMessage}\n` +
      `(เลือกแล้วจะเปลี่ยนไม่ได้)`
    );
    
    if (!confirmed) {
      console.log(`[WagerPhase] Zero-chip player cancelled selection`);
      return;
    }
    
    // Place a zero-chip bet
    onPlaceBet(tileIndex, 0);
    console.log(`[WagerPhase] Zero-chip player selected tile ${tileIndex}`);
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "???";
  };

  if (!answerTiles || answerTiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-blue-900">กำลังโหลดตัวเลือกเดิมพัน...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zero-Chip Player Special Message */}
      {isZeroChipPlayer && !isHost && (
        <article className={`rounded-xl p-6 shadow-xl border-2 transition-all ${
          hasSelectedTile 
            ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-300' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-300 animate-pulse'
        }`}>
          <div className="text-center">
            <div className="text-5xl mb-3">{hasSelectedTile ? '✅' : '🎁'}</div>
            <h3 className="text-white text-2xl font-bold mb-2">
              {hasSelectedTile ? 'เลือกช่องแล้ว!' : 'โอกาสพิเศษ!'}
            </h3>
            {hasSelectedTile && myZeroChipBet ? (
              <>
                <p className="text-white mb-2">
                  คุณเลือกช่อง: <span className="font-bold text-3xl">{myZeroChipBet.tileIndex === 0 ? 'น้อยกว่าทั้งหมด' : answerTiles[myZeroChipBet.tileIndex]?.guess}</span>
                </p>
                <p className="text-green-100 text-sm">
                  {allPlayersZeroChip 
                    ? '🌟 ถ้าถูกจะได้ 250 ชิป 🌟'
                    : '🌟 ถ้าถูกจะได้ 25% ของรางวัลสูงสุด 🌟'
                  }
                </p>
              </>
            ) : (
              <>
                <p className="text-purple-100 mb-3">
                  คุณหมดชิป แต่ยังมีโอกาสได้รับรางวัล!
                </p>
                <p className="text-white font-semibold text-lg mb-2">
                  🎯 คลิกเลือก 1 ช่อง
                </p>
                <p className="text-white text-sm">
                  {allPlayersZeroChip 
                    ? '🌟 ถ้าเลือกถูก → ได้ 250 ชิป 🌟'
                    : '🌟 ถ้าเลือกถูก → ได้ 25% ของรางวัลสูงสุด 🌟'
                  }
                </p>
                <p className="text-purple-100 text-xs mt-2">
                  (เลือกผิดไม่ได้อะไร แต่ยังเล่นต่อได้)
                </p>
              </>
            )}
          </div>
        </article>
      )}

      {/* Chips Display */}
      <article className="rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-900 text-sm font-medium">ชิปตอนนี้</p>
            <p className="text-3xl font-bold text-white">{myChips} 🪙</p>
          </div>
          {totalPlacedBet > 0 && (
            <div className="text-right">
              <p className="text-yellow-900 text-sm font-medium">วางแล้ว</p>
              <p className="text-2xl font-bold text-green-700">{totalPlacedBet} 🪙</p>
            </div>
          )}
          {totalPendingBet > 0 && (
            <div className="text-right">
              <p className="text-yellow-900 text-sm font-medium">จะวาง</p>
              <p className="text-2xl font-bold text-orange-700">{totalPendingBet} 🪙</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-yellow-900 text-sm font-medium">เหลือหลังวาง</p>
            <p className={`text-2xl font-bold ${remainingChips < 0 ? 'text-red-600' : 'text-white'}`}>
              {remainingChips} 🪙
            </p>
          </div>
        </div>
      </article>

      {error && (
        <div className="rounded-lg bg-red-100 border border-red-300 p-3 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Answer Tiles Grid */}
      <div>
        <h3 className="text-blue-900 font-bold text-lg mb-3">🎯 เลือกเดิมพัน</h3>
        <p className="text-blue-900/60 text-sm mb-4">
          คลิกตัวเลขแต่ละช่องเพื่อเดิมพัน คูณชิปได้ตามตัวเลข multiplier
        </p>
        
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {answerTiles.map((tile, index) => {
            const pendingBet = pendingBets[index] || 0;
            const placedBet = myPlacedBets.find(b => b.tileIndex === index)?.amount || 0;
            const totalBetOnTile = placedBet + pendingBet;
            const potentialWin = totalBetOnTile * tile.multiplier;
            
            // Check if this tile is selected by zero-chip player
            const isSelectedByZeroChip = isZeroChipPlayer && myZeroChipBet?.tileIndex === index;
            
            return (
              <article
                key={index}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isSelectedByZeroChip
                    ? 'border-purple-500 bg-purple-50 shadow-xl scale-105 ring-2 ring-purple-300'
                    : placedBet > 0
                    ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                    : pendingBet > 0
                    ? 'border-orange-400 bg-orange-50 shadow-md'
                    : isZeroChipPlayer && !hasSelectedTile
                    ? 'border-purple-300 bg-white hover:border-purple-500 hover:shadow-lg cursor-pointer'
                    : 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-md'
                }`}
                onClick={() => isZeroChipPlayer && !hasSelectedTile && handleZeroChipTileSelect(index)}
              >
                {/* Multiplier Badge */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    tile.multiplier >= 5 ? 'bg-purple-500 text-white' :
                    tile.multiplier >= 4 ? 'bg-red-500 text-white' :
                    tile.multiplier >= 3 ? 'bg-orange-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    ×{tile.multiplier}
                  </span>
                  <div className="text-right">
                    {isSelectedByZeroChip && (
                      <span className="block text-purple-600 text-xs font-semibold">
                        🎁 เลือกแล้ว
                      </span>
                    )}
                    {placedBet > 0 && !isSelectedByZeroChip && (
                      <span className="block text-green-600 text-xs font-semibold">
                        ✅ วางแล้ว {placedBet} 🪙
                      </span>
                    )}
                    {totalBetOnTile > 0 && !isSelectedByZeroChip && (
                      <span className="block text-blue-600 text-xs font-semibold">
                        → {potentialWin} 🪙
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Display */}
                <div className="mb-3">
                  {tile.isSmallerTile ? (
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-700">
                        น้อยกว่าทั้งหมด
                      </p>
                      <p className="text-xs text-purple-600">
                        Smaller than smallest
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-blue-900 text-center mb-1">
                        {tile.guess}
                      </p>
                      {tile.playerIds && tile.playerIds.length > 0 && (
                        <div className="text-xs text-blue-600 text-center">
                          {tile.playerIds.map(pid => getPlayerName(pid)).join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bet Input or Selection Button */}
                {!isHost && !isZeroChipPlayer && (
                  <div>
                    {placedBet > 0 && (
                      <div className="mb-2 text-center text-xs text-green-700 font-semibold">
                        เดิมพันช่องนี้แล้ว {placedBet} ชิป
                      </div>
                    )}
                    <label htmlFor={`bet-${index}`} className="sr-only">
                      จำนวนชิปที่จะเดิมพันเพิ่ม
                    </label>
                    <input
                      id={`bet-${index}`}
                      type="number"
                      min="0"
                      max={myChips}
                      value={pendingBet || ""}
                      onChange={(e) => handleBetChange(index, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {/* Zero-Chip Player: Click to select */}
                {!isHost && isZeroChipPlayer && !hasSelectedTile && (
                  <div className="text-center py-2">
                    <div className="text-purple-600 text-sm font-semibold">
                      👆 คลิกเพื่อเลือก
                    </div>
                  </div>
                )}
                
                {!isHost && isSelectedByZeroChip && (
                  <div className="text-center py-2">
                    <div className="text-purple-600 text-sm font-bold">
                      ✅ คุณเลือกช่องนี้
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Confirmation Status */}
      <article className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-blue-900 font-bold text-sm mb-3">📊 สถานะการยืนยัน</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {players.map((player) => {
            const confirmed = confirmedWagers?.includes(player.id) || false;
            return (
              <div
                key={player.id}
                className={`rounded-lg px-3 py-2 text-xs font-semibold text-center ${
                  confirmed
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                }`}
              >
                <div>{player.name}</div>
                <div className="mt-1">{confirmed ? '✅' : '⏳'}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-center text-sm font-semibold text-blue-700">
          {confirmedCount}/{totalPlayers} ยืนยันแล้ว
        </div>
      </article>

      {/* Action Buttons */}
      {!isHost && (
        <>
          {/* Place Pending Bets Button (for normal players) */}
          {!isZeroChipPlayer && totalPendingBet > 0 && !hasConfirmed && remainingChips >= 0 && (
            <button
              type="button"
              onClick={handlePlaceBets}
              className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-4 shadow-lg transition transform hover:scale-105"
            >
              📍 วางเดิมพัน ({totalPendingBet} ชิป)
            </button>
          )}

          {/* Confirm Wagers Button */}
          {!hasConfirmed ? (
            isZeroChipPlayer && !hasSelectedTile ? (
              <button
                type="button"
                disabled
                className="w-full rounded-xl bg-gray-400 text-white font-bold px-6 py-4 shadow-lg cursor-not-allowed opacity-50"
              >
                ⚠️ เลือกช่องก่อนยืนยัน
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmWagers}
                className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-4 shadow-lg transition transform hover:scale-105"
              >
                ✅ ยืนยันการเดิมพัน
                {isZeroChipPlayer 
                  ? ' (เลือกช่องแล้ว)' 
                  : totalPlacedBet > 0 
                  ? ` (วางไปแล้ว ${totalPlacedBet} ชิป)` 
                  : ''}
              </button>
            )
          ) : (
            <div className="w-full rounded-xl bg-green-100 border-2 border-green-500 text-green-700 font-bold px-6 py-4 text-center">
              ✅ คุณยืนยันแล้ว - รอผู้เล่นคนอื่น ({confirmedCount}/{totalPlayers})
            </div>
          )}
        </>
      )}

      {/* Host Message */}
      {isHost && (
        <div className="text-center py-4 bg-purple-100 rounded-xl border border-purple-300">
          <p className="text-purple-900 font-semibold">
            👑 คุณคือ Host - รอผู้เล่นยืนยันการเดิมพัน ({confirmedCount}/{totalPlayers})
          </p>
        </div>
      )}
    </div>
  );
};

WagerPhase.displayName = "WagerPhase";

export default WagerPhase;


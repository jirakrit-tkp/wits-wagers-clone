import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

const HostControls = ({ roomId, phase, currentRound, totalRounds, socket, isHost, hostId }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isHost) {
    return null;
  }

  const handleNextRound = () => {
    socket?.emit("nextRound", { roomId });
  };

  const handleDeleteRoom = () => {
    socket?.emit("deleteRoom", { roomId, hostId });
    sessionStorage.removeItem(`room_${roomId}`);
    sessionStorage.removeItem(`room_${roomId}_isHost`);
    sessionStorage.removeItem(`room_${roomId}_hostId`);
    window.location.href = "/";
  };

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRoom}
        title="Delete Room?"
        message="Are you sure you want to delete this room? All players will be kicked out."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
      />
      
      <section className="border-b border-white/20 pb-4">
        <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Host Controls</h3>
        
        <div className="space-y-2">
          {(phase === "reveal" || phase === "payout") && (
            <button
              type="button"
              onClick={handleNextRound}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 text-sm shadow-lg transition"
            >
              Next Round
            </button>
          )}

          {phase === "finished" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 text-sm shadow-lg transition"
            >
              New Game
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-lg bg-black hover:bg-red-600 text-white font-semibold px-4 py-2.5 text-sm shadow-lg transition"
          >
            Delete Room
          </button>
        </div>
    </section>
    </>
  );
};

HostControls.displayName = "HostControls";

export default HostControls;


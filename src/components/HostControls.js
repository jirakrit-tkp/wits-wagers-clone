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
      
      <section className="bg-black shadow-xl overflow-hidden">
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex p-4 items-center justify-between">
        <h2 className="text-white font-bold text-lg">Host Controls</h2>
        
        <div className="flex items-center gap-3">
          {(phase === "reveal" || phase === "payout") && (
            <button
              type="button"
              onClick={handleNextRound}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 shadow-lg transition"
            >
              Next Round
            </button>
          )}

          {phase === "finished" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 shadow-lg transition"
            >
              New Game
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl bg-black hover:bg-red-600 text-white font-semibold px-6 py-3 shadow-lg transition"
          >
            Delete Room
          </button>
        </div>
      </div>

      {/* Mobile: Vertical layout */}
      <div className="md:hidden p-3 space-y-2">
        <h3 className="text-sm font-bold text-white mb-2">Host Controls</h3>
        
        {(phase === "reveal" || phase === "payout") && (
          <button
            type="button"
            onClick={handleNextRound}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-sm transition"
          >
            Next Round
          </button>
        )}

        {phase === "finished" && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-sm transition"
          >
            New Game
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full rounded-md bg-black hover:bg-red-600 text-white font-semibold px-4 py-2 text-sm transition"
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


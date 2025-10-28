import Modal from "./Modal";

const HowToPlayModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎮 How to Play"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          Got it!
        </button>
      }
    >
      <div className="space-y-3 sm:space-y-4 text-gray-700">
        <section>
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1.5 sm:mb-2">🎯 Goal</h3>
          <p className="text-sm leading-relaxed">Win the most chips by guessing answers and betting smart!</p>
        </section>

        <section>
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1.5 sm:mb-2">📝 Game Flow</h3>
          <ol className="text-sm space-y-1.5 sm:space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              <strong>Answer Question</strong> - Submit your best guess to a trivia question
            </li>
            <li>
              <strong>Place Wagers</strong> - Bet your chips on which answer is closest without going over
            </li>
            <li>
              <strong>Win Chips</strong> - Earn chips based on winning bets (multipliers: 2x to 6x)
            </li>
            <li>
              <strong>Repeat</strong> - Play 7 rounds, highest chips wins!
            </li>
          </ol>
        </section>

        <section>
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1.5 sm:mb-2">💡 Tips</h3>
          <ul className="text-sm space-y-1 list-disc list-inside leading-relaxed">
            <li>{"You don't need to know the exact answer"}</li>
            <li>Bet on multiple tiles to increase winning chances</li>
            <li>Higher multipliers = bigger risk, bigger reward</li>
            <li>If you run out of chips, you get a bonus next payout</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1.5 sm:mb-2">🏆 Winning</h3>
          <p className="text-sm leading-relaxed">
            The <strong>closest answer without going over</strong> the correct answer wins. 
            All bets on that tile earn chips based on the multiplier!
          </p>
        </section>
      </div>
    </Modal>
  );
};

HowToPlayModal.displayName = "HowToPlayModal";

export default HowToPlayModal;


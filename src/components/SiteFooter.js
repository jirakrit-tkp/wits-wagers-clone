import React, { useState } from "react";
import HowToPlayModal from "./HowToPlayModal";

const SiteFooter = () => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <>
      <HowToPlayModal 
        isOpen={showHowToPlay} 
        onClose={() => setShowHowToPlay(false)} 
      />
      
      <footer className="text-center py-3 sm:py-4 md:fixed md:bottom-4 md:right-4 z-50 max-md:bg-black flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-3">
        <button
          type="button"
          onClick={() => setShowHowToPlay(true)}
          className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/50 hover:bg-blue-500 text-white font-bold text-lg transition shadow-lg flex-shrink-0"
          title="How to Play"
          aria-label="How to Play"
        >
          ?
        </button>
        
        <a
          href="https://boardgamegeek.com/boardgame/20100/wits-and-wagers"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block max-md:text-white text-white/50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:text-blue-500 transition text-center"
        >
          {"Click here to buy Wits & Wagers on BoardGameGeek"}
        </a>
      </footer>
    </>
  );
};

SiteFooter.displayName = "SiteFooter";

export default SiteFooter;



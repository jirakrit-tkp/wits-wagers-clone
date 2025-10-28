import React from "react";

const SiteFooter = () => {
  return (
    <footer className="text-center py-4 md:fixed md:bottom-4 md:right-4 z-50 max-md:bg-black">
      <a
        href="https://boardgamegeek.com/boardgame/20100/wits-and-wagers"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block max-md:text-white text-gray-400 px-4 py-2 text-sm hover:text-blue-500 transition"
      >
        {"Click here to buy Wits & Wagers on BoardGameGeek"}
      </a>
    </footer>
  );
};

SiteFooter.displayName = "SiteFooter";

export default SiteFooter;



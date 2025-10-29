import { useState } from "react";
import { useRouter } from "next/router";
import SiteFooter from "@/components/SiteFooter";
import Snackbar from "@/components/Snackbar";

export default function HomePage() {
  const router = useRouter();
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [hostId, setHostId] = useState("");
  const [snackbar, setSnackbar] = useState({ isOpen: false, message: "", type: "info" });

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newHostId = `${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
    setCreatedRoomId(id);
    setHostId(newHostId);
    // Room will be created when host enters the room page
  };

  const goToCreatedRoom = () => {
    if (!createdRoomId) return;
    router.push(`/room/${createdRoomId}/lobby?host=true&hostId=${hostId}`);
  };

  const showSnackbar = (message, type = "info") => {
    setSnackbar({ isOpen: true, message, type });
  };

  const closeSnackbar = () => {
    setSnackbar({ isOpen: false, message: "", type: "info" });
  };

  const joinRoom = () => {
    const trimmed = joinRoomId.trim().toUpperCase();
    if (!trimmed) {
      showSnackbar("Please enter a room code", "warning");
      return;
    }
    
    // Redirect to lobby - validation will happen on server side
    router.push(`/room/${trimmed}/lobby`);
  };

  return (
    <main className="h-screen w-screen bg-yellow-200 relative overflow-hidden flex flex-col">
      {/* Radial base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,#fde047_0%,#facc15_35%,#eab308_60%,#ca8a04_100%)] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_35%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.25)_100%)]"
      />
      {/* Sunburst light stripes centered on the title - oversized container to avoid rectangular edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 [width:220vmax] [height:220vmax] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="sunburst-rotate w-full h-full [background:repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,255,255,0.6)_0deg,rgba(255,255,255,0.6)_12deg,rgba(255,255,255,0)_12deg,rgba(255,255,255,0)_28deg)]"
        />
      </div>

      <header className="relative z-10 flex-1 flex items-center justify-center px-6">
        <section className="w-full max-w-4xl flex flex-col items-center justify-center text-center">
          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-tight tracking-tight text-white font-oi text-outline-waw"
          >
            Wits &<br/>Wagers
          </h1>
          <div className="mt-6 w-full md:max-w-3xl mx-auto flex justify-center">
            <div className="flex flex-col md:flex-row gap-4 max-sm:w-full">
              {/* Host / Create Room */}
              <article className="rounded-2xl bg-white/90 backdrop-blur shadow-xl p-4 flex flex-col items-center text-cente">
                <h2 className="text-lg font-bold text-blue-900">Host</h2>
                {!createdRoomId && (
                  <button
                    type="button"
                    onClick={createRoom}
                    className="mt-3 w-full inline-flex items-center justify-center rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 shadow-md transition whitespace-nowrap"
                  >
                    Create Room
                  </button>
                )}
                {createdRoomId && (
                  <div className="mt-3 w-full">
                    <a
                      className="block break-words font-mono text-blue-800 underline"
                      href={`/room/${createdRoomId}`}
                    >{`/room/${createdRoomId}`}</a>
                    <button
                      type="button"
                      onClick={goToCreatedRoom}
                      className="mt-3 w-full inline-flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 shadow-md transition whitespace-nowrap"
                    >
                      Enter
                    </button>
                  </div>
                )}
              </article>

              {/* Join Room */}
              <article className="rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-yellow-300 p-4 flex flex-col items-center text-center">
                <h2 className="text-lg font-bold text-blue-900">Join</h2>
                <form
                  className="mt-3 w-full flex flex-col sm:flex-row gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    joinRoom();
                  }}
                >
                  <label htmlFor="room-code" className="sr-only">
                    Room Code
                  </label>
                <input
                  id="room-code"
                  type="text"
                  inputMode="text"
                  placeholder="Enter Code"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="flex-1 min-w-0 rounded-full border border-blue-300 px-4 py-2.5 text-blue-900 placeholder-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                />
                  <button
                    type="submit"
                    className="rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 shadow-md transition whitespace-nowrap flex-shrink-0"
                  >
                    Join
                  </button>
                </form>
              </article>
            </div>
          </div>
        </section>
      </header>
      {/* Footer is now rendered globally via _app.js */}
      
      <Snackbar
        isOpen={snackbar.isOpen}
        onClose={closeSnackbar}
        message={snackbar.message}
        type={snackbar.type}
        duration={3000}
      />
    </main>
  );
}

HomePage.displayName = "HomePage";

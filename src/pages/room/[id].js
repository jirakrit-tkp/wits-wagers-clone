import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import io from "socket.io-client";
const socket = io();

export default function RoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    socket.on("answersUpdate", (data) => setAnswers(data));
  }, []);

  const joinRoom = () => {
    socket.emit("joinRoom", { roomId: id, player: { id: Date.now(), name: nickname } });
    setJoined(true);
  };

  const submitAnswer = (guess) => {
    socket.emit("submitAnswer", { roomId: id, playerId: Date.now(), guess });
  };

  return (
    <div className="p-6 text-center">
      {!joined ? (
        <>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Enter your name" />
          <button onClick={joinRoom}>Join Room</button>
        </>
      ) : (
        <>
          <input type="number" id="guess" placeholder="Enter your guess" />
          <button onClick={() => submitAnswer(Number(document.getElementById("guess").value))}>
            Submit
          </button>
          <div>
            <h3>Answers so far:</h3>
            <ul>{answers.map((a, i) => <li key={i}>{JSON.stringify(a)}</li>)}</ul>
          </div>
        </>
      )}
    </div>
  );
}

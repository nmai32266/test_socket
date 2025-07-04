import "./App.css";
import axios from "axios";
import { useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

function App() {
  const BASE_URL = "https://rest-api.liverr88.xyz";
  const SOCKET_URL = "https://socket.liverr88.xyz";
  // const SOCKET_URL = "http://localhost:4000";

  // 0107_1751365760069_10001
  var time = "1751365760069";
  var channelId = "686270746db6db3d03d60657";
  var users = new Map();

  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(200);
  const autoChatRef = useRef(false);
  const [message, setMessage] = useState("");

  const connectSocket = async (userNo: number) => {
    const username = `0107_${time}_test${10000 + userNo}`;
    const password = "Orics@727965";

    const loginRes = await axios
      .post(`${BASE_URL}/customer`, {
        username,
        password,
      })
      .catch((err) =>
        console.error(
          `Failed to login ${username}`,
          err?.response?.data?.message ||
            err?.response?.data ||
            err?.response ||
            err?.cause ||
            err?.message
        )
      );

    const token = loginRes?.data?.data?.accessToken;
    const socket = io(SOCKET_URL, {
      query: { token, wsUserId: "" },
      transports: ["websocket"],
    });
    socket.connect();

    socket.on("connect", () => {
      users.set(username, 1);
      // const noop = () => {};
      socket.removeAllListeners();
      // socket.on = noop;
      // socket.io.on = noop;
      // socket.io.engine.on = noop;
      // socket.io.engine.onmessage = null;
      // socket.io.engine.ondata = null;

      // if (socket.io.engine.transport) {
      //   // socket.io.engine.transport.onData = noop;
      //   // socket.io.engine.transport.onPacket = noop;
      //   // socket.io.engine.transport.onClose = noop;
      // }
      socket.emit("to_server::user_join_channel", {
        channelId,
      });
      const sendMessage = (socket: Socket) => {
        const timeMs = Math.floor(Math.random() * 3000) + 1000;
        if (autoChatRef.current) {
          socket.emit("to_server::user_send_message", {
            channelId,
            content: `${userNo} - ${new Date().toTimeString()}`,
          });
        }
        setTimeout(() => {
          sendMessage(socket);
        }, timeMs);
      };
      sendMessage(socket);
    });

    socket.on("disconnect", () => {
      users.delete(username);
      console.error(`disconnected:`, username);
    });
  };

  const run = async () => {
    setInterval(() => {
      setMessage("connect: " + users.size);
    }, 1000);
    const promises = [];
    for (let userNo = from; userNo <= to; userNo++) {
      const promise = connectSocket(userNo);
      promises.push(promise);
    }
    await Promise.all(promises);
    console.log("=================== DONE =========================");
  };

  return (
    <div className="App">
      <input
        type="number"
        value={from}
        onChange={(e) => setFrom(Number(e.target.value))}
      />
      <input
        type="number"
        value={to}
        onChange={(e) => setTo(Number(e.target.value))}
      />
      Tự động chat
      <input
        type="checkbox"
        defaultChecked={autoChatRef.current}
        onChange={(e) => {
          autoChatRef.current = Boolean(e.target.checked);
        }}
      />
      <button
        onClick={() => {
          run();
        }}
      >
        Test
      </button>
      <div>{message}</div>
    </div>
  );
}

export default App;

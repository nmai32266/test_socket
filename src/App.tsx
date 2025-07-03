// import "./App.css";
// import axios from "axios";
// import { useRef, useState } from "react";
// import io from "socket.io-client";

// function App() {
//   const BASE_URL =
//     "http://live-rest-api-lb-271378262.ap-southeast-1.elb.amazonaws.com";
//   const SOCKET_URL =
//     "http://live-socket-lb-795224482.ap-southeast-1.elb.amazonaws.com";
//   // const SOCKET_URL = "http://localhost:4000";

//   // 0107_1751365760069_10001
//   var time = "1751365760069";
//   var channelId = "686270746db6db3d03d60657";
//   var users = new Map();

//   const [from, setFrom] = useState(1);
//   const [to, setTo] = useState(200);
//   const autoChatRef = useRef(false);
//   const [message, setMessage] = useState("");

//   const connectSocket = async (userNo: number) => {
//     const username = `0107_${time}_test${10000 + userNo}`;
//     const password = "Orics@727965";

//     const loginRes = await axios
//       .post(`${BASE_URL}/customer`, {
//         username,
//         password,
//       })
//       .catch((err) =>
//         console.error(
//           `Failed to login ${username}`,
//           err?.response?.data?.message ||
//             err?.response?.data ||
//             err?.response ||
//             err?.cause ||
//             err?.message
//         )
//       );

//     const token = loginRes?.data?.data?.accessToken;
//     const socket = io(SOCKET_URL, {
//       query: { token, wsUserId: "" },
//       transports: ["websocket"],
//     });
//     socket.connect();

//     socket.on("connect", () => {
//       users.set(username, 1);
//       socket.emit("[to_server]user_join_channel", {
//         channelId,
//       });
//       let count = 1;
//       const delay = Math.floor(Math.random() * 1000) + 3100;
//       setInterval(() => {
//         if (autoChatRef.current) {
//           socket.emit("[to_server]user_send_message", {
//             channelId,
//             content: new Date().toTimeString(),
//           });
//         }
//       }, delay);
//     });

//     socket.on("disconnect", () => {
//       users.delete(username);
//       console.error(`disconnected:`, username);
//     });
//   };

//   const run = async () => {
//     setInterval(() => {
//       setMessage("connect: " + users.size);
//     }, 1000);
//     const promises = [];
//     for (let userNo = from; userNo <= to; userNo++) {
//       const promise = connectSocket(userNo);
//       promises.push(promise);
//     }
//     await Promise.all(promises);
//     console.log("=================== DONE =========================");
//   };

//   return (
//     <div className="App">
//       <input
//         type="number"
//         value={from}
//         onChange={(e) => setFrom(Number(e.target.value))}
//       />
//       <input
//         type="number"
//         value={to}
//         onChange={(e) => setTo(Number(e.target.value))}
//       />
//       Tự động chat
//       <input
//         type="checkbox"
//         defaultChecked={autoChatRef.current}
//         onChange={(e) => {
//           autoChatRef.current = Boolean(e.target.checked);
//         }}
//       />
//       <button
//         onClick={() => {
//           run();
//         }}
//       >
//         Test
//       </button>
//       <div>{message}</div>
//     </div>
//   );
// }

// export default App;

import "./App.css";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

function App() {
  const SOCKET_URL =
    "http://live-socket-lb-795224482.ap-southeast-1.elb.amazonaws.com";
  const channelId = "686270746db6db3d03d60657";

  const [tokens, setTokens] = useState<string[]>([]);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(50);
  const autoChatRef = useRef(false);
  const [message, setMessage] = useState("");
  const users = useRef<Map<string, any>>(new Map());

  // Load token từ file JSON (đặt trong public/)
  useEffect(() => {
    fetch("/tokens.json")
      .then((res) => res.json())
      .then((data) => {
        setTokens(data);
        console.log("✅ Loaded tokens:", data.length);
      })
      .catch((err) => console.error("❌ Lỗi load token:", err));
  }, []);

  const connectSocket = async (token: string, index: number) => {
    const socket = io(SOCKET_URL, {
      query: { token, wsUserId: "" },
      transports: ["websocket"],
    });

    socket.connect();

    socket.on("connect", () => {
      users.current.set(token, socket);
      socket.emit("[to_server]user_join_channel", { channelId });
      console.log(`✅ Socket connected (${index})`);

      const delay = Math.floor(Math.random() * 1000) + 3100;
      setInterval(() => {
        if (autoChatRef.current) {
          socket.emit("[to_server]user_send_message", {
            channelId,
            content: `Message at ${new Date().toTimeString()}`,
          });
        }
      }, delay);
    });

    socket.on("disconnect", () => {
      users.current.delete(token);
      console.error(`❌ Socket disconnected (${index})`);
    });
  };

  const run = async () => {
    setInterval(() => {
      setMessage("Connected: " + users.current.size);
    }, 1000);

    const subset = tokens.slice(from, to + 1);
    console.log(`🔗 Connecting ${subset.length} sockets...`);

    const promises = subset.map((token, idx) =>
      connectSocket(token, from + idx)
    );
    await Promise.all(promises);
    console.log("✅ DONE: all sockets connected");
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
      <button onClick={run}>Kết nối</button>
      <div>{message}</div>
    </div>
  );
}

export default App;

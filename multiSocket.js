const io = require("socket.io-client");
const fs = require("fs");
const readline = require("readline");

const SOCKET_URL = "http://live-socket-lb-795224482.ap-southeast-1.elb.amazonaws.com";
const channelId = "686270746db6db3d03d60657";
const TOKENS_FILE = "tokens.json";

let sockets = [];
let connectedCount = 0;
let autoChat = false;
let tokens = [];

let from = 0;
let to = 0;
let sentSuccess = 0;
let sentFail = 0;

// Đọc token từ file
function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) {
    console.error("❌ Không tìm thấy file tokens.json");
    process.exit(1);
  }
  const data = fs.readFileSync(TOKENS_FILE, "utf-8");
  return JSON.parse(data);
}

// Kết nối nhiều socket cùng lúc theo batch
async function connectAllSockets(tokensSlice, concurrency = 20) {
  console.log("🔗 Đang kết nối socket...");
  for (let i = 0; i < tokensSlice.length; i += concurrency) {
    const batch = tokensSlice.slice(i, i + concurrency);
    await Promise.all(
      batch.map((token, idx) => connectSocket(token, from + i + idx))
    );
    await new Promise((r) => setTimeout(r, 200)); // Nghỉ giữa các batch
  }
  console.log(`✅ Đã kết nối ${connectedCount} socket`);
}

function connectSocket(token, index) {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      query: { token },
      transports: ["websocket"],
      pingTimeout: 60000,  // 60s không phản hồi mới disconnect
      pingInterval: 5000,  // Server gửi PING mỗi 5s
    });

    socket.on("connect", () => {
      const ignoreEvent = () => {};
      socket.removeAllListeners();  // Xóa listener mặc định
      
      socket.io.engine.on("packet", (packet) => {
        if (packet.type === "pong") {
          return;
        }
      });

      connectedCount++;
      sockets.push(socket);
      socket.emit("[to_server]user_join_channel", { channelId });
      console.log(`✅ Socket ${index} connected`);
      resolve();
    });

    socket.on("disconnect", () => console.log(`❌ Socket ${index} disconnected`));
    socket.on("connect_error", (err) => {
      console.error(`❌ Connect error (${index}):`, err.message);
      resolve();
    });
  });
}

function startAutoChat() {
  if (!sockets.length) {
    console.log("⚠️ Chưa có socket nào được kết nối");
    return;
  }

  autoChat = true;
  console.log("🚀 Bắt đầu auto chat...");

  sockets.forEach((socket, index) => {
    const delay = 3200 + Math.floor(Math.random() * 1000);
    setInterval(() => {
      if (autoChat) {
        try {
          socket.emit("[to_server]user_send_message", {
            channelId,
            content: `💬 User ${index} ${new Date().toLocaleTimeString()}`,
          });
          sentSuccess++;
        } catch (err) {
          sentFail++;
        }
      }
    }, delay);
  });

  // Hiển thị tổng số đã gửi mỗi 5s
  setInterval(() => {
    if (autoChat) {
      console.log(`📨 Đã gửi: ${sentSuccess} thành công, ${sentFail} lỗi`);
    }
  }, 5000);
}

// Giao diện CLI
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  tokens = loadTokens();

  rl.question("Nhập số bắt đầu (from): ", (fromInput) => {
    from = parseInt(fromInput);
    rl.question("Nhập số kết thúc (to): ", (toInput) => {
      to = parseInt(toInput);
      const tokenSubset = tokens.slice(from, to + 1);
      console.log(`✅ Chọn ${tokenSubset.length} token từ ${from} đến ${to}`);
      showMenu();

      rl.on("line", async (input) => {
        if (input.trim() === "1") {
          await connectAllSockets(tokenSubset);
        } else if (input.trim() === "2") {
          startAutoChat();
        } else {
          console.log("⚠️ Lệnh không hợp lệ");
        }
        showMenu();
      });
    });
  });
}

function showMenu() {
  console.log("\nChọn lệnh:");
  console.log("1. Kết nối socket");
  console.log("2. Bắt đầu chat tự động");
  console.log("Ctrl+C để thoát");
}

main();

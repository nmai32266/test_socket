const axios = require('axios');
const { io } = require('socket.io-client');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG = {
  BASE_URL: "https://rest-api.liverr88.xyz",
  SOCKET_URL: "https://socket.liverr88.xyz",
  TOKENS_FILE: "tokens.json",
  CHANNEL_ID: "686270746db6db3d03d60657",
  AUTO_CHAT_INTERVAL: 3000, // 3 seconds
  MAX_CONNECTIONS: 2000, // Maximum concurrent connections
};

class SocketConnector {
  constructor() {
    this.activeSockets = new Map();
    this.connectionCount = 0;
    this.autoChatEnabled = false;
  }

  async start() {
    // Load tokens from file
    const tokens = await this.loadTokens();
    if (!tokens || tokens.length === 0) {
      console.error("No tokens found in tokens.json");
      process.exit(1);
    }

    // Get user input for range
    const { start, end } = await this.getUserInput(tokens.length);

    // Validate range
    if (start < 1 || end > tokens.length || start > end) {
      console.error("Invalid range specified");
      process.exit(1);
    }

    // Ask about auto-chat
    this.autoChatEnabled = await this.askAutoChat();

    // Connect sockets
    console.log(`Connecting sockets from ${start} to ${end}...`);
    await this.connectSockets(tokens.slice(start - 1, end));

    // Start status monitoring
    this.startStatusMonitor();

    console.log("All connections initiated. Press Ctrl+C to exit.");
  }

  async loadTokens() {
    try {
      const data = fs.readFileSync(CONFIG.TOKENS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error(`Error loading tokens file: ${err.message}`);
      return null;
    }
  }

  async getUserInput(maxTokens) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`Enter start (1-${maxTokens}): `, (start) => {
        rl.question(`Enter end (${start}-${maxTokens}): `, (end) => {
          rl.close();
          resolve({
            start: parseInt(start),
            end: parseInt(end)
          });
        });
      });
    });
  }

  async askAutoChat() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enable auto-chat? (y/n): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  async connectSockets(tokens) {
    const connectionPromises = [];
    
    for (let i = 0; i < tokens.length; i++) {
      if (this.connectionCount >= CONFIG.MAX_CONNECTIONS) {
        // Wait for some connections to complete before continuing
        await Promise.race(connectionPromises);
      }

      const token = tokens[i];
      const promise = this.connectSocket(token, i + 1);
      connectionPromises.push(promise);
    }

    await Promise.all(connectionPromises);
  }

  async connectSocket(token, index) {
    return new Promise((resolve) => {
      const socket = io(CONFIG.SOCKET_URL, {
        query: { token, wsUserId: "" },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });

      socket.on('connect', () => {
        const noop = () => {};
        socket.removeAllListeners();
        socket.on = noop;
        socket.io.on = noop;
        socket.io.engine.on = noop;
        socket.io.engine.onmessage = null;
        socket.io.engine.ondata = null;

        if (socket.io.engine.transport) {
          socket.io.engine.transport.onData = noop;
          socket.io.engine.transport.onPacket = noop;
          socket.io.engine.transport.onClose = noop;
        }


        this.connectionCount++;
        this.activeSockets.set(index, socket);
        
        console.log(`Socket ${index} connected`);
        socket.emit("to_server::user_join_channel", {
          channelId: CONFIG.CHANNEL_ID
        });

        if (this.autoChatEnabled) {
          this.setupAutoChat(socket, index);
        }

        resolve();
      });

      socket.on('disconnect', () => {
        this.connectionCount--;
        this.activeSockets.delete(index);
        console.log(`Socket ${index} disconnected`);
      });

      socket.on('connect_error', (err) => {
        console.error(`Socket ${index} connection error:`, err.message);
      });

      socket.connect();
    });
  }

  setupAutoChat(socket, index) {
    const sendMessage = () => {
      if (socket.connected) {
        socket.emit("to_server::user_send_message", {
          channelId: CONFIG.CHANNEL_ID,
          content: `${index} - ${new Date().toISOString()}`
        });
      }
      
      // Schedule next message with some randomness
      const delay = CONFIG.AUTO_CHAT_INTERVAL + Math.random() * 2000;
      setTimeout(sendMessage, delay);
    };

    // Start the auto-chat loop
    setTimeout(sendMessage, Math.random() * 5000);
  }

  startStatusMonitor() {
    setInterval(() => {
      console.log(`Active connections: ${this.connectionCount}`);
    }, 5000);
  }
}

// Run the connector
const connector = new SocketConnector();
connector.start().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
  console.log("\nDisconnecting all sockets...");
  process.exit();
});
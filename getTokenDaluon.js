const axios = require("axios");
const fs = require("fs");
const pLimit = require("p-limit");

const BASE_URL = "http://live-rest-api-lb-271378262.ap-southeast-1.elb.amazonaws.com";
const FILE_PATH = "tokens.json";

// const time = "1751365760069"; // oris
// const time = "1751529734750"; // test1
// const time = "1751530317891"; // test1
const time = "1751531995463"; // test1

const password = "Orics@727965";
const from = 1;
const to = 19978;

const limit = pLimit(30);

async function loginUser(userNo, tokens) {
  // const username = `0107_${time}_test${10000 + userNo}`; // oris
  const username = `0107_${time}_test1${10000 + userNo}`; // test1
  try {
    const res = await axios.post(`${BASE_URL}/customer`, {
      username,
      password,
    });

    const token = res?.data?.data?.accessToken;
    if (token) {
      tokens.push(token);
      const count = tokens.length;
      console.log(`✅ Token OK: ${username} (${count})`);
      fs.writeFileSync(FILE_PATH, JSON.stringify(tokens, null, 2), "utf-8");
    } else {
      console.warn(`⚠️ Không lấy được token cho ${username}`);
    }
  } catch (err) {
    console.error(`❌ Lỗi login ${username}:`, err?.response?.data || err?.message);
  }
}

async function getOrCreateTokens() {
  let tokens = [];

  // Đọc file nếu có
  if (fs.existsSync(FILE_PATH)) {
    try {
      const content = fs.readFileSync(FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        tokens = parsed;
        if (tokens.length >= to - from + 1) {
          console.log("✅ Đã sử dụng lại token từ file.");
          return tokens;
        }
      }
    } catch (err) {
      console.warn("⚠️ File tokens.json bị lỗi, sẽ tạo lại.");
    }
  }

  console.log("🔐 Đang tạo token mới...");

  const promises = [];
  for (let userNo = from + tokens.length; userNo <= to; userNo++) {
    promises.push(limit(() => loginUser(userNo, tokens)));
  }

  await Promise.all(promises);

  console.log(`✅ Đã hoàn tất, tổng cộng ${tokens.length} token.`);
  return tokens;
}

getOrCreateTokens();

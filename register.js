const axios = require("axios");
const pLimit = require("p-limit");

const BASE_URL = "http://live-rest-api-lb-271378262.ap-southeast-1.elb.amazonaws.com";
const time = Date.now();
let userNo = 10000;

const TOTAL_USERS = 20000;
const CONCURRENCY = 40;
const password = "Orics@727965";

console.log("=================== START =========================");
console.log(`Prefix: 0107_${time}_test${userNo + 1}`);

const limit = pLimit(CONCURRENCY);

async function register(userIndex) {
  const no = userNo + userIndex;
  const email = `0107_${time}_test1${no}@gmail.com`;
  const username = `0107_${time}_test1${no}`;
  const fullname = `0107_${time}`;

  try {
    const res = await axios.post(`${BASE_URL}/customer/register`, {
      email,
      username,
      fullname,
      password,
    });

    if (res?.data?.data) {
      console.log(`✅ Registered: ${username}`);
      return true;
    } else {
      console.warn(`❌ Failed: ${username}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error: ${username}`, err?.response?.data?.message || err?.message);
    return false;
  }
}

async function run() {
  let success = 0;
  let fail = 0;

  const tasks = Array.from({ length: TOTAL_USERS }).map((_, i) =>
    limit(() =>
      register(i).then((ok) => {
        ok ? success++ : fail++;
      })
    )
  );

  await Promise.all(tasks);

  console.log("=================== DONE =========================");
  console.log(`✅ Tổng thành công: ${success}`);
  console.log(`❌ Tổng thất bại: ${fail}`);
}

run();

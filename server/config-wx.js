const fetch = require("./fetch.js");
const crypto = require("crypto");

async function wxConfig(props) {
  const { headers } = props;
  const uri = `https://hidden-reality.zhengwenbing.com/fetchByAppId?type=jsapi_ticket&token=${headers.token}`;
  const res = await fetch(uri, {
    mode: "cors",
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const jsapi_ticket = await res.json();
  const timestamp = Date.now() / 1000;
  const nonceStr = "mZ37ARthq3fvsX%1$1cEaCv^5YNx8EK4";
  const noncestr = nonceStr;
  const url = `${headers["x-forwarded-proto"]}://${headers.host}${props.url}`;
  const params = { noncestr, jsapi_ticket, timestamp, url };
  const keys = Object.keys(params).sort();
  const string1 = keys.map((key) => `${key}=${params[key]}`).join("&");
  const signature = crypto.createHash("sha1").update(string1).digest("hex");
  console.log("jsapi_config string1:", string1, " signature:", signature);
  return { timestamp, nonceStr, signature };
}

module.exports = { wxConfig };

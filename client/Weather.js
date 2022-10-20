import React, { useEffect, useState } from "react";
import "./Weather.css";
let fetch;
if (process.env.BUILD_TARGET === "web") {
  fetch = window.fetch;
}
if (process.env.BUILD_TARGET === "node") {
  fetch = (...args) =>
    import("../server/fetch.js").then((m) => m.default(...args));
}
const icons = {
  晴: "☀️",
  云: "☁️",
  阴: "☁️",
  雨: "🌧",
  雪: "❄️",
};
const bgColors = {
  晴: "rgba(255, 233, 99, 61.8%)",
  云: "#bdf7ff",
  阴: "rgba(189, 247, 255, 61.8%)",
  雨: "rgba(75, 89, 94, 61.8%)",
  雪: "#70dde1",
};
// import locator from "./locator.png";

export async function fetchInfo(city) {
  if (
    process.env.BUILD_TARGET === "node" &&
    process.env.GITHUB_PAGES === "true"
  ) {
    const cityToCity = {
      341881: { province: "安徽", city: "宁国市" },
      500000: { province: "重庆", city: "重庆市" },
      310000: { province: "上海", city: "上海市" },
      110000: { province: "北京", city: "北京市" },
    };
    return Object.assign(
      {
        adcode: city,
        weather: "晴",
        temperature: "21",
        winddirection: "北",
        windpower: "≤3",
        humidity: "61.8",
        reporttime: "2022-10-15 11:31:32",
      },
      cityToCity[city]
    );
  }
  const sp = new URLSearchParams();
  sp.append("key", "730462af18e87350041dcda934ca66c1");
  sp.append("city", city);
  const uri = `https://restapi.amap.com/v3/weather/weatherInfo?${sp.toString()}`;
  const res = await fetch(uri);
  const { lives } = await res.json();
  return lives[0];
}

export default function Weather(props) {
  const [lives, setLives] = useState(props.lives);
  const [updateTime, setUpdateTime] = useState(Date.now());
  useEffect(() => {
    setLives(props.lives);
  }, [props.lives]);
  const handleUpdate = async () => {
    const now = Date.now();
    const shouldUpdate = now - updateTime > 10 * 1000;
    if (shouldUpdate) {
      setUpdateTime(now);
      setLives(await fetchInfo(props.city));
    }
  };
  const handleClick = async () => await handleUpdate();
  const weather = lives.weather;
  const temperature = lives.temperature;
  let city = lives.city;
  // if (city.endsWith("市")) city = city.slice(0, -1);
  const matched = weather.match(/.*([晴阴云雨雪]).*/);
  let wkey;
  if (matched && matched[1]) {
    wkey = matched[1];
  } else {
    wkey = "晴";
  }
  const icon = icons[wkey];
  const style = { backgroundColor: bgColors[wkey] };
  const infoStyle = {};
  if (city.length > 6) infoStyle.lineHeight = "1rem";
  return (
    <div className="card card-weather" onClick={handleClick} style={style}>
      <span className="weather-icon">{icon}</span>
      <span className="weather-textinfo" style={infoStyle}>
        <span className="weather-temperature">
          {temperature}
          <sup>℃</sup>
        </span>
        <br />
        {weather}
        <br />
        {/* <span className="weather-location-icon">➤</span> */}
        {/* <img
            src={locator}
            style={{
              position: "relative",
              top: "1px",
              width: "11px",
              height: "11px",
            }}
          /> */}
        {city}
      </span>
    </div>
  );
}

import React, { useEffect, useState } from "react";

let fetch;
if (process.env.BUILD_TARGET === "web") {
  fetch = window.fetch;
} else {
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

export async function fetchInfo(city) {
  const sp = new URLSearchParams();
  sp.append("key", "730462af18e87350041dcda934ca66c1");
  sp.append("city", city);
  const uri = `https://restapi.amap.com/v3/weather/weatherInfo?${sp.toString()}`;
  const res = await fetch(uri);
  const { lives } = await res.json();
  return lives[0];
}

function useApi(initialCity, initialLives) {
  const [lives, setLives] = useState(initialLives);
  const [updateTime, setUpdateTime] = useState(Date.now());
  const [city, setCity] = useState(initialCity);

  useEffect(() => {
    (async () => {
      setLives(await fetchInfo(city));
    })();
  }, [city, updateTime]);
  const doFetch = (doCity) => {
    const now = Date.now();
    if (now - updateTime > 10 * 1000) {
      setCity(doCity);
      setUpdateTime(now);
    }
  };
  return [{ lives }, doFetch];
}

function Weather(props) {
  const [{ lives }, doFetch] = useApi(props.city, props.lives);
  const handleClick = () => {
    doFetch(props.city);
  };
  const isLoading = lives === undefined;
  let style = {};
  if (isLoading) {
    return (
      <div className="container">
        <div
          className="block weather-block"
          onClick={handleClick}
          style={style}
        ></div>
      </div>
    );
  }

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
  style = { backgroundColor: bgColors[wkey] };
  const infoStyle = {};
  if (city.length > 6) infoStyle.lineHeight = "1rem";
  return (
    <div className="container">
      <div className="block weather-block" onClick={handleClick} style={style}>
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
          {city}
        </span>
      </div>
    </div>
  );
}

export default Weather;

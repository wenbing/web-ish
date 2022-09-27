import React, { useEffect, useState } from "react";

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

function useApi(initialCity) {
  const [lives, setLives] = useState([]);
  const [updateTime, setUpdateTime] = useState(Date.now());
  const [city, setCity] = useState(initialCity);
  const sp = new URLSearchParams();
  sp.append("key", "730462af18e87350041dcda934ca66c1");
  sp.append("city", city);
  const uri = `https://restapi.amap.com/v3/weather/weatherInfo?${sp.toString()}`;

  useEffect(() => {
    setLives([]);
    async function fetchInfo() {
      const res = await fetch(uri);
      const { lives } = await res.json();
      setLives(lives);
    }
    fetchInfo();
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
  const [{ lives }, doFetch] = useApi(props.initialCity);
  const handleClick = () => {
    doFetch(props.initialCity);
  };
  const isLoading = lives.length === 0;
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

  const weather = lives[0].weather;
  const temperature = lives[0].temperature;
  let city = lives[0].city;
  if (city.endsWith("市")) city = city.slice(0, -1);
  const matched = weather.match(/.*([晴阴云雨雪]).*/);
  let wkey;
  if (matched && matched[1]) {
    wkey = matched[1];
  } else {
    wkey = "晴";
  }
  const icon = icons[wkey];
  style = { backgroundColor: bgColors[wkey] };
  return (
    <div className="container">
      <div className="block weather-block" onClick={handleClick} style={style}>
        <span className="weather-icon">{icon}</span>
        <span className="weather-textinfo">
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

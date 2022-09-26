import React, { useEffect, useState } from "react";

const icons = {
  晴: "☀️",
  云: "☁️",
  阴: "☁️",
  雨: "🌧",
  雪: "❄️",
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
  let temperature = "";
  let city = "";
  let weather = "";
  let icon = "";
  const isLoading = lives.length === 0;
  if (!isLoading) {
    temperature = lives[0].temperature;
    city = lives[0].city;
    weather = lives[0].weather;
    if (city.endsWith("市")) city = city.slice(0, -1);
    const matched = weather.match(/.*([晴阴云雨雪]).*/);
    if (matched && matched[1]) {
      icon = icons[matched[1]];
    } else {
      icon = icons["晴"];
    }
  }

  const handleClick = () => {
    doFetch(props.initialCity);
  };
  return (
    <div className="container">
      <div className="block weather-block" onClick={handleClick}>
        {isLoading ? (
          "加载中…"
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default Weather;

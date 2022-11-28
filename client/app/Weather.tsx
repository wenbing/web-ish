import { useEffect, useState } from "react";
import "./Weather.css";
import fetch from "../fetch";
const icons = {
  晴: "☀️",
  云: "☁️",
  阴: "☁️",
  雨: "🌧",
  雪: "❄️",
};
const classNames = {
  晴: "sunny",
  云: "cloudy",
  阴: "overcast",
  雨: "rainy",
  雪: "snowy",
};
// import locator from "./locator.png";

export async function fetchInfo(
  city,
  { isStatic, token }: { isStatic?: boolean; token?: string } = {}
) {
  if (process.env.BUILD_TARGET === "node" && isStatic) {
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
  sp.append("token", token);
  // sp.append("key", "730462af18e87350041dcda934ca66c1");
  sp.append("city", city);

  const uri = `https://hidden-reality.zhengwenbing.com/fetchWeatherInfo?${sp.toString()}`;
  // const uri = `https://restapi.amap.com/v3/weather/weatherInfo?${sp.toString()}`;
  const res = await fetch(uri);
  const { lives } = await res.json();
  return lives[0];
}

export type WeatherLives = {
  adcode: string;
  city: string;
  weather: string;
  temperature: string;
};

type WeatherProps = {
  lives: WeatherLives;
  city: string;
  token: string;
};

export default function Weather(props: WeatherProps) {
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
      setLives(await fetchInfo(props.city, { token: props.token }));
    }
  };
  const handleClick = async () => await handleUpdate();
  const weather = lives.weather;
  const temperature = lives.temperature;
  const city = lives.city;
  // if (city.endsWith("市")) city = city.slice(0, -1);
  const matched = weather.match(/.*([晴阴云雨雪]).*/);
  let wkey;
  if (matched && matched[1]) {
    wkey = matched[1];
  } else {
    wkey = "晴";
  }
  const icon = icons[wkey];
  const className = classNames[wkey];
  const infoStyle: { lineHeight?: string } = {};
  if (city.length > 6) infoStyle.lineHeight = "1rem";
  return (
    <div
      className={"card-weather card-weather-" + className}
      onClick={handleClick}
    >
      <div className="card-weather__info">
        <div className="card-weather__icon">{icon}</div>
        <div className="card-weather__text" style={infoStyle}>
          <span className="card-weather__temperature">
            {temperature}
            <sup>℃</sup>
          </span>
          <br />
          {weather}
          <br />
          {city}
        </div>
      </div>
    </div>
  );
}

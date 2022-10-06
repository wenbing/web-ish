import { useEffect, useState, useDeferredValue, useMemo } from "react";
import Nav from "./Nav";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";
import { pagesPublicPath } from "./routes";
import "./Setting.css";

// cities, items, byFirstLetter, byPinyin, byAdcode, byName

function normalize(data) {
  const cities = Object.keys(data).reduce(
    (acc, fl) => acc.concat(data[fl]),
    []
  );
  cities.forEach((city) => {
    city.counties.forEach((county) => (county.prefecture = city));
  });
  const items = cities.reduce(
    (acc, city) => acc.concat(city).concat(city.counties),
    []
  );
  return items;
}

function getCitiesBy(name, items) {
  return items.reduce(
    (acc, item) => Object.assign(acc, { [[item[name]]]: item }),
    {}
  );
}

function formatCities(adcodes, citiesByAdCode) {
  return adcodes.map((adcode) => ({
    adcode,
    name: ((item) =>
      item.prefecture ? `${item.prefecture.name}/${item.name}` : item.name)(
      citiesByAdCode[adcode]
    ),
  }));
}

function filterCitiesByKeyword(cities, keyword) {
  if (keyword === "") {
    return [];
  }
  const citiesByPinyin = getCitiesBy("pinyin", cities);
  const citiesByName = getCitiesBy("name", cities);
  const isPY = keyword.match(/[a-z]+/gi);
  const data = isPY !== null ? citiesByPinyin : citiesByName;
  return Object.keys(data).reduce((acc, key) => {
    if (key.indexOf(keyword) !== -1) {
      return acc.concat(data[key]);
    }
    return acc;
  }, []);
}

function useCity(initials) {
  const [cities, setCities] = useState([]);
  const [selected, setSelected] = useState(initials.selected);

  useEffect(() => {
    (async function () {
      let data;
      try {
        data = await (await fetch(`${pagesPublicPath}/cities.json`)).json();
      } catch (ex) {
        console.error(ex);
        return;
      }
      setCities(normalize(data));
    })();
  }, []);

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY_CITIES);
    if (data) {
      setSelected(JSON.parse(data));
    }
  }, []);
  useEffect(() => {
    const data = JSON.stringify(selected);
    localStorage.setItem(STORAGE_KEY_CITIES, data);
  }, [selected]);

  const selectCity = (adcode) => {
    const citiesByAdCode = getCitiesBy("adcode", cities);
    setSelected((prev) => {
      const adcodes = prev.map(({ adcode }) => adcode);
      const pos = adcodes.indexOf(adcode);
      let data;
      if (pos !== -1) {
        data = prev.slice(0, pos).concat(prev.slice(pos + 1));
      } else {
        const item = formatCities([adcode], citiesByAdCode);
        data = prev.concat(item);
      }
      return data;
    });
  };

  const isLoading = cities.length === 0;
  const state = {
    isLoading,
    cities,
    selected,
  };
  return [state, { selectCity }];
}

function CityList({ cities, selectCity }) {
  const handleSelect = (evt) => {
    if (evt.target.tagName.toLowerCase() === "li") {
      const adcode = evt.target.dataset.adcode;
      selectCity(adcode);
    }
  };
  return (
    <ul onClick={handleSelect}>
      {cities.map((item) => (
        <li data-adcode={item.adcode} key={item.adcode}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function Setting(props) {
  const [{ cities, selected, isLoading }, { selectCity }] = useCity({
    selected: props.selected,
  });

  const [isSearching, setIsSearching] = useState(() =>
    new URLSearchParams(props.route.search).has("select-cities")
  );
  const toggleIsSearching = (evt) => {
    evt.preventDefault();
    setIsSearching(!isSearching);
  };

  const [keyword, setKeyword] = useState("");
  const searchCity = (evt) => {
    const query = evt.target.value;
    setKeyword(query);
  };
  const deferedKeyword = useDeferredValue(keyword);
  const suggestCities = useMemo(
    () => (
      <CityList
        cities={filterCitiesByKeyword(cities, deferedKeyword)}
        selectCity={selectCity}
      ></CityList>
    ),
    [deferedKeyword]
  );

  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <h2 className="setting-header">设置</h2>
      <div className="setting setting-city">
        <p>
          <span className="setting-city-list">
            城市：
            {selected.map(({ adcode, name }) => (
              <span key={adcode}>{name}</span>
            ))}
          </span>
          <a
            href="?select-cities"
            className="setting-city-select"
            onClick={toggleIsSearching}
          >
            选择
          </a>
        </p>
        {isSearching && (
          <>
            <input type="input" defaultValue={keyword} onChange={searchCity} />
            {suggestCities}
          </>
        )}
      </div>
    </>
  );
}

Setting.getInitialData = async () => {
  let selected;
  let data;
  if (process.env.BUILD_TARGET === "node") {
    const info = require("../server/cityInfo").normalizedCities();
    data = info.byCityFirstLetter;
  }
  if (process.env.BUILD_TARGET === "web") {
    data = await (await fetch(`${pagesPublicPath}/cities.json`)).json();
  }
  const items = normalize(data);
  const citiesByAdCode = getCitiesBy("adcode", items);
  selected = formatCities(defaultCities, citiesByAdCode);
  return { selected };
};

export default Setting;

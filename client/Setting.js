import { useEffect, useState, useDeferredValue, useMemo } from "react";
import Nav from "./Nav";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";
import { pagesPublicPath } from "./routes";
import "./Setting.css";

function useCity(initials) {
  const [cities, setCities] = useState([]);
  const [citiesByPinyin, setCitiesByPinyin] = useState({});
  const [citiesByAdCode, setCitiesByAdCode] = useState({});
  const [citiesByName, setCitiesByName] = useState({});
  const [selected, setSelected] = useState(initials.selected);
  const [isSearching, setIsSearching] = useState(() =>
    new URLSearchParams(initials.route.search).has("select-cities")
  );
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    // setCities([]);
    (async function () {
      const data = await (await fetch(`${pagesPublicPath}/cities.json`)).json();
      const citiesByFirstLetter = data;
      const cities = Object.keys(data).reduce(
        (acc, key) => acc.concat(data[key]),
        []
      );
      const citiesByPinyin = getCitiesBy("pinyin", cities, {});
      const citiesByAdCode = getCitiesBy("adcode", cities, {});
      const citiesByName = getCitiesBy("name", cities, {});
      setCities(cities);
      setCitiesByPinyin(citiesByPinyin);
      setCitiesByAdCode(citiesByAdCode);
      setCitiesByName(citiesByName);
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

  useEffect(() => {
    if (initials.isSearching !== isSearching) {
      setIsSearching(initials.isSearching);
    }
  }, [initials.isSearching]);

  function toggleIsSearching(evt) {
    evt.preventDefault();
    setIsSearching(!isSearching);
  }

  function searchCity(evt) {
    const query = evt.target.value;
    setKeyword(query);
  }

  function selectCity(adcode) {
    setSelected((prev) => {
      const pos = prev.indexOf(adcode);
      let data;
      if (pos !== -1) data = prev.slice(0, pos).concat(prev.slice(pos + 1));
      else data = prev.concat(adcode);
      return data;
    });
  }

  const isLoading = cities.length === 0;
  const deferedKeyword = useDeferredValue(keyword);
  const state = {
    cities,
    citiesByPinyin,
    citiesByName,
    selected: isLoading
      ? []
      : selected.map((adcode) => ({
          adcode,
          name: ((item) =>
            item.prefecture
              ? `${item.prefecture.name}/${item.name}`
              : item.name)(citiesByAdCode[adcode]),
        })),
    keyword,
    deferedKeyword,
    isLoading,
    isSearching,
  };
  const handler = { searchCity, selectCity, toggleIsSearching };
  return [state, handler];
}

function getCitiesBy(name, items, init) {
  return items.reduce((acc, item) => {
    Object.assign(acc, { [item[name]]: item });
    if (item.counties) {
      item.counties.forEach((county) => (county.prefecture = item));
      return getCitiesBy(name, item.counties, acc);
    }
    return acc;
  }, init);
}

function filterCitiesByKeyword(citiesByPinyin, citiesByName, keyword) {
  if (keyword === "") {
    return [];
  }
  const isPY = keyword.match(/[a-z]+/gi);
  const data = isPY !== null ? citiesByPinyin : citiesByName;
  return Object.keys(data).reduce((acc, key) => {
    if (key.indexOf(keyword) !== -1) {
      return acc.concat(data[key]);
    }
    return acc;
  }, []);
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
  const [
    {
      citiesByPinyin,
      citiesByName,
      selected,
      isLoading,
      isSearching,
      keyword,
      deferedKeyword,
    },
    { searchCity, selectCity, toggleIsSearching },
  ] = useCity({ selected: props.adcodes, route: props.route });
  const suggestCities = useMemo(
    () => (
      <CityList
        cities={filterCitiesByKeyword(
          citiesByPinyin,
          citiesByName,
          deferedKeyword
        )}
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
        {isLoading ? (
          "城市：加载中…"
        ) : (
          <>
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
                <input
                  type="input"
                  defaultValue={keyword}
                  onChange={searchCity}
                />
                {suggestCities}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

Setting.getInitialData = () => {
  return { adcodes: defaultCities };
};

export default Setting;

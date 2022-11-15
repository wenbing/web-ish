import { useEffect, useState, useDeferredValue, useMemo } from "react";
import Nav from "./Nav";
import Loading from "./Loading";
import { STORAGE_KEY_CITIES } from "./defaultCities";
import { publicPath } from "./shared_routes.mjs";
import "./Setting.css";

// cities, items, byFirstLetter, byPinyin, byAdcode, byName
type CityItem = { adcode: string; name: string };

function normalize(data): CityItem[] {
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
    (acc, item) => Object.assign(acc, { [item[name]]: item }),
    {}
  );
}

function formatCities(
  adcodes,
  citiesByAdCode
): { adcode: string; name: string }[] {
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
        data = await (await fetch(`${publicPath}/cities.json`)).json();
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

  return {
    cities,
    selected,
    selectCity,
  };
}

function CityList({
  cities,
  selectCity,
}: {
  cities: CityItem[];
  selectCity: (adcode: string) => void;
}) {
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

interface SettingProps extends RouteProps {
  selected: [];
}

const Setting: RouteComponent = (props: SettingProps) => {
  const { cities, selected, selectCity } = useCity({
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

  const { render, route, headers } = props;
  return (
    <>
      <Loading isLoading={props.isLoading}></Loading>
      <Nav {...{ render, route, headers }}></Nav>

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
};

Setting.getInitialData = async () => {
  let data;
  if (process.env.BUILD_TARGET === "node") {
    data = require("../server/cities.json");
  }
  if (process.env.BUILD_TARGET === "web") {
    data = await (await fetch(`${publicPath}/cities.json`)).json();
  }
  const items = normalize(data);
  const citiesByAdCode = getCitiesBy("adcode", items);
  const selected: CityItem[] = formatCities([], citiesByAdCode);
  return { selected };
};

export default Setting;

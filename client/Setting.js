import { useEffect, useState } from "react";
import Nav from "./Nav";
import defaultCities from "./defaultCities";

import { publicPath } from "./routes";

function useCities(initialCities) {
  const [cities, setCities] = useState([]);

  const doFetch = () => {};
  useEffect(() => {
    setCities([]);
    async function fetchInfo() {
      const allCities = await (await fetch(`${publicPath}/cities.json`)).json();
      const citiesByAdCode = Object.keys(allCities).reduce((acc, key) => {
        return allCities[key].reduce((acc, item) => {
          Object.assign(acc, { [item.adcode]: item });
          return item.counties.reduce(
            (acc, county) => Object.assign(acc, { [county.adcode]: county }),
            acc
          );
        }, acc);
      }, {});
      setCities(initialCities.map((adcode) => citiesByAdCode[adcode].name));
    }
    fetchInfo();
  }, []);
  const isLoading = cities.length === 0;
  return [cities, isLoading, doFetch];
}

function Setting(props) {
  const [cities, isLoading, doFetch] = useCities(props.adcodes);
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <h2 className="setting-header">设置</h2>
      <div className="setting">
        <div className="setting-city">
          城市：
          {isLoading ? "加载中…" : `${cities.join(", ")}`}
        </div>
      </div>
    </>
  );
}

Setting.getInitialData = () => {
  return { adcodes: defaultCities };
};

export default Setting;

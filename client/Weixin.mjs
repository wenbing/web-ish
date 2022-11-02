import { useEffect, useState } from "react";
import "weui";
import Nav from "./Nav.js";
import Loading from "./Loading.js";

const getInWeixin = (props) =>
  props.headers["x-requested-with"] === "com.tencent.mm" ||
  props.headers["user-agent"].match(/\swechatdevtools\//) !== null;

configWX.promise = null;
async function configWX(props) {
  const wx = await import(
    /* webpackChunkName: 'weixin' */ "./jweixin-1.6.0.cjs"
  );
  if (!configWX.promise) {
    const debug = false; //process.env.NODE_ENV === "development";
    const { appId } = props;
    const jsApiList = Object.keys(wx);
    configWX.promise = new Promise((resolve, reject) => {
      wx.config({ debug, appId, ...props.jsapi_config, jsApiList });
      wx.ready(() => resolve(wx));
      wx.error((res) => reject(new Error(res.errMsg)));
    });
  }
  try {
    await configWX.promise;
  } catch (ex) {
    console.error(ex);
    // @TODO report wx config error
  }
  return wx;
}

const promisified = {};
function promisifyWX(wx, funcName) {
  if (wx[funcName] !== promisified[funcName]) {
    const func = wx[funcName].bind(wx);
    promisified[funcName] = (opts) =>
      new Promise((resolve, reject) => {
        const success = (res) => resolve(res);
        const fail = (res) => resolve(res.errMsg);
        func({ ...opts, success, fail });
      });
  }
  return promisified[funcName];
}

export default function Weixin(props) {
  const inWeixin = getInWeixin(props);
  const [latlng, setLatlng] = useState({});
  const [msgShare, setMsgShare] = useState(null);
  useEffect(
    function initWeixin() {
      if (!inWeixin) return;
      (async () => {
        const wx = await configWX(props);
        const getLocation = promisifyWX(wx, "getLocation");
        const wgsLatlng = await getLocation({ type: "wgs84" });
        const gcjLatlng = await getLocation({ type: "wgs84" });
        const { latitude, longitude } = wgsLatlng;
        setLatlng({ latitude, longitude });

        const updateMsgShare = promisifyWX(wx, "updateAppMessageShareData");
        const result = await updateMsgShare({
          title: "title", // 分享标题
          desc: "desc", // 分享描述
          link: props.url, // 分享链接，该链接域名或路径必须与当前页面对应的公众号 JS 安全域名一致
          imgUrl: `${props.headers["x-forwarded-proto"]}://${props.headers.host}${props.favicon}`, // 分享图标
        });
        setMsgShare(result);
      })();
    },
    [props.appId, props.route]
  );
  return (
    <>
      <Loading isLoading={props.isLoading}></Loading>
      <Nav
        render={props.render}
        route={props.route}
        headers={props.headers}
      ></Nav>
      <div className="article weui-article">
        {inWeixin && <h2>Wei xin</h2>}
        <p>inWeixin: {inWeixin ? "true" : "false"}</p>
        <p>latlng: {JSON.stringify(latlng)}</p>
        <p>msgShare: {JSON.stringify(msgShare)}</p>
      </div>
    </>
  );
}

Weixin.getInitialData = async (props) => {
  const inWeixin = getInWeixin(props);
  if (!inWeixin) {
    return {};
  }
  const appId = "wxc6f6f01560d25b57";
  let jsapi_config;
  if (process.env.BUILD_TARGET === "node") {
    jsapi_config = await require("../server/config-wx.js").wxConfig(props);
  } else {
    jsapi_config = props.jsapi_config;
  }
  return { appId, jsapi_config };
};

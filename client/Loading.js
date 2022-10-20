import { useEffect, useState } from "react";

export default function Loading({ isLoading = false }) {
  const [width, setWidth] = useState("0%");
  const [duration, setDuration] = useState("0s");
  useEffect(() => {
    if (isLoading) {
      setWidth("100%");
      setDuration("0.618s");
    } else {
      setDuration("0.1s");
    }
  }, [isLoading]);
  const onTransitionEnd = (evt) => {
    setWidth("0%");
    setDuration("0s");
  };
  const transitionDuration = duration;
  const style = { width, transitionDuration };
  return (
    <div
      className="loading"
      style={style}
      onTransitionEnd={onTransitionEnd}
    ></div>
  );
}

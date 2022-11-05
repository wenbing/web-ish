import { useEffect, useState } from "react";

type LoadingProps = { isLoading: boolean };

export default function Loading({ isLoading = false }: LoadingProps) {
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
  const onTransitionEnd = () => {
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

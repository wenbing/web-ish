import { useEffect, useState } from "react";

function DateCard(props: { date: number }) {
  const [date, setDate] = useState(props.date);
  useEffect(() => {
    const intervalID = setInterval(() => {
      setDate(Date.now());
    }, 1000);
    return () => clearInterval(intervalID);
  });
  let time: string;
  if (date) {
    const d = new Date(date).toUTCString();
    const parts = d.split(" ");
    time = parts[parts.length - 2];
    time = time
      .split(":")
      .map((item: string, index: number) => {
        if (index === 0)
          return ((parseInt(item) + 8) % 24).toString().padStart(2, "0");
        return item;
      })
      .join(":");
  } else {
    time = "08:00:00";
  }
  return (
    <div className="card-time">
      <span className="card-time__timezone">Beijing</span>
      <span className="lcdd-font card-time__countdown">{time}</span>
    </div>
  );
}

export default DateCard;

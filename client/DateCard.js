import React, { useEffect, useState } from "react";

function DateCard(props) {
  const [date, setDate] = useState(props.date);
  useEffect(() => {
    const intervalID = setInterval(() => {
      setDate(Date.now());
    }, 1000);
    return () => {
      clearInterval(intervalID);
    };
  });
  let time;
  if (date) {
    const d = new Date(date).toUTCString();
    const parts = d.split(" ");
    time = parts[parts.length - 2];
  } else {
    time = "00:00:00";
  }
  return (
    <div className="container">
      <h2 className="block time-block">
        <span className="lcdd-font">{time}</span>
      </h2>
    </div>
  );
}

export default DateCard;

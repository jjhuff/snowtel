import React from "react";
import ReactDOM from "react-dom";

import SensorList from "./components/SensorList.jsx";
import "./index.css";

const App = () => {
  return (
    <div>
        <SensorList/>
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector("#root"));

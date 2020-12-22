import React, { useEffect, useState } from "react";
import axios from "axios"

function SensorList() {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
      const apiUrl = "/_/api/v1/sensors";
      axios.get(apiUrl).then((result) => {
          setIsLoaded(true);
          setItems(result.data);
        }
      )
  }, [])

  if (error) {
    return <div>Error: {error.message}</div>;
  } else if (!isLoaded) {
    return <div>Loading...</div>;
  } else {
    return (
      <ul>
        {items.map(item => (
          <li key={item.id}>
              <a href={`/sensor/${item.id}`}>{item.name}</a>
          </li>
        ))}
      </ul>
    );
  }
}

export default SensorList;

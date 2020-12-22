import React, { useEffect, useState } from "react";
import axios from "axios"
import { Link as RouterLink } from 'react-router-dom';
import Link from '@material-ui/core/Link';
import CircularProgress from '@material-ui/core/CircularProgress';

export default function SensorList() {
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
    return <CircularProgress />
  } else {
    return (
      <div>
        {items.map(item => (
          <div key={item.id}>
              <Link to={`/sensor/${item.id}`} component={RouterLink}>
                  {item.name}
              </Link>
          </div>
        ))}
      </div>
    );
  }
}

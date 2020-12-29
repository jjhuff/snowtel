import React, { useEffect, useState } from "react";
import axios from "axios"
import { Link as RouterLink } from 'react-router-dom';
import Link from '@material-ui/core/Link';
import CircularProgress from '@material-ui/core/CircularProgress';

export default function SensorListPage() {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
      const apiUrl = "/_/api/v1/sensors";
      axios.get(apiUrl).then((result) => {
          setItems(result.data);
          setIsLoaded(true);
        }
      )
  }, [])

  if (error) {
      return <div>Error: {error.message}</div>;
  } else if (!isLoaded) {
      return <CircularProgress />
  } else {
      let sortedItems = items.sort((a,b) => a.name.localeCompare(b.name))
      return (
          <div>
              {sortedItems.map(item => (
                  <div key={item.id}>
                      <Link to={`/sensor/${item.id}`} component={RouterLink} variant="h4">
                          {item.name}
                      </Link>
                  </div>
                  ))}
              </div>
      );
  }
}

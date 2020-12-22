import React, { useEffect, useState } from "react";
import axios from "axios"
import {
    Link as RouterLink,
    useParams,
} from 'react-router-dom';
import Link from '@material-ui/core/Link';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from "@material-ui/core/Typography";

export default function SensorDetail() {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [data, setData] = useState({});
  let { id } = useParams();

  useEffect(() => {
      const apiUrl = `/_/api/v1/sensors/${id}`;
      axios.get(apiUrl).then((result) => {
          setIsLoaded(true);
          setData(result.data);
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
            <Typography component="h1">
                {data.name}
            </Typography>
          
      </div>
    );
  }
}

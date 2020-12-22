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

  const [isDetailsLoaded, setIsDetailsLoaded] = useState(false);
  const [isReadingsLoaded, setIsReadingsLoaded] = useState(false);

  const [details, setDetails] = useState({});
  const [readings, setReadings] = useState([]);

  let { id } = useParams();

  // Load details
  useEffect(() => {
      const apiUrl = `/_/api/v1/sensors/${id}`;
      axios.get(apiUrl).then((result) => {
          setIsDetailsLoaded(true);
          setDetails(result.data);
        }
      )
  }, [id])

  // Load details
  useEffect(() => {
      const apiUrl = `/_/api/v1/sensors/${id}/readings`;
      axios.get(apiUrl).then((result) => {
          setIsReadingsLoaded(true);
          setReadings(result.data);
        }
      )
  }, [id])

  if (error) {
    return <div>Error: {error.message}</div>;
  } else if (!isDetailsLoaded) {
    return <CircularProgress />
  } else {
    return (
        <div>
            <Typography component="h1">
                {details.name}
            </Typography>
        </div>
    );
  }
}

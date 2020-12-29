import React, { useEffect, useState } from "react";
import axios from "axios"
import {
    Link as RouterLink,
    useParams,
} from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Link from "@material-ui/core/Link";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import { ResponsiveLine } from "@nivo/line"

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    height: "50vh",
  },
}));

export default function SensorDetail() {
  const classes = useStyles();
    
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
          setDetails(result.data);
          setIsDetailsLoaded(true);
        }
      )
  }, [id])

  // Load details
  useEffect(() => {
      var dateOffset = (24*60*60*1000) * 14;
      var afterDate = new Date();
      afterDate.setTime(afterDate.getTime() - dateOffset);
      const apiUrl = `/_/api/v1/sensors/${id}/readings?after=${afterDate.toISOString()}`;
      axios.get(apiUrl).then((result) => {
          setReadings(result.data);
          setIsReadingsLoaded(true);
        }
      )
  }, [id])

  let chartData = [
      {
          id: 0,
          data: readings.map((r) => ({
              x: r.timestamp,
              y: r.snow_depth,
          })),
      }
  ];

  if (error) {
    return <div>Error: {error.message}</div>;
  } else if (!isDetailsLoaded || !isReadingsLoaded) {
    return <CircularProgress />
  } else {
    return (
        <div>
            <Typography variant="h3">
                {details.name}
            </Typography>
            <Typography>
                Timestamp: {readings[0].timestamp}
            </Typography>
            <Typography>
                Depth: {readings[0].snow_depth}
            </Typography>
            <Typography>
                Surface Temp: {readings[0].surface_temp}
            </Typography>
            <Typography>
                Ambient Temp: {readings[0].ambient_temp}
            </Typography>
            <Typography>
                Head Temp: {readings[0].head_temp}
            </Typography>
            <div className={classes.chartContainer}>
                <ResponsiveLine
                data={chartData}
                margin={{ top: 50, right: 160, bottom: 50, left: 60 }}
                xScale={{ format: "%Y-%m-%dT%H:%M:%S%Z", type: "time" }}
                xFormat="time:%Y-%m-%d"
                yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                }}
                axisTop={null}
                axisBottom={{
                    format: "%Y-%m-%d %H:%M",
                    tickValues: 5,
                }}
                axisLeft={{
                    tickValues: 5,
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    format: ".2",
                    legend: "Snow Depth",
                    legendOffset: -40,
                    legendPosition: "middle"
                }}
                />
            </div>
        </div>
    );
  }
}

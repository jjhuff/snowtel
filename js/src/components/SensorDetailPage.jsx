import React, { useEffect, useState, useRef } from "react";
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

import CurrentReading from "./CurrentReading.jsx";
import TimeRangePicker from "./TimeRangePicker.jsx";
import units from "../units.js";

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    height: "50vh",
  },
  timePicker: {
      display: "flex",
      justifyContent: "flex-end",
  }
}));

async function fetchReadings(id, after){
    const apiUrl = `/_/api/v1/sensors/${id}/readings?after=${after}`;
    const result = await axios.get(apiUrl);
    return result.data
}

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function SensorDetailPage() {
  const classes = useStyles();
    
  const [error, setError] = useState(null);

  const [isDetailsLoaded, setIsDetailsLoaded] = useState(false);
  const [isReadingsLoaded, setIsReadingsLoaded] = useState(false);

  const [details, setDetails] = useState({});
  const [readings, setReadings] = useState([]);

  const [timeRange, setTimeRange] = useState(7*24);

  const curUnits = units.imperial;
  const refreshInterval = 5*60;

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

  // Load readings
  useEffect(() => {
      let ignore = false

      const dateOffset = (60*60*1000) * timeRange;
      let afterDate = new Date();
      afterDate.setTime(afterDate.getTime() - dateOffset)
      afterDate.setSeconds(0);
      afterDate.setMilliseconds(0);

      fetchReadings(id, afterDate.toISOString()).then( (newReadings) => {
          if (!ignore) {
              setReadings(newReadings);
              setIsReadingsLoaded(true);
          }
      })

  }, [id, timeRange])

  useInterval(() =>{
      if (readings.length === 0) {
          return
      }
      fetchReadings(id, readings[0].timestamp).then((newReadings) => {
          if (newReadings.length > 0) {
              setReadings([...newReadings, ...readings]);
          }
      })
  }, refreshInterval*1000);

  let depthChartData = [
      {
          id: "Depth",
          data: readings.map((r) => ({
              x: r.timestamp.substr(0, 19),
              y: curUnits.dist.convert(r.snow_depth),
          })),
      }
  ];

  let tempChartData = [
      {
          id: "Surface",
          data: readings.map((r) => ({
              x: r.timestamp.substr(0, 19),
              y: curUnits.temp.convert(r.surface_temp),
          })),
      },
      {
          id: "Ambient",
          data: readings.map((r) => ({
              x: r.timestamp.substr(0, 19),
              y: curUnits.temp.convert(r.ambient_temp),
          })),
      }
  ];

  const sharedChartProps = {
      margin:{ top: 50, right: 60, bottom: 50, left: 50 },
      curve:"step",
      enablePoints: false,
      isInteractive: false,
      xScale:{
          format: "%Y-%m-%dT%H:%M:%S",
          type: "time"
      },
      xFormat:"time:%Y-%m-%d",
      yScale:{
          type: "linear",
          min: "auto",
          max: "auto",
      },
      axisBottom:{
          format: "%Y-%m-%d %H:%M",
          tickValues: 5,
      },
      legends:[
          {
              anchor: 'top-left',
              direction: 'row',
              justify: false,
              itemHeight: 20,
              itemWidth: 120,
              translateY: -30,
          }
      ],
  }

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
            <CurrentReading reading={readings[0]}/>
            <div className={classes.timePicker}>
                <TimeRangePicker value={timeRange} onChange={setTimeRange}/>
            </div>
            <div className={classes.chartContainer}>
                <ResponsiveLine {...sharedChartProps}
                data={depthChartData}
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
                yScale={{
                    type: "linear",
                    min: "0",
                    max: "auto",
                }}
                />
            </div>
            <div className={classes.chartContainer}>
                <ResponsiveLine {...sharedChartProps}
                data={tempChartData}
                axisLeft={{
                    tickValues: 5,
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    format: ".2",
                    legend: "Temp",
                    legendOffset: -40,
                    legendPosition: "middle"
                }}
                markers={[
                    {
                        axis: 'y',
                        value: curUnits.temp.convert(0),
                        lineStyle: { stroke: '#3030dd', strokeWidth: 2 },
                    }
                ]}
                />
            </div>
        </div>
    );
  }
}

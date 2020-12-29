import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";

import Units from "../Units.jsx"

const useStyles = makeStyles((theme) => ({
}));

export default function CurrentReading(props) {
    const classes = useStyles();
    const cur = props.reading;

    return (
        <React.Fragment>
            <Typography>
                Timestamp: {cur.timestamp}
            </Typography>
            <Typography>
                Depth: <Units.Dist val={cur.snow_depth}/>
            </Typography>
            <Typography>
                Surface Temp: <Units.Temp val={cur.surface_temp}/>
            </Typography>
            <Typography>
                Ambient Temp:  <Units.Temp val={cur.ambient_temp}/>
            </Typography>
            <Typography>
                Head Temp:  <Units.Temp val={cur.head_temp}/>
            </Typography>
        </React.Fragment>
    );
}

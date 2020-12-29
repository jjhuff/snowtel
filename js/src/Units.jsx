import React from "react";
import units from "./units.js";

export function Temp(props) {
    const unit = units.imperial.temp
    let val = props.val;
    if (val === null) {
        return null;
    }

    return (
        <React.Fragment>
            {unit.convert(val)} {unit.unit}
        </React.Fragment>
    )
}

export function Dist(props) {
    const unit = units.imperial.dist
    let val = props.val;
    if (val === null) {
        return null;
    }

    return (
        <React.Fragment>
            {unit.convert(val)} {unit.unit}
        </React.Fragment>
    )
}

export default {
    Temp,
    Dist,
}

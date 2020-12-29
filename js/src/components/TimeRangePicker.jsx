import React, { useEffect, useState } from "react";

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

export default function TimeRangePicker(props) {
    const values = [
        {val: 24, label: "day"},
        {val: 7*24, label: "week"},
        {val: 31*24, label: "month"},
    ]
    return (
        <ToggleButtonGroup exclusive value={props.value} onChange={(e, v)=>{props.onChange(v)}}>
            {
                values.map((v) => (
                    <ToggleButton key={v.val} value={v.val}>
                        {v.label}
                    </ToggleButton>
                ))
            }
        </ToggleButtonGroup>
    )
}

// Constants

// Columns
var TIMESTAMP = 0;
var STATION_TEMP = 1;
var AIR_TEMP = 2;
var SNOW_TEMP = 3;
var SNOW_DEPTH = 4;

//Colors
var SNOW_HEIGHT_COLOR = '#F79F81';
var SNOW_TEMP_COLOR = '#81F79F';
var AIR_TEMP_COLOR = '#81DAF5';
var STATION_TEMP_COLOR = '#8165EC';

var UNITS = {
    metric: {
        temp: {
            format: '##.#\u00B0C',
            convert: function(v){ return v; }
        },
        dist: {
            format: '###.#cm',
            convert: function(v){ return v; }
        }
    },
    imperial: {
        temp: {
            format: '##.#\u00B0F',
            convert: function(v){ if (v!=null) return v*1.8+32; }
        },
        dist: {
            format: '###.#in',
            convert: function(v){ if (v!=null) return v*0.3937; }
        }
    }
}

var selected_units = 'imperial';

function getDataTable(readings) {
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Station Temp');
    data.addColumn('number', 'Air Temp');
    data.addColumn('number', 'Snow Temp');
    data.addColumn('number', 'Snow Depth');

    var depth_filter = new MedianFilter(4);
    var surface_temp_filter = new MeanFilter(4);

    var last_dt =  new Date(readings[0].timestamp);
    for (var i=0; i<readings.length; i++) {
        var r = readings[i];

        var dt = new Date(r.timestamp);

        if( (dt-last_dt)>10*60*1000 ){
            data.addRow([new Date(dt.getTime()-1), null, null, null]);
        }
        var last_dt = dt;

        // Temp readings
        var station_temp = UNITS[selected_units].temp.convert(r.station_temp);
        var air_temp = UNITS[selected_units].temp.convert(r.ambient_temp);
        var surface_temp = UNITS[selected_units].temp.convert(r.surface_temp);
        surface_temp = surface_temp_filter.add(surface_temp);

        // Snow depth
        var d = r.snow_depth;
        var snow_depth;
        if(d>0 || true) {
            d = depth_filter.add(d);
            snow_depth = UNITS[selected_units].dist.convert(d);
        } else {
            depth_filter.add(null);
            snow_depth = null;
        }

        data.addRow([dt, station_temp, air_temp, surface_temp, snow_depth]);
    }
    data.sort(TIMESTAMP);

    // Setup formats
    var date_formatter = new google.visualization.DateFormat({
        pattern: 'MMM d yyyy hh:mm aa'
    });
    date_formatter.format(data, TIMESTAMP);
    var temp_formatter = new google.visualization.NumberFormat({
        pattern: UNITS[selected_units].temp.format
    });
    temp_formatter.format(data, STATION_TEMP);
    temp_formatter.format(data, AIR_TEMP);
    temp_formatter.format(data, SNOW_TEMP);
    var height_formatter = new google.visualization.NumberFormat({
        pattern: UNITS[selected_units].dist.format
    });
    height_formatter.format(data, SNOW_DEPTH);

    return data;
}

function drawVisualization(readings) {

    if (window._dashboard) {
        window._dashboard.clear();
    }
    if (window._chart) {
        window._chart.getChart().clearChart();
    }
    if (window._control) {
        window._control.clear();
    }

    var data = getDataTable(readings);

    var DAY = 24*60*60*1000;

    // Start at the last reading
    var stop_dt = data.getValue(data.getNumberOfRows()-1, TIMESTAMP);
    var start_dt = new Date(stop_dt.getTime() - 7*DAY);
    window._control = new google.visualization.ControlWrapper({
        controlType: 'ChartRangeFilter',
            containerId: 'control',
            options: {
                // Filter by the date axis.
                filterColumnIndex: TIMESTAMP,
                ui: {
                    chartType: 'LineChart',
                    chartOptions: {
                        chartArea: {width: '80%'},
                        hAxis: {baselineColor: 'none'},
                        series: [
                            {color: SNOW_TEMP_COLOR},
                            {color:SNOW_HEIGHT_COLOR}
                        ]
                    },
                    chartView: {
                        columns: [TIMESTAMP, SNOW_TEMP, SNOW_DEPTH]
                    },
                    minRangeSize: 60 * 60 * 1000
                }
            },
            state: {range: {start: start_dt, end: stop_dt}}
    });
     
    // Plot the snow temps and depths
    window._chart = new google.visualization.ChartWrapper({
        chartType: 'LineChart',
        containerId: 'chart',
        options: {
            // Use the same chart area width as the control for axis alignment.
            chartArea: {height: '80%', width: '80%'},
            interpolateNulls: true,
            hAxis: {textPosition: 'out'},
            vAxes: [
                {format: UNITS[selected_units].temp.format},
                {format: UNITS[selected_units].dist.format, minValue: 0, maxValue:20}
            ],
            series: [
                {targetAxisIndex: 0, color: STATION_TEMP_COLOR},
                {targetAxisIndex: 0, color: AIR_TEMP_COLOR},
                {targetAxisIndex: 0, color: SNOW_TEMP_COLOR},
                {targetAxisIndex: 1, color: SNOW_HEIGHT_COLOR}
            ]
        },
       view: {columns: [TIMESTAMP, STATION_TEMP, AIR_TEMP, SNOW_TEMP, SNOW_DEPTH]}
    });

    // Fire up the dashboard
    window._dashboard = new google.visualization.Dashboard(document.getElementById('dashboard'));
    window._dashboard.bind(window._control, window._chart);
    window._dashboard.draw(data);
}

var SNOW_HEIGHT = '#F79F81'
var SNOW_HEIGHT_ADJ = '#C79F81'
var SNOW_TEMP = '#81F79F'
var AIR_TEMP = '#81DAF5'

var UNITS = {
    metric: {
        temp: {
            format: '##.#\u00B0C',
            convert: function(v){ return v }
        },
        dist: {
            format: '###.#cm',
            convert: function(v){ return v }
        }
    },
    imperial: {
        temp: {
            format: '##.#\u00B0F',
            convert: function(v){ return v*1.8+32 }
        },
        dist: {
            format: '###.#in',
            convert: function(v){ return v*0.3937 }
        }
    }
}

var selected_units = 'imperial'

function getDataTable() {
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Air');
    data.addColumn('number', 'Snow Temp');
    data.addColumn('number', 'Snow Depth');

    //var depth_filter = new Filter(6)

    var last_dt =  new Date(readings[0][0]*1000)
    for (i in readings) {
        r = readings[i]

        dt = new Date(r[0]*1000)

        if( (dt-last_dt)>10*60*1000 ){
            data.addRow([new Date(r[0]*1000 - 1), null, null, null])
        }
        last_dt = dt

        // Temp readings
        air_temp = UNITS[selected_units].temp.convert(r[1])
        surface_temp = UNITS[selected_units].temp.convert(r[2])

        // Snow depth
        d = r[3]
        if(d!=null) {
            //d = depth_filter.add(d)
            snow_depth = UNITS[selected_units].dist.convert(d)
        } else {
            //depth_filter.add(null)
            snow_depth = null
        }

        data.addRow([dt, air_temp, surface_temp, snow_depth])
    }
    data.sort(0)

    // Setup formats
    var date_formatter = new google.visualization.DateFormat({
        pattern: 'MMM d yyyy hh:mm aa'
    });
    date_formatter.format(data,0);
    var temp_formatter = new google.visualization.NumberFormat({
        pattern: UNITS[selected_units].temp.format
    });
    temp_formatter.format(data, 1);
    temp_formatter.format(data, 2);
    var height_formatter = new google.visualization.NumberFormat({
        pattern: UNITS[selected_units].dist.format
    });
    height_formatter.format(data, 3);

    return data
}

function drawVisualization() {

    var data = getDataTable()

    var DAY = 24*60*60*1000

    // Start at the last reading
    var stop_dt = data.getValue(data.getNumberOfRows()-1, 0)
    var start_dt = new Date(stop_dt.getTime() - 2*DAY)
    var control = new google.visualization.ControlWrapper({
        'controlType': 'ChartRangeFilter',
            'containerId': 'control',
            'options': {
                // Filter by the date axis.
                'filterColumnIndex': 0,
                'ui': {
                    'chartType': 'LineChart',
                    'chartOptions': {
                        'chartArea': {'width': '80%'},
                        'hAxis': {'baselineColor': 'none'},
                        'series': [{'color': SNOW_TEMP}, {'color':SNOW_HEIGHT}] // airtemp & snow height
                    },
                    'chartView': {
                        'columns': [0, 2, 3]
                    },
                    'minRangeSize': 60 * 60 * 1000
                }
            },
            'state': {'range': {'start': start_dt, 'end': stop_dt}}
    });
     
    // Plot the snow temps and depths
    var chart = new google.visualization.ChartWrapper({
        'chartType': 'LineChart',
        'containerId': 'chart',
        'options': {
            // Use the same chart area width as the control for axis alignment.
            'chartArea': {'height': '80%', 'width': '80%'},
            'hAxis': {'textPosition': 'out'},
            'vAxes': [
                {format: UNITS[selected_units].temp.format},
                {format: UNITS[selected_units].dist.format, minValue: 0, maxValue:12}
            ],
            'series': [
                {targetAxisIndex: 0, color: SNOW_TEMP},
                {targetAxisIndex: 1, color: SNOW_HEIGHT}]
        },
       'view': {'columns': [0,2,3]}
    });

    // Fire up the dashboard
    var dashboard = new google.visualization.Dashboard(document.getElementById('dashboard'));
    dashboard.bind(control, chart);
    dashboard.draw(data);
}

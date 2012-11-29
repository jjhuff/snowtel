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
    data.addColumn('number', 'Surface');
    data.addColumn('number', 'Snow Depth');

    var depth_filter = new Filter(6)
    var adj_depth_filter = new Filter(6)
    for (i in readings) {
        readings[i][0] = new Date(readings[i][0]*1000)

        // Temp readings
        readings[i][1] = UNITS[selected_units].temp.convert(readings[i][1])
        readings[i][2] = UNITS[selected_units].temp.convert(readings[i][2])

        // Snow depth
        d = readings[i][3] || 0
        //d = depth_filter.add(d)
        readings[i][3] = UNITS[selected_units].dist.convert(d)

    }
    data.addRows(readings)
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

    // Start at the last reading
    var stop_dt = data.getValue(data.getNumberOfRows()-1, 0)
    var start_dt = new Date(stop_dt.getTime() - (24*60*60*1000));
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
                    'series': [{'color': AIR_TEMP}, {'color':SNOW_HEIGHT}] // airtemp & snow height
                },
                'chartView': {
                    'columns': [0, 1, 3]
                },
                'minRangeSize': 60 * 60 * 1000
                }
            },
            'state': {'range': {'start': start_dt, 'end': stop_dt}}
    });
     
    // Plot the snow temps 
    var temp_chart = new google.visualization.ChartWrapper({
        'chartType': 'LineChart',
        'containerId': 'temp_chart',
        'options': {
            // Use the same chart area width as the control for axis alignment.
            'chartArea': {'height': '95%', 'width': '80%'},
            'hAxis': {'textPosition': 'none'},
            'vAxis': {'format': UNITS[selected_units].temp.format},
            'series': [{'color': AIR_TEMP}, {'color':SNOW_TEMP}]
        },
       'view': {'columns': [0,1,2]}
    });

    // Plot the snow heights
    var snow_chart = new google.visualization.ChartWrapper({
        'chartType': 'LineChart',
        'containerId': 'snow_chart',
        'options': {
            // Use the same chart area width as the control for axis alignment.
            'chartArea': {'height': '95%', 'width': '80%'},
            'hAxis': {'textPosition': 'in'},
            'vAxis': {'format': UNITS[selected_units].dist.format},
            'series': [{'color': SNOW_HEIGHT}, {'color':SNOW_HEIGHT_ADJ}]
        },
        'view': {'columns': [0,3]}
    });


    // Fire up the dashboard
    var dashboard = new google.visualization.Dashboard(document.getElementById('dashboard'));
    dashboard.bind(control, temp_chart);
    dashboard.bind(control, snow_chart);
    dashboard.draw(data);
}

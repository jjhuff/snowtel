export default  {
/*    metric: {
        temp: {
            format: '##.#\u00B0C',
            convert: function(v){ return v; }
        },
        dist: {
            format: '###.#cm',
            convert: function(v){ return v; }
        }
    },*/
    imperial: {
        temp: {
            unit: '\u00B0F',
            convert: (v) => (v*1.8+32).toFixed(1),
        },
        dist: {
            unit: "in",
            convert: (v) => (v*0.3937).toFixed(1),
        }
    }
}


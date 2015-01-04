function MeanFilter(size) {
    return {
        _values: [],

        add: function(val) {
            if( val != null ) {
                if( this._values.push(val) > size) {
                    this._values.shift();
                }
            } else {
                if( this._values.length > 0 ) {
                    this._values.shift();
                }
            }

            var sum = 0;
            for (var i in this._values) {
                sum += this._values[i];
            }
            return sum/this._values.length;
        }
    }
}

function MedianFilter(size) {
    function median(values) {
        values = values.slice(0);
        values.sort();
        var half = Math.floor(values.length/2);
        if(values.length % 2)
            return values[half];
        else
            return (values[half-1] + values[half]) / 2.0;
    }

    return {
        _values: [],

        add: function(val) {
            if( val != null ) {
                if( this._values.push(val) > size) {
                    this._values.shift();
                }
            } else {
                if( this._values.length > 0 ) {
                    this._values.shift();
                }
            }

            return median(this._values);
        }
    }
}

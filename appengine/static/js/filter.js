function Filter(size) {
    return {
        _values: [],

        add: function(val) {
            if( this._values.push(val) > size)
                this._values.shift()

            var sum = 0
            for (var i in this._values)
                sum += this._values[i]

            return sum/this._values.length
        }
    }
}


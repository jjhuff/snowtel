function Filter(size) {
    return {
        _values: [],

        add: function(val) {
            if( val != null ) {
                if( this._values.push(val) > size)
                    this._values.shift()
            } else {
                if( this._values.length > 0 ) {
                    this._values.shift()
                }
            }

            if (this._values.length != size)
                    console.log(this._values)

            var sum = 0
            for (var i in this._values)
                sum += this._values[i]

            return sum/this._values.length
        }
    }
}


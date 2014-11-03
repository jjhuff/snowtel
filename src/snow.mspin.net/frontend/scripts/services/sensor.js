'use strict';

angular.module('app')
.factory('Sensor', ['$resource', function($resource){
    var SensorResource = $resource('/_/api/v1/sensors/:id/:collection', {id:'@id'}, {
        'get': { method: "GET" },
        'query':  { method:'GET', isArray:true},
    });

    return SensorResource;
}]);


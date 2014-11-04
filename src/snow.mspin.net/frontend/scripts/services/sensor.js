'use strict';

angular.module('app').factory('Sensor', ['$resource', function($resource){
    var SensorResource = $resource('/_/api/v1/sensors/:id', {id:'@id'}, {
        'get': { method: "GET" },
        'query':  { method:'GET', isArray:true},
    });
    return SensorResource;
}]);

angular.module('app').factory('Readings', ['$resource', function($resource){
    var ReadingsResource = $resource('/_/api/v1/sensors/:id/readings', {id:'@id'}, {
        'get':  { method:'GET', isArray:true},
    });

    return ReadingsResource;
}]);

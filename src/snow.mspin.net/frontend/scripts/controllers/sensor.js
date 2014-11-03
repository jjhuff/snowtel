'use strict';

angular.module('app')
  .controller('SensorCtrl', ['$scope', '$stateParams', '$q', 'Sensor', function ($scope, $stateParams, $q, Sensor) {
    google.load('visualization', '1.0', {packages: ['corechart', 'controls']});

    $scope.sensor = Sensor.get({id:$stateParams.id});
    $scope.readings = Sensor.query({id:$stateParams.id, collection:'readings'});
    $scope.readings.$promise.then(function(readings){
        if (readings && readings.length>0) {
            $scope.current = readings[0];
        }
        window.drawVisualization($scope.readings)
    });

  }]);

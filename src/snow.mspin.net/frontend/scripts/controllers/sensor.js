'use strict';

angular.module('app')
.controller('SensorCtrl', ['$scope', '$stateParams', '$q', '$interval', 'Sensor', 'Readings', function ($scope, $stateParams, $q, $interval, Sensor, Readings) {
    var stop;

    google.load('visualization', '1.0', {packages: ['corechart', 'controls']});

    $scope.sensor = Sensor.get({id:$stateParams.id});
    $scope.readings = []

    function update(){
        if ($scope.sensor.webcam_url) {
            $scope.webcam_url = $scope.sensor.webcam_url + "?cb=" + Math.random();
        }
        var readings = $scope.readings;
        if (readings.length>0) {
            $scope.current = readings[0];
            window.drawVisualization($scope.readings)
        }
    };

    function refresh() {
        if ($scope.readings.length>0) {
            Readings.get({
                id:$stateParams.id,
                after:$scope.current.timestamp
            }).$promise.then(function(new_readings){
                $scope.readings = new_readings.concat($scope.readings);
                update();
            });
        } else {
            $scope.readings = Readings.get({id:$stateParams.id});
            $scope.readings.$promise.then(update);
        }
    }

    stop = $interval(function() {
        refresh();
    }, 60*1000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(stop)) {
            $interval.cancel(stop);
            stop = undefined;
        }
    });

    refresh();
}]);

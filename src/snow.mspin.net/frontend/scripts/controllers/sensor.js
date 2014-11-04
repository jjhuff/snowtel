'use strict';

angular.module('app')
.controller('SensorCtrl', ['$scope', '$stateParams', '$q', '$interval', 'Sensor', 'Readings', function ($scope, $stateParams, $q, $interval, Sensor, Readings) {
    var stop;

    google.load('visualization', '1.0', {packages: ['corechart', 'controls']});

    $scope.sensor = Sensor.get({id:$stateParams.id});

    function refresh() {
        $scope.readings = Readings.get({id:$stateParams.id});
        $scope.readings.$promise.then(function(readings){
            if (readings && readings.length>0) {
                $scope.current = readings[0];
            }
            window.drawVisualization($scope.readings)
        });
    }

    stop = $interval(function() {
        console.log("refresh");
        refresh();
    }, 5*60*1000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(stop)) {
            $interval.cancel(stop);
            stop = undefined;
        }
    });

    refresh();
}]);

'use strict';

angular.module('app')
  .controller('MainCtrl', ['$scope', 'Sensor', function ($scope, Sensor) {

    $scope.sensors = Sensor.query();
  }]);

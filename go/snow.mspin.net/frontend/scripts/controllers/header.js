'use strict';

angular.module('app')
    .controller('HeaderCtrl', ['$scope', '$location', 'Config', function ($scope, $location, Config) {
        $scope.config = Config;
        $scope.isActive = function (path) {
            return path === $location.path();
        };
        $scope.isActivePrefix = function (prefix) {
            return $location.path().indexOf(prefix) === 0;
        };

    }]);

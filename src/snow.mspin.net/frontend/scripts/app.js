'use strict';

var app = angular.module('app', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.bootstrap',
  'ui.router',
  'cgBusy'
]);

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
    $urlRouterProvider.otherwise("/");
    $stateProvider
    .state("main", {
        url: "/",
        templateUrl: "/_/views/main.html",
    })
    .state("sensor", {
        url: "/sensor/:id",
        templateUrl: "/_/views/sensor.html",
    })
}]);


app.filter('encodeUri', ['$window', function ($window) {
    return $window.encodeURIComponent;
}]);

angular.module('app').value('cgBusyDefaults',{
    templateUrl: '/_/views/angular-busy.html',
    delay: 500,
    minDuration: 500,
});

// Process analytics pageviews
app.run(['$rootScope', '$location', function ($rootScope, $location) {
    $rootScope.$on('$viewContentLoaded', function(){
        ga('send', 'pageview', $location.path());
    });
}]);

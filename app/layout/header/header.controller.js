angular.module('myApp')
  app.controller('headerController', function($scope, $location){
        $scope.goDashboard = function() {
    $location.path('/dashboard/home');
        };
  });

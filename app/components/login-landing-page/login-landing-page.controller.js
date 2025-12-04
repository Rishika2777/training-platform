angular.module('myApp')
.controller('loginLandingPageController', ['$scope', '$location', function($scope, $location) {

    $scope.goToLogin = function() {
        $location.path('/login');
    };

    $scope.goToRegister = function() {
        $location.path('/register');
    };

     $scope.goToRegisterOptions = function() {
        $location.path('/register-options');
    };

}]);

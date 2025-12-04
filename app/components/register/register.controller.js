app.controller("registerController", function($scope, $location) {

    $scope.createAccount = function () {
         $location.path('/register-options');
    };

    $scope.goLogin = function () {
        $location.path("/login");
    };

});

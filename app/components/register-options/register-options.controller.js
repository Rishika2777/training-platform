app.controller("registerOptionsController", function ($scope, $location) {

    $scope.goLogin = function () {
        $location.path("/login");
    };

    $scope.goCampus = function () {
        $location.path("/register-campus");
    };

    $scope.goStudent = function () {
        $location.path("/register-student");
    };

    $scope.goCompany = function () {
        $location.path("/register-company");
    };

});

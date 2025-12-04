app.controller("loginController" , function($scope,$location){

    $scope.login = {};

      $scope.signIn = function () {
        if ($scope.login.email && $scope.login.password) {
            // You can add API check here later...
            $location.path("/dashboard/home");
        } else {
            alert("Please enter email & password");
        }
    };

    $scope.goRegister = function() {
        $location.path("/register");
    };



    $scope.forgotPassword = function () {
        alert("Forgot password clicked!");
    };
    
})
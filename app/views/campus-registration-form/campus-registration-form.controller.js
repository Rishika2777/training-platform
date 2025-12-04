app.controller("campusRegistrationFormController", function($scope) {

    $scope.campus = {};

    $scope.submitCampus = function () {
        console.log("Campus Submitted:", $scope.campus);
        alert("Campus Registration Submitted Successfully!");
    };

});

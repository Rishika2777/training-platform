app.controller("courseOfferFormCtrl", function ($scope) {

    $scope.course = {};

    $scope.closeForm = function () {
        alert("Close button clicked!");
    };

    $scope.submitCourse = function () {
        console.log("Course Data:", $scope.course);
        alert("Course submitted successfully!");
    };

});

angular.module('myApp')
  app.controller('dashboardController', function($scope) {
  $scope.title = "Dashboard Home";

   $scope.openCourseForm = function() {
        $location.path('/course-offer-form'); // navigate to Add Course form
    };

    

});


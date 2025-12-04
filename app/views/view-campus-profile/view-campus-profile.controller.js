angular.module('campusApp')
.controller('viewCampusProfileController', function($scope, $location, $routeParams) {

    let id = $routeParams.id;

    // Dummy data (same data as your adminCampusController)
    $scope.campuses = [
        { 
            name: "Mangalore University", 
            rank: "A+", 
            adminName: "Ankith Shenoy",
            adminEmail: "Ankith@mlore.com",
            phone: "+91 6895493823",
            dept: "CS",
            designation: "HOD",
            website: "www.mloreuniversity.com",
            otherUrl: "",
            about: "",
            address: "Mangalore University, 574 199, Karnataka State, India",
            tagline: "",
            research: "",
            image: "assets/images/campus-register.png"
        }
    ];
 $scope.viewCampus = function() {
        $location.path('/view-campus-profile'); // navigate to Add Course form
    };

});

var app = angular.module("campusApp", ["ngRoute"]);

app.config(function ($routeProvider,$locationProvider) {

     $locationProvider.hashPrefix('');

    $routeProvider
//   .when('/', {
//         templateUrl: 'app/components/login-landing-page/login-landing-page.html',
//         controller: 'loginLandingPageController'
//     }) 

        .when("/login", {
            templateUrl: "app/components/login/login.html",
            controller: "loginController"
        })
        .when("/register", {
            templateUrl: "app/components/register/register.html",
            controller: "registerController"
        })
        .when("/register-options", {
            templateUrl: "app/components/register-options/register-options.html",
            controller: "registerOptionsController"
        })
        .when("/dashboard",{
            templateUrl : 'app/layout/layout.html',
            controller:"dashboardLayoutController"
        })
        .when("/dashboard/home",{
            templateUrl:"app/components/dashboard/dashboard.html",
            controller: 'dashboardController'
        })
    
        .when("/course-offer-form",{
            templateUrl:"app/views/courseOffer/course-offer-form.html",
            controller:"courseOfferFormCtrl"
        })
        .when("/admin-campus",{
            templateUrl:"app/components/admin-campus/admin-campus.html",
            controller:"adminCampusController"
        })
        .when("/campus-registration-form",{
            templateUrl:"app/views/campus-registration-form/campus-registration-form.html",
            controller:"campusRegistrationFormController"
        })
        .when("/view-campus-profile/:id",{
            templateUrl:"app/views/view-campus-profile/view-campus-profile.html",
            controller:"viewCampusProfileController"
        })
      
        .otherwise({
            redirectTo: "/login"
        });

});

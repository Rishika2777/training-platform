app.controller('dashboardLayoutController', function($scope, $location) {
    if ($location.path() === '/dashboard') {
        $location.path('/dashboard/home');
    }
});

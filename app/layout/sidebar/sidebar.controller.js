app.controller('sidebarController', function($scope, $location) {
  $scope.isActive = function(path) {
    return $location.path().startsWith(path);
  };
});

/**
 * Student Management Controller
 * Handles student listing, viewing, and deletion
 */
angular.module('campusApp.admin').controller('StudentManagementController', [
    '$scope',
    'AdminService',
    'MOCK_ADMIN_DATA',
    function ($scope, AdminService, MOCK_ADMIN_DATA) {
        $scope.students = [];
        $scope.currentPage = 1;
        $scope.totalPages = 1;
        $scope.pageSize = 9;
        $scope.loading = false;

        $scope.loadStudents = function (page) {
            $scope.loading = true;
            const params = {
                page: page || $scope.currentPage,
                limit: $scope.pageSize
            };

            AdminService.getStudents(params)
                .then(function (response) {
                    $scope.students = response.data || response || [];
                    $scope.totalPages =
                        response.totalPages ||
                        Math.ceil($scope.students.length / $scope.pageSize) ||
                        1;
                    $scope.loading = false;
                })
                .catch(function (error) {
                    console.error('Error loading students:', error);
                    // Use mock data when API fails
                    const mockResponse = MOCK_ADMIN_DATA.getStudents(params);
                    $scope.students = mockResponse.data || [];
                    $scope.totalPages = mockResponse.totalPages || 1;
                    $scope.loading = false;
                });
        };

        $scope.viewStudent = function (student) {
            // Navigate to student detail view
            // eslint-disable-next-line no-console
            console.log('View student:', student);
        };

        $scope.deleteStudent = function (student) {
            if (
                // eslint-disable-next-line no-alert
                confirm('Are you sure you want to delete ' + (student.name || 'this student') + '?')
            ) {
                AdminService.deleteStudent(student.id)
                    .then(function () {
                        $scope.loadStudents();
                    })
                    .catch(function (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error deleting student:', error);
                        // eslint-disable-next-line no-alert
                        alert('Failed to delete student');
                    });
            }
        };

        $scope.onPageChange = function (page) {
            $scope.currentPage = page;
            $scope.loadStudents(page);
        };

        $scope.openAddStudentModal = function () {
            // TODO: Open modal to add new student
            // eslint-disable-next-line no-console
            console.log('Open add student modal');
        };

        $scope.loadStudents();
    }
]);

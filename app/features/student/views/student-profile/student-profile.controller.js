/**
 * Student Profile Controller
 * Handles "Get to Know Me" page for STUDENT role
 */
angular.module('campusApp.student').controller('StudentProfileController', [
    '$scope',
    'AuthService',
    function ($scope, AuthService) {
        'use strict';

        function setSidebarSlots() {
            $scope.sidebarSlots = {
                profileTemplateUrl:
                    'app/features/student/views/sidebar/student-sidebar-profile.html',
                afterMenuTemplateUrl:
                    'app/features/student/views/sidebar/student-sidebar-after-menu.html'
            };
        }

        setSidebarSlots();

        $scope.loading = false;
        $scope.profileData = null;

        function calculateTotalPages(itemCount, pageSize) {
            if (!pageSize || pageSize <= 0) {
                return 1;
            }
            return Math.max(1, Math.ceil(itemCount / pageSize));
        }

        function normalizePage(currentPage, totalPages) {
            const page = parseInt(currentPage, 10);
            if (!Number.isFinite(page) || page <= 0) {
                return 1;
            }
            return Math.min(page, totalPages);
        }

        // Batchmates data
        $scope.batchmates = [
            { id: 'CS001', name: 'Name', image: null },
            { id: 'CS002', name: 'Name', image: null },
            { id: 'CS003', name: 'Name', image: null },
            { id: 'CS004', name: 'Name', image: null },
            { id: 'CS005', name: 'Name', image: null },
            { id: 'CS006', name: 'Name', image: null },
            { id: 'CS007', name: 'Name', image: null },
            { id: 'CS008', name: 'Name', image: null },
            { id: 'CS009', name: 'Name', image: null },
            { id: 'CS010', name: 'Name', image: null },
            { id: 'CS011', name: 'Name', image: null },
            { id: 'CS012', name: 'Name', image: null },
            { id: 'CS013', name: 'Name', image: null },
            { id: 'CS014', name: 'Name', image: null },
            { id: 'CS015', name: 'Name', image: null },
            { id: 'CS016', name: 'Name', image: null }
        ];

        $scope.batchmatesPageSize = 8;
        $scope.batchmatesPage = 1;
        $scope.batchmatesTotalPages = calculateTotalPages(
            $scope.batchmates.length,
            $scope.batchmatesPageSize
        );
        $scope.onBatchmatesPageChange = function (page) {
            $scope.batchmatesTotalPages = calculateTotalPages(
                $scope.batchmates.length,
                $scope.batchmatesPageSize
            );
            $scope.batchmatesPage = normalizePage(page, $scope.batchmatesTotalPages);
        };

        // Knowledge Base data for bar chart
        $scope.knowledgeBase = [
            { name: 'Python', percentage: 85, color: '#9B59B6' },
            { name: 'HTML/CSS', percentage: 90, color: '#FF6B35' },
            { name: 'Java', percentage: 75, color: '#2ECC71' },
            { name: 'React.js', percentage: 80, color: '#3498DB' },
            { name: 'UI', percentage: 70, color: '#9B59B6' },
            { name: 'SQL', percentage: 65, color: '#E74C3C' }
        ];

        // Projects data
        $scope.projects = [
            {
                title: 'E-Commerce Website',
                description: [
                    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
                    'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages.'
                ],
                technologies: [
                    { name: 'HTML', icon: 'assets/images/tech/html.png' },
                    { name: 'CSS', icon: 'assets/images/tech/css.png' },
                    { name: 'JS', icon: 'assets/images/tech/js.png' },
                    { name: 'Node.js', icon: 'assets/images/tech/nodejs.png' },
                    { name: 'React', icon: 'assets/images/tech/react.png' },
                    { name: 'MongoDB', icon: 'assets/images/tech/mongodb.png' }
                ]
            },
            {
                title: 'E-Commerce Website',
                description: [
                    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
                    'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages.'
                ],
                technologies: [
                    { name: 'HTML', icon: 'assets/images/tech/html.png' },
                    { name: 'CSS', icon: 'assets/images/tech/css.png' },
                    { name: 'JS', icon: 'assets/images/tech/js.png' },
                    { name: 'Node.js', icon: 'assets/images/tech/nodejs.png' },
                    { name: 'React', icon: 'assets/images/tech/react.png' },
                    { name: 'MongoDB', icon: 'assets/images/tech/mongodb.png' }
                ]
            }
        ];

        // Alumni data
        $scope.alumni = [
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null },
            { name: 'Name', designation: 'Designation', company: 'Company', image: null }
        ];

        $scope.alumniPageSize = 6;
        $scope.alumniPage = 1;
        $scope.alumniTotalPages = calculateTotalPages($scope.alumni.length, $scope.alumniPageSize);
        $scope.onAlumniPageChange = function (page) {
            $scope.alumniTotalPages = calculateTotalPages(
                $scope.alumni.length,
                $scope.alumniPageSize
            );
            $scope.alumniPage = normalizePage(page, $scope.alumniTotalPages);
        };

        // Testimonial data
        $scope.currentTestimonial = {
            name: 'Shreya Rao',
            image: null,
            quote: 'A dedicated and proactive student who consistently strives for excellence in academics and extracurricular activities.'
        };

        // Feedback form data
        $scope.feedbackForm = {
            name: '',
            message: ''
        };

        function loadProfileData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.profileData = {
                    name: currentUser.name || 'Ankitha Willson',
                    studentId: currentUser.profile.studentId,
                    email: currentUser.email,
                    phone: currentUser.profile.phone,
                    course: currentUser.profile.course,
                    batch: currentUser.profile.batch,
                    campusId: currentUser.profile.campusId,
                    rank: currentUser.profile.rank || 'Rank #1',
                    campusName: currentUser.profile.campusName || 'Campus Name'
                };
            }

            $scope.loading = false;
        }

        $scope.submitFeedback = function () {
            // TODO: Implement feedback submission
            // Reset form
            $scope.feedbackForm = {
                name: '',
                message: ''
            };
        };

        loadProfileData();
    }
]);

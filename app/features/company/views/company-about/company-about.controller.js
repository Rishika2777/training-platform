/**
 * Company About Controller
 * Handles company about page for COMPANY role
 */
angular.module('campusApp.company').controller('CompanyAboutController', [
    '$scope',
    'AuthService',
    function ($scope, AuthService) {
        'use strict';

        function setSidebarSlots() {
            $scope.sidebarSlots = {
                profileTemplateUrl:
                    'app/features/company/views/sidebar/company-sidebar-profile.html',
                afterMenuTemplateUrl:
                    'app/features/company/views/sidebar/company-sidebar-after-menu.html'
            };
        }

        setSidebarSlots();

        $scope.loading = false;
        $scope.companyData = null;

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

        // Target Campuses data
        $scope.targetCampuses = [
            { name: 'Campus Name', image: 'assets/images/campus-placeholder.jpg' },
            { name: 'Campus Name', image: 'assets/images/campus-placeholder.jpg' },
            { name: 'Campus Name', image: 'assets/images/campus-placeholder.jpg' },
            { name: 'Campus Name', image: 'assets/images/campus-placeholder.jpg' },
            { name: 'Campus Name', image: 'assets/images/campus-placeholder.jpg' }
        ];

        // Featured Team Member
        $scope.featuredMember = {
            name: 'Ankitha Willson',
            designation: 'CEO',
            image: null
        };

        // Team Members data
        $scope.teamMembers = [
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null },
            { name: 'Name', designation: 'Designation', image: null }
        ];

        $scope.teamMembersPageSize = 6;
        $scope.teamMembersPage = 1;
        $scope.teamMembersTotalPages = calculateTotalPages(
            $scope.teamMembers.length,
            $scope.teamMembersPageSize
        );
        $scope.onTeamMembersPageChange = function (page) {
            $scope.teamMembersTotalPages = calculateTotalPages(
                $scope.teamMembers.length,
                $scope.teamMembersPageSize
            );
            $scope.teamMembersPage = normalizePage(page, $scope.teamMembersTotalPages);
        };

        // Salary Range data
        $scope.salaryRange = [
            { active: false },
            { active: false },
            { active: true },
            { active: false },
            { active: false },
            { active: false }
        ];

        // Benefits List
        $scope.benefitsList = [
            { name: 'Performance Bonus', icon: 'fa-chart-bar', expanded: false },
            { name: 'Healthcare', icon: 'fa-heart', expanded: false },
            { name: 'Mentor Buddy System', icon: 'fa-users', expanded: false },
            { name: 'Work Life Balance Perks', icon: 'fa-balance-scale', expanded: false },
            { name: 'Appreciation Day Off', icon: 'fa-check-square', expanded: false },
            { name: 'Training & Upskilling', icon: 'fa-book', expanded: false },
            { name: 'Sick Leaves', icon: 'fa-plus-circle', expanded: false },
            { name: 'New Employee Referral Bonus', icon: 'fa-user-plus', expanded: false }
        ];

        // Clients data
        $scope.clients = [
            { name: 'Client 1', logo: null },
            { name: 'Client 2', logo: null },
            { name: 'Client 3', logo: null },
            { name: 'Client 4', logo: null },
            { name: 'Client 5', logo: null },
            { name: 'Client 6', logo: null },
            { name: 'Client 7', logo: null },
            { name: 'Client 8', logo: null }
        ];

        $scope.clientsPageSize = 8;
        $scope.clientsPage = 1;
        $scope.clientsTotalPages = calculateTotalPages(
            $scope.clients.length,
            $scope.clientsPageSize
        );
        $scope.onClientsPageChange = function (page) {
            $scope.clientsTotalPages = calculateTotalPages(
                $scope.clients.length,
                $scope.clientsPageSize
            );
            $scope.clientsPage = normalizePage(page, $scope.clientsTotalPages);
        };

        // Testimonial data
        $scope.currentTestimonial = {
            name: 'Ankita Willson',
            image: null,
            quote: "I'm grateful for the opportunities and resources provided by the company. It's made a huge difference in my journey."
        };

        // Contact Information
        $scope.contactInfo = {
            email: 'clavrit@gmail.com',
            phone: '+91 897-876-9087',
            address: '123, 1st Main Road, 3rd Phase, JP Nagar, Bangalore - 560078'
        };

        // Feedback form data
        $scope.feedbackForm = {
            name: '',
            message: ''
        };

        function loadCompanyData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.companyData = {
                    name: currentUser.profile.companyName || 'Company Name',
                    companyId: currentUser.profile.companyId,
                    description: 'Information about the company...',
                    website: '',
                    contact: currentUser.profile.phone || '',
                    foundedYear: '',
                    employeeCount: ''
                };
            } else {
                $scope.companyData = {
                    name: 'Company Name',
                    companyId: '',
                    description: '',
                    website: '',
                    contact: '',
                    foundedYear: '',
                    employeeCount: ''
                };
            }

            $scope.loading = false;
        }

        $scope.toggleBenefit = function (benefit) {
            benefit.expanded = !benefit.expanded;
        };

        $scope.submitFeedback = function () {
            // TODO: Implement feedback submission
            console.log('Submitting feedback:', $scope.feedbackForm);
            // Reset form
            $scope.feedbackForm = {
                name: '',
                message: ''
            };
        };

        loadCompanyData();
    }
]);

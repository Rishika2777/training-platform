/**
 * Student Home Controller
 * Handles student home/dashboard page for STUDENT role
 */
angular.module('campusApp.student').controller('StudentHomeController', [
    '$scope',
    '$rootScope',
    '$timeout',
    '$window',
    'AuthService',
    function ($scope, $rootScope, $timeout, $window, AuthService) {
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
        $scope.studentData = null;
        $scope.myBatchmates = [];
        $scope.placedStudents = [];
        $scope.registeredCompanies = [];
        $scope.alumni = [];
        $scope.posts = [];
        $scope.myBatchmatesCarousel = { currentPage: 1, totalPages: 6 };
        $scope.placedStudentsCarousel = { currentPage: 1, totalPages: 6 };
        $scope.alumniCarousel = { currentPage: 1, totalPages: 6 };

        // Modal visibility flags
        $scope.showCareerCheckinModal = false;
        $scope.showResumeUploadModal = false;
        $scope.showCertificationsModal = false;
        $scope.showDreamJobToolkitModal = false;

        // Career check-in form data
        $scope.careerForm = {
            companyName: '',
            jobTitle: '',
            startDate: '',
            endDate: '',
            currentlyWorking: false,
            recnHelped: false
        };

        // Job title options
        $scope.jobTitleOptions = [
            { value: 'software-engineer', label: 'Software Engineer' },
            { value: 'frontend-developer', label: 'Frontend Developer' },
            { value: 'backend-developer', label: 'Backend Developer' },
            { value: 'fullstack-developer', label: 'Full Stack Developer' },
            { value: 'data-scientist', label: 'Data Scientist' },
            { value: 'product-manager', label: 'Product Manager' }
        ];

        // Resume upload form data
        $scope.resumeFile = null;

        // Certifications data
        $scope.certifications = [
            { id: 1, name: 'UI/UX' },
            { id: 2, name: 'Course Name' },
            { id: 3, name: 'Course Name' },
            { id: 4, name: 'Course Name' },
            { id: 5, name: 'Course Name' },
            { id: 6, name: 'Course Name' },
            { id: 7, name: 'Course Name' },
            { id: 8, name: 'Course Name' }
        ];
        $scope.selectedCertification = null;

        // Dream Job Toolkit items
        $scope.toolkitItems = [
            { id: 1, label: 'Resume & Cover Letter Resources', action: 'resume' },
            { id: 2, label: 'Interview Preparation', action: 'interview' },
            { id: 3, label: 'Job Search Strategy', action: 'job-search' },
            { id: 4, label: 'Skill Development Tools', action: 'skills' },
            { id: 5, label: 'Skill Roadmap to Your Dream Job', action: 'roadmap' }
        ];

        // Set up modal event listener IMMEDIATELY
        const modalListener = $rootScope.$on('openModal', function (event, modalId) {
            // Use $evalAsync to ensure we're in the right phase
            $scope.$evalAsync(function () {
                if (modalId === 'student-career-checkin') {
                    initializeCareerForm();
                    $scope.showCareerCheckinModal = true;
                } else if (modalId === 'student-resume' || modalId === 'student-resume-upload') {
                    initializeResumeForm();
                    $scope.showResumeUploadModal = true;
                } else if (
                    modalId === 'student-certifications' ||
                    modalId === 'student-learning-pathway'
                ) {
                    $scope.showCertificationsModal = true;
                } else if (modalId === 'student-dream-job-toolkit') {
                    $scope.showDreamJobToolkitModal = true;
                }
            });
        });

        // Clean up listener
        $scope.$on('$destroy', function () {
            modalListener();
        });

        function loadStudentData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.studentData = {
                    name: currentUser.name,
                    studentId: currentUser.profile.studentId,
                    rank: 'Rank #1'
                };
            }

            // TODO: Load from API
            $scope.myBatchmates = [
                { id: 1, name: 'Name(Cs)', avatar: '' },
                { id: 2, name: 'Name(Cs)', avatar: '' },
                { id: 3, name: 'Name(Cs)', avatar: '' },
                { id: 4, name: 'Name(Cs)', avatar: '' },
                { id: 5, name: 'Name(Cs)', avatar: '' }
            ];

            $scope.placedStudents = [
                { id: 1, name: 'Name', batch: '2023', company: 'Tech Corp', avatar: '' },
                { id: 2, name: 'Name', batch: '2023', company: 'Web Solutions', avatar: '' },
                { id: 3, name: 'Name', batch: '2024', company: 'StartupXYZ', avatar: '' }
            ];

            $scope.registeredCompanies = [];

            $scope.alumni = [
                { id: 1, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' },
                { id: 2, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' },
                { id: 3, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' }
            ];

            $scope.posts = [
                {
                    id: 1,
                    author: 'Ankitha Wilson',
                    timeAgo: '1d',
                    image: 'campus.jpg',
                    text: "Campus life isn't just about lectures and exams—it's about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become."
                }
            ];

            $scope.loading = false;
        }

        $scope.submitPost = function () {
            if ($scope.postContent) {
                // TODO: Submit post
                $scope.postContent = '';
            }
        };

        $scope.onMyBatchmatesPageChange = function (page) {
            $scope.myBatchmatesCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onPlacedStudentsPageChange = function (page) {
            $scope.placedStudentsCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onAlumniPageChange = function (page) {
            $scope.alumniCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        // Career Check-In Modal Functions
        function initializeCareerForm() {
            $scope.careerForm = {
                companyName: '',
                jobTitle: '',
                startDate: '',
                endDate: '',
                currentlyWorking: false,
                recnHelped: false
            };
        }

        $scope.closeCareerCheckinModal = function () {
            $scope.showCareerCheckinModal = false;
        };

        $scope.updateCareerCheckin = function () {
            // TODO: Save to API
            $scope.closeCareerCheckinModal();
        };

        // Resume Upload Modal Functions
        function initializeResumeForm() {
            $scope.resumeFile = null;
        }

        $scope.closeResumeUploadModal = function () {
            $scope.showResumeUploadModal = false;
        };

        $scope.onResumeFileSelected = function (files) {
            if (files && files.length > 0) {
                $scope.resumeFile = files[0];
            }
        };

        $scope.generateResume = function () {
            // TODO: Generate resume using AI
        };

        $scope.submitResume = function () {
            if (!$scope.resumeFile) {
                $window.alert('Please select a file to upload');
                return;
            }
            // TODO: Upload to API
            $scope.closeResumeUploadModal();
        };

        // Certifications Modal Functions
        $scope.closeCertificationsModal = function () {
            $scope.showCertificationsModal = false;
        };

        $scope.selectCertification = function (certificationId) {
            $scope.selectedCertification = certificationId;
        };

        $scope.enrollCertification = function (certification) {
            // TODO: Enroll in certification
        };

        // Dream Job Toolkit Modal Functions
        $scope.closeDreamJobToolkitModal = function () {
            $scope.showDreamJobToolkitModal = false;
        };

        $scope.openToolkitItem = function (item) {
            // TODO: Handle toolkit item click - could navigate or show content
            void item;
        };

        loadStudentData();
    }
]);
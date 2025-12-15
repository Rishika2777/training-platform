/**
 * Campus About Controller
 * Handles campus about page for CAMPUS_USER role
 */
angular.module('campusApp.campus').controller('CampusAboutController', [
    '$scope',
    'AuthService',
    function ($scope, AuthService) {
        'use strict';

        function setSidebarSlots() {
            $scope.sidebarSlots = {
                profileTemplateUrl: 'app/features/campus/views/sidebar/campus-sidebar-profile.html',
                afterMenuTemplateUrl:
                    'app/features/campus/views/sidebar/campus-sidebar-after-menu.html'
            };
        }

        setSidebarSlots();

        $scope.loading = false;
        $scope.campusData = null;
        $scope.showDownloadProspectusModal = false;

        function createEmptyDownloadProspectusForm() {
            return {
                courseId: null
            };
        }

        $scope.downloadProspectusForm = createEmptyDownloadProspectusForm();
        $scope.downloadProspectusCourseOptions = [];

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

        // Rising Stars data
        $scope.risingStars = [
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null },
            { id: 'XYZ', name: 'Name', location: 'Home (City)', image: null }
        ];

        $scope.risingStarsPageSize = 6;
        $scope.risingStarsPage = 1;
        $scope.risingStarsTotalPages = calculateTotalPages(
            $scope.risingStars.length,
            $scope.risingStarsPageSize
        );
        $scope.onRisingStarsPageChange = function (page) {
            $scope.risingStarsTotalPages = calculateTotalPages(
                $scope.risingStars.length,
                $scope.risingStarsPageSize
            );
            $scope.risingStarsPage = normalizePage(page, $scope.risingStarsTotalPages);
        };

        // Success Stories data
        $scope.successStories = [
            { name: 'Name', batch: 'Batch', company: 'Company', image: null },
            { name: 'Name', batch: 'Batch', company: 'Company', image: null },
            { name: 'Name', batch: 'Batch', company: 'Company', image: null },
            { name: 'Name', batch: 'Batch', company: 'Company', image: null },
            { name: 'Name', batch: 'Batch', company: 'Company', image: null },
            { name: 'Name', batch: 'Batch', company: 'Company', image: null }
        ];

        $scope.successStoriesPageSize = 5;
        $scope.successStoriesPage = 1;
        $scope.successStoriesTotalPages = calculateTotalPages(
            $scope.successStories.length,
            $scope.successStoriesPageSize
        );
        $scope.onSuccessStoriesPageChange = function (page) {
            $scope.successStoriesTotalPages = calculateTotalPages(
                $scope.successStories.length,
                $scope.successStoriesPageSize
            );
            $scope.successStoriesPage = normalizePage(page, $scope.successStoriesTotalPages);
        };

        // Enrolled Students data
        $scope.enrolledData = [
            { name: 'ME', dayPercentage: 60, monthPercentage: 80 },
            { name: 'CE', dayPercentage: 50, monthPercentage: 70 },
            { name: 'CSE', dayPercentage: 85, monthPercentage: 95 },
            { name: 'ECE', dayPercentage: 70, monthPercentage: 85 },
            { name: 'IT', dayPercentage: 75, monthPercentage: 90 },
            { name: 'AI', dayPercentage: 65, monthPercentage: 80 }
        ];

        // Project Categories
        $scope.projectCategories = [
            { name: 'Technology', color: '#9B59B6' },
            { name: 'UI/UX Design', color: '#3498DB' },
            { name: 'Data Science', color: '#2ECC71' },
            { name: 'Machine Learning', color: '#F39C12' },
            { name: 'Web Dev', color: '#E74C3C' },
            { name: 'Mobile Dev', color: '#1ABC9C' },
            { name: 'Cyber Security', color: '#34495E' },
            { name: 'Cloud Computing', color: '#95A5A6' },
            { name: 'AI/ML', color: '#FF6B35' },
            { name: 'Blockchain', color: '#9B59B6' },
            { name: 'Others', color: '#BDC3C7' }
        ];

        // Skills List
        $scope.skillsList = [
            { name: 'Java', color: '#9B59B6' },
            { name: 'C++', color: '#3498DB' },
            { name: 'Python', color: '#2ECC71' },
            { name: 'HTML', color: '#F39C12' },
            { name: 'CSS', color: '#E74C3C' },
            { name: 'JavaScript', color: '#1ABC9C' },
            { name: 'ReactJs', color: '#34495E' },
            { name: 'Angular', color: '#95A5A6' },
            { name: 'Node.js', color: '#FF6B35' },
            { name: 'SQL', color: '#9B59B6' },
            { name: 'MongoDB', color: '#3498DB' },
            { name: 'AWS', color: '#2ECC71' }
        ];

        // Courses data
        $scope.courses = [
            {
                code: 'BCA',
                seats: 30,
                duration: '3 yr',
                fullName: 'Bachelor of Computer Applications'
            },
            {
                code: 'BCA',
                seats: 30,
                duration: '3 yr',
                fullName: 'Bachelor of Computer Applications'
            },
            {
                code: 'BCA',
                seats: 30,
                duration: '3 yr',
                fullName: 'Bachelor of Computer Applications'
            },
            {
                code: 'BCA',
                seats: 30,
                duration: '3 yr',
                fullName: 'Bachelor of Computer Applications'
            }
        ];

        function buildDownloadProspectusCourseOptions(courses) {
            return (courses || []).map(function (c, idx) {
                const code = c && c.code ? String(c.code) : 'COURSE';
                const name = c && c.fullName ? String(c.fullName) : code;
                const duration = c && c.duration ? String(c.duration) : '';
                const seats = c && typeof c.seats !== 'undefined' ? String(c.seats) : '';

                const meta = [duration && `${duration}`, seats && `${seats} seats`]
                    .filter(Boolean)
                    .join(' • ');
                return {
                    id: idx + 1,
                    name: meta ? `${code} - ${name} (${meta})` : `${code} - ${name}`
                };
            });
        }

        function refreshDownloadProspectusOptions() {
            $scope.downloadProspectusCourseOptions = buildDownloadProspectusCourseOptions(
                $scope.courses
            );
            if (
                !$scope.downloadProspectusForm.courseId &&
                $scope.downloadProspectusCourseOptions.length > 0
            ) {
                $scope.downloadProspectusForm.courseId =
                    $scope.downloadProspectusCourseOptions[0].id;
            }
        }

        $scope.openDownloadProspectusModal = function () {
            refreshDownloadProspectusOptions();
            $scope.showDownloadProspectusModal = true;
        };

        $scope.closeDownloadProspectusModal = function () {
            $scope.showDownloadProspectusModal = false;
            $scope.downloadProspectusForm = createEmptyDownloadProspectusForm();
        };

        $scope.downloadProspectus = function () {
            // TODO: implement real download when API is ready
            // eslint-disable-next-line no-console
            console.log('Download prospectus', {
                campus: $scope.campusData,
                courseId: $scope.downloadProspectusForm.courseId
            });
            $scope.closeDownloadProspectusModal();
        };

        // Companies Visited data
        $scope.companiesVisited = [
            { year: '2016', pinkPercentage: 40, bluePercentage: 60 },
            { year: '2017', pinkPercentage: 50, bluePercentage: 70 },
            { year: '2018', pinkPercentage: 60, bluePercentage: 80 },
            { year: '2019', pinkPercentage: 70, bluePercentage: 85 },
            { year: '2020', pinkPercentage: 72, bluePercentage: 94 }
        ];

        // Placement Sectors
        $scope.placementSectors = [
            { name: 'IT Sector', color: '#2ECC71', percentage: '21.00%' },
            { name: 'Marketing', color: '#9B59B6', percentage: '15.00%' },
            { name: 'Consulting', color: '#3498DB', percentage: '18.00%' },
            { name: 'Finance', color: '#FF6B35', percentage: '12.00%' },
            { name: 'Healthcare', color: '#1ABC9C', percentage: '10.00%' },
            { name: 'Education', color: '#F39C12', percentage: '8.00%' },
            { name: 'Others', color: '#95A5A6', percentage: '16.00%' }
        ];

        // Top Companies
        $scope.topCompanies = [
            { name: 'Company 1', logo: null },
            { name: 'Company 2', logo: null },
            { name: 'Company 3', logo: null },
            { name: 'Company 4', logo: null },
            { name: 'Company 5', logo: null },
            { name: 'Company 6', logo: null },
            { name: 'Company 7', logo: null },
            { name: 'Company 8', logo: null },
            { name: 'Company 9', logo: null }
        ];

        // Faculties data
        $scope.faculties = [
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null },
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null },
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null },
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null },
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null },
            { name: 'Name', dept: 'Dept', designation: 'Designation', image: null }
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
            name: 'Ankita Wilson',
            image: null,
            quote: "I'm grateful for the opportunities and resources provided by the campus. It's made a huge difference in my academic journey."
        };

        // Contact Information
        $scope.contactInfo = {
            email: 'relativestudentsity@gmail.com',
            phone: '+91 890-324-9040',
            address: 'Mangalore University, 574 199, Karnataka State, India'
        };

        // Feedback form data
        $scope.feedbackForm = {
            name: '',
            message: ''
        };

        function loadCampusData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.campusData = {
                    name: currentUser.profile.campusName || 'Campus Name',
                    campusId: currentUser.profile.campusId,
                    description: 'Information about the campus...',
                    address: currentUser.profile.address || '',
                    contact: currentUser.profile.phone || ''
                };
            } else {
                $scope.campusData = {
                    name: 'Campus Name',
                    campusId: '',
                    description: '',
                    address: '',
                    contact: ''
                };
            }

            $scope.loading = false;
        }

        $scope.submitFeedback = function () {
            // TODO: Implement feedback submission
            console.log('Submitting feedback:', $scope.feedbackForm);
            // Reset form
            $scope.feedbackForm = {
                name: '',
                message: ''
            };
        };

        loadCampusData();
    }
]);
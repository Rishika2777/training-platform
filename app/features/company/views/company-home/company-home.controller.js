/**
 * Company Home Controller
 * Handles company home/dashboard page for COMPANY role
 */
angular.module('campusApp.company').controller('CompanyHomeController', [
    '$scope',
    '$rootScope',
    '$timeout',
    'AuthService',
    'ApiService',
    'API_ENDPOINTS',
    function ($scope, $rootScope, $timeout, AuthService, ApiService, API_ENDPOINTS) {
        'use strict';

        function createEmptyClientForm() {
            return {
                logoFile: null,
                clientName: ''
            };
        }

        function createEmptyPreferredCampusForm() {
            return {
                photoFile: null,
                campusName: ''
            };
        }

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
        $scope.keyPeople = [];
        $scope.clients = [];
        $scope.newsUpdates = [];
        $scope.preferredCampuses = [];
        $scope.posts = [];
        $scope.keyPeopleCarousel = { currentPage: 1, totalPages: 6 };
        $scope.clientsCarousel = { currentPage: 1, totalPages: 6 };
        $scope.preferredCampusesCarousel = { currentPage: 1, totalPages: 6 };

        // Modal visibility flags
        $scope.showSpecializationModal = false;
        $scope.showVisionModal = false;
        $scope.showBenefitsModal = false;
        $scope.showVacancyModal = false;
        $scope.showAddClientModal = false;
        $scope.showAddPreferredCampusModal = false;

        $scope.clientForm = createEmptyClientForm();
        $scope.preferredCampusForm = createEmptyPreferredCampusForm();

        // Set up modal event listener IMMEDIATELY
        const modalListener = $rootScope.$on('openModal', function (event, modalId) {
            // Use $evalAsync to ensure we're in the right phase
            $scope.$evalAsync(function () {
                if (modalId === 'company-specialization') {
                    initializeModalData();
                    $scope.showSpecializationModal = true;
                } else if (modalId === 'company-vision-performance') {
                    initializeVisionModalData();
                    $scope.showVisionModal = true;
                } else if (modalId === 'company-benefits') {
                    initializeModalBenefits();
                    $scope.showBenefitsModal = true;
                } else if (modalId === 'company-current-vacancy') {
                    initializeVacancyForm();
                    $scope.showVacancyModal = true;
                }
            });
        });

        // Specialization modal data
        $scope.specializations = [];
        $scope.modalSpecializations = [];

        // Vision modal data
        $scope.modalVisionData = {
            vision: '',
            metricName: '',
            value: '',
            year: ''
        };

        // Benefits modal data
        $scope.modalBenefitsData = {
            internToJobRate: '',
            startingSalary: '',
            benefits: []
        };

        // Vacancy modal data
        $scope.vacancyForm = {
            jobTitle: '',
            jobLocation: '',
            department: '',
            jobType: '',
            salary: '',
            openings: '',
            contractDuration: '',
            jobDescription: '',
            qualifications: '',
            streams: '',
            minCGPA: '',
            yearOfPassing: '',
            selectionRounds: {
                aptitude: false,
                groupDiscussion: false,
                faceToFace: false,
                all: false
            },
            modeOfSelection: {
                online: false,
                offline: false,
                both: false
            }
        };

        function loadCompanyData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.companyData = {
                    name: currentUser.profile.companyName || 'Company Name'
                };
            }

            // TODO: Load from API
            $scope.keyPeople = [
                { id: 1, name: 'Name', designation: 'CEO', avatar: '' },
                { id: 2, name: 'Name', designation: 'CTO', avatar: '' },
                { id: 3, name: 'Name', designation: 'HR Manager', avatar: '' },
                { id: 4, name: 'Name', designation: 'Director', avatar: '' }
            ];

            $scope.clients = [];

            $scope.newsUpdates = [
                {
                    id: 1,
                    title: 'Upcoming Events',
                    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
                }
            ];

            $scope.preferredCampuses = [];

            $scope.posts = [
                {
                    id: 1,
                    author: 'Ankitha Wilson',
                    timeAgo: '1d',
                    image: 'company.jpg',
                    text: '🚀 Innovate. Grow. Succeed. Committed to excellence, driven by innovation, and focused on making an impact. The journey to a better future starts here! #Innovation #Success #Growth'
                }
            ];

            // Load initial data for modals
            loadSpecializations();
            initializeModalBenefits();

            $scope.loading = false;
        }

        // Clean up listener
        $scope.$on('$destroy', function () {
            modalListener();
        });

        // Specialization Modal Functions
        function loadSpecializations() {
            $scope.loading = true;
            // API Call Example:
            // ApiService.get(API_ENDPOINTS.COMPANY.SPECIALIZATIONS)
            //     .then(function(response) {
            //         $scope.specializations = response.data || response || [];
            //         $scope.loading = false;
            //     })
            //     .catch(function(error) {
            //         console.error('Error loading specializations:', error);
            //         $scope.loading = false;
            //         // Fallback to mock data
            //         $scope.specializations = [
            //             { id: 1, name: 'Software Development', description: 'Web and mobile app development' },
            //             { id: 2, name: 'Data Analytics', description: 'Business intelligence and analytics' }
            //         ];
            //     });

            // Mock data (remove when API is ready)
            $scope.specializations = [
                {
                    id: 1,
                    name: 'Software Development',
                    description: 'Web and mobile app development'
                },
                {
                    id: 2,
                    name: 'Data Analytics',
                    description: 'Business intelligence and analytics'
                }
            ];
            $scope.loading = false;
        }

        function initializeModalData() {
            $scope.modalSpecializations = angular.copy($scope.specializations);
            if ($scope.modalSpecializations.length === 0) {
                $scope.modalSpecializations = [];
            }
        }

        function openSpecializationModal() {
            initializeModalData();
            $scope.showSpecializationModal = true;
        }

        // Expose function for testing/debugging
        $scope.openSpecializationModal = openSpecializationModal;

        $scope.closeSpecializationModal = function () {
            $scope.showSpecializationModal = false;
        };

        $scope.addSpecialization = function () {
            const newSpec = {
                id: Date.now(),
                name: '',
                description: ''
            };
            $scope.modalSpecializations.push(newSpec);
        };

        $scope.removeSpecialization = function (index) {
            $scope.modalSpecializations.splice(index, 1);
        };

        $scope.saveSpecializations = function () {
            $scope.loading = true;

            // API Call Example:
            // ApiService.post(API_ENDPOINTS.COMPANY.SPECIALIZATIONS, { specializations: $scope.modalSpecializations })
            //     .then(function(response) {
            //         $scope.specializations = angular.copy($scope.modalSpecializations);
            //         $scope.loading = false;
            //         $scope.closeSpecializationModal();
            //         // Show success message
            //     })
            //     .catch(function(error) {
            //         console.error('Error saving specializations:', error);
            //         $scope.loading = false;
            //         // Show error message
            //     });

            // Mock save (remove when API is ready)
            $scope.specializations = angular.copy($scope.modalSpecializations);
            $scope.loading = false;
            $scope.closeSpecializationModal();
        };

        // Vision Modal Functions
        function initializeVisionModalData() {
            $scope.modalVisionData = {
                vision: '',
                metricName: '',
                value: '',
                year: ''
            };
        }

        function openVisionModal() {
            initializeVisionModalData();
            $scope.showVisionModal = true;
        }

        // Expose function for testing/debugging
        $scope.openVisionModal = openVisionModal;

        $scope.closeVisionModal = function () {
            $scope.showVisionModal = false;
        };

        $scope.submitVisionAchievements = function () {
            $scope.loading = true;

            // API Call Example:
            // ApiService.post(API_ENDPOINTS.COMPANY.VISION_ACHIEVEMENTS, $scope.modalVisionData)
            //     .then(function(response) {
            //         $scope.loading = false;
            //         $scope.closeVisionModal();
            //         // Show success message
            //     })
            //     .catch(function(error) {
            //         console.error('Error saving vision & achievements:', error);
            //         $scope.loading = false;
            //         // Show error message
            //     });

            // Mock save (remove when API is ready)
            $scope.loading = false;
            $scope.closeVisionModal();
        };

        // Benefits Modal Functions
        function initializeModalBenefits() {
            $scope.modalBenefitsData = {
                internToJobRate: '85%',
                startingSalary: '5,00,000',
                benefits: [
                    {
                        title: 'Performance Bonus',
                        description:
                            'We encourage our employees to achieve their full potential and therefore we offer monthly bonuses as a performance incentive. Employees always have the potential to earn more than the base paycheck amount.'
                    },
                    {
                        title: 'Healthcare',
                        description:
                            "Every employee is eligible for health insurance upon completion of his or her probationary period. This program is especially useful for those employees who do not always prepare or budget for life's unexpected events."
                    },
                    {
                        title: 'Mentor-Buddy System',
                        description:
                            'We "buddy" up new employees with an experienced software professional veteran to help employees become familiar with Highlands\' culture, routines, and work processes and to help with future growth and professional development.'
                    },
                    {
                        title: 'Work-Life Balance Perks',
                        description: '5-day workweek, flexible hours, and remote working options'
                    },
                    {
                        title: 'Appreciation Day Off',
                        description:
                            'This "holiday" is awarded for any initiative or work achievement that management considers outstanding and worthy of reward and recognition.'
                    },
                    {
                        title: 'Training & Upskilling',
                        description:
                            'wants to help you realize your goals: both educational and professional! We have local industry experts and in-house gurus to help you update your skills'
                    },
                    {
                        title: 'Sick Leaves',
                        description:
                            'We understand that work can be stressful. We give you time to recover from unexpected health issues.'
                    },
                    {
                        title: 'New Employee Referral Bonus',
                        description:
                            'We want to hire the best in the industry. We offer generous referral bonuses for employees who help us identify and hire distinguished talent.'
                    }
                ]
            };
        }

        function openBenefitsModal() {
            initializeModalBenefits();
            $scope.showBenefitsModal = true;
        }

        // Expose function for testing/debugging
        $scope.openBenefitsModal = openBenefitsModal;

        $scope.closeBenefitsModal = function () {
            $scope.showBenefitsModal = false;
        };

        $scope.submitBenefits = function () {
            $scope.loading = true;

            // API Call Example:
            // ApiService.post(API_ENDPOINTS.COMPANY.BENEFITS, $scope.modalBenefitsData)
            //     .then(function(response) {
            //         $scope.loading = false;
            //         $scope.closeBenefitsModal();
            //         // Show success message
            //     })
            //     .catch(function(error) {
            //         console.error('Error saving benefits:', error);
            //         $scope.loading = false;
            //         // Show error message
            //     });

            // Mock save (remove when API is ready)
            $scope.loading = false;
            $scope.closeBenefitsModal();
        };

        // Vacancy Modal Functions
        function initializeVacancyForm() {
            $scope.vacancyForm = {
                jobTitle: '',
                jobLocation: '',
                department: '',
                jobType: '',
                salary: '',
                openings: '',
                contractDuration: '',
                jobDescription: '',
                qualifications: '',
                streams: '',
                minCGPA: '',
                yearOfPassing: '',
                selectionRounds: {
                    aptitude: false,
                    groupDiscussion: false,
                    faceToFace: false,
                    all: false
                },
                modeOfSelection: {
                    online: false,
                    offline: false,
                    both: false
                }
            };
        }

        function openVacancyModal() {
            initializeVacancyForm();
            $scope.showVacancyModal = true;
        }

        // Expose function for testing/debugging
        $scope.openVacancyModal = openVacancyModal;

        $scope.closeVacancyModal = function () {
            $scope.showVacancyModal = false;
        };

        $scope.submitVacancyForm = function () {
            $scope.loading = true;

            // API Call Example:
            // ApiService.post(API_ENDPOINTS.COMPANY.VACANCIES, $scope.vacancyForm)
            //     .then(function(response) {
            //         $scope.loading = false;
            //         $scope.closeVacancyModal();
            //         // Reload vacancies list if needed
            //         // loadVacancies();
            //         // Show success message
            //     })
            //     .catch(function(error) {
            //         console.error('Error saving vacancy:', error);
            //         $scope.loading = false;
            //         // Show error message
            //     });

            // Mock save (remove when API is ready)
            $scope.loading = false;
            $scope.closeVacancyModal();
        };

        // Home page functions
        $scope.submitPost = function () {
            if ($scope.postContent) {
                // TODO: Submit post
                $scope.postContent = '';
            }
        };

        $scope.onKeyPeoplePageChange = function (page) {
            $scope.keyPeopleCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onClientsPageChange = function (page) {
            $scope.clientsCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onPreferredCampusesPageChange = function (page) {
            $scope.preferredCampusesCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.addClient = function () {
            $scope.clientForm = createEmptyClientForm();
            $scope.showAddClientModal = true;
        };

        $scope.addPreferredCampus = function () {
            $scope.preferredCampusForm = createEmptyPreferredCampusForm();
            $scope.showAddPreferredCampusModal = true;
        };

        $scope.closeAddClientModal = function () {
            $scope.showAddClientModal = false;
            $scope.clientForm = createEmptyClientForm();
        };

        $scope.closeAddPreferredCampusModal = function () {
            $scope.showAddPreferredCampusModal = false;
            $scope.preferredCampusForm = createEmptyPreferredCampusForm();
        };

        $scope.onClientLogoSelected = function (files) {
            $scope.clientForm.logoFile = files || null;
        };

        $scope.onPreferredCampusPhotoSelected = function (files) {
            $scope.preferredCampusForm.photoFile = files || null;
        };

        $scope.submitClient = function () {
            // TODO: Integrate API call to add client
            // eslint-disable-next-line no-console
            console.log('Submit client', $scope.clientForm);
            $scope.closeAddClientModal();
        };

        $scope.submitPreferredCampus = function () {
            // TODO: Integrate API call to add preferred campus
            // eslint-disable-next-line no-console
            console.log('Submit preferred campus', $scope.preferredCampusForm);
            $scope.closeAddPreferredCampusModal();
        };

        loadCompanyData();
    }
]);

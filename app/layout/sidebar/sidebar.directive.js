/**
 * Sidebar Directive
 * Dynamic sidebar with menu items from MenuService
 */
angular.module('campusApp').directive('appSidebar', [
    'MenuService',
    function (MenuService) {
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

        function resolveFallbackImageByRole(role) {
            if (role === 'CAMPUS_USER') {
                return 'assets/images/campus-register.png';
            }
            if (role === 'COMPANY') {
                return 'assets/images/login-news-image.png';
            }
            return '';
        }

        function buildDefaultFaculties() {
            return [
                { name: 'Akshay Sharma', image: null },
                { name: 'Ankitha Wilson', image: null },
                { name: 'Amith Deshpande', image: null }
            ];
        }

        function normalizeFacultyList(list) {
            if (!Array.isArray(list)) {
                return buildDefaultFaculties();
            }
            if (list.length === 0) {
                return buildDefaultFaculties();
            }
            return list
                .map(function (f) {
                    return {
                        name: (f && f.name) || 'Name',
                        image: (f && f.image) || null
                    };
                })
                .filter(function (f) {
                    return !!f.name;
                });
        }

        function createEmptyFacultyForm() {
            return {
                fullName: '',
                email: '',
                dob: '',
                photoFile: null,
                designation: '',
                department: '',
                specialization: '',
                experienceYears: '',
                qualifications: '',
                certificates: ['']
            };
        }

        function buildFacultyDesignationOptions() {
            return [
                { value: 'professor', label: 'Professor' },
                { value: 'associate-professor', label: 'Associate Professor' },
                { value: 'assistant-professor', label: 'Assistant Professor' },
                { value: 'lecturer', label: 'Lecturer' }
            ];
        }

        function buildFacultyDepartmentOptions() {
            return [
                { value: 'cse', label: 'Computer Science' },
                { value: 'ece', label: 'Electronics' },
                { value: 'me', label: 'Mechanical' },
                { value: 'civil', label: 'Civil' }
            ];
        }

        function buildFacultySpecializationOptions() {
            return [
                { value: 'ai-ml', label: 'AI / ML' },
                { value: 'web-dev', label: 'Web Development' },
                { value: 'cloud', label: 'Cloud' },
                { value: 'data', label: 'Data Science' }
            ];
        }

        function buildFacultyExperienceOptions() {
            return [
                { value: '0-1', label: '0-1 Years' },
                { value: '1-3', label: '1-3 Years' },
                { value: '3-5', label: '3-5 Years' },
                { value: '5-10', label: '5-10 Years' },
                { value: '10+', label: '10+ Years' }
            ];
        }

        function createEmptyStudentIdeaForm() {
            return {
                documentFile: null,
                description: ''
            };
        }

        function countWordsFromText(text) {
            if (!text) {
                return 0;
            }
            return String(text)
                .trim()
                .split(/\s+/)
                .filter(function (word) {
                    return !!word;
                }).length;
        }

        return {
            restrict: 'E',
            templateUrl: 'app/layout/sidebar/sidebar.html',
            controller: [
                '$scope',
                '$location',
                '$rootScope',
                'MenuService',
                'RoleService',
                'AuthService',
                'StorageService',
                'STORAGE_KEYS',
                function (
                    $scope,
                    $location,
                    $rootScope,
                    MenuService,
                    RoleService,
                    AuthService,
                    StorageService,
                    STORAGE_KEYS
                ) {
                    // Function to update menu items (filtered by roles)
                    const updateMenuItems = function () {
                        $scope.menuItems = MenuService.getMenuItems();
                    };

                    function setupCampusAfterMenu(currentUser) {
                        const facultyFromProfile =
                            currentUser && currentUser.profile && currentUser.profile.faculties
                                ? currentUser.profile.faculties
                                : null;

                        $scope.faculties = normalizeFacultyList(facultyFromProfile);
                        $scope.facultiesPageSize = 3;
                        $scope.facultiesPage = 1;
                        $scope.facultiesTotalPages = calculateTotalPages(
                            $scope.faculties.length,
                            $scope.facultiesPageSize
                        );

                        $scope.onFacultiesPageChange = function (page) {
                            $scope.facultiesTotalPages = calculateTotalPages(
                                $scope.faculties.length,
                                $scope.facultiesPageSize
                            );
                            $scope.facultiesPage = normalizePage(page, $scope.facultiesTotalPages);
                        };

                        $scope.showAddFacultyModal = false;
                        $scope.facultyForm = createEmptyFacultyForm();
                        $scope.facultyDesignationOptions = buildFacultyDesignationOptions();
                        $scope.facultyDepartmentOptions = buildFacultyDepartmentOptions();
                        $scope.facultySpecializationOptions = buildFacultySpecializationOptions();
                        $scope.facultyExperienceOptions = buildFacultyExperienceOptions();

                        function persistFacultyToCurrentUser(facultyItem) {
                            const userData = AuthService.getCurrentUser();
                            if (!userData) {
                                return null;
                            }

                            const updatedUser = angular.copy(userData);
                            if (!updatedUser.profile) {
                                updatedUser.profile = {};
                            }

                            const existing = Array.isArray(updatedUser.profile.faculties)
                                ? updatedUser.profile.faculties
                                : [];

                            updatedUser.profile.faculties = existing.concat([facultyItem]);
                            StorageService.set(STORAGE_KEYS.USER_DATA, updatedUser);
                            return updatedUser;
                        }

                        $scope.closeAddFacultyModal = function () {
                            $scope.showAddFacultyModal = false;
                            $scope.facultyForm = createEmptyFacultyForm();
                        };

                        $scope.onFacultyPhotoSelected = function (files) {
                            $scope.facultyForm.photoFile = files || null;
                        };

                        $scope.addFacultyCertificate = function () {
                            if (!$scope.facultyForm || !$scope.facultyForm.certificates) {
                                $scope.facultyForm = createEmptyFacultyForm();
                            }
                            $scope.facultyForm.certificates.push('');
                        };

                        $scope.removeFacultyCertificate = function (index) {
                            if (
                                !$scope.facultyForm ||
                                !$scope.facultyForm.certificates ||
                                $scope.facultyForm.certificates.length <= 1
                            ) {
                                return;
                            }
                            $scope.facultyForm.certificates.splice(index, 1);
                        };

                        $scope.submitAddFaculty = function () {
                            if (
                                !$scope.facultyForm ||
                                !$scope.facultyForm.fullName ||
                                !$scope.facultyForm.email
                            ) {
                                return;
                            }

                            const facultyItem = {
                                name: $scope.facultyForm.fullName,
                                image: null
                            };

                            const updatedUser = persistFacultyToCurrentUser(facultyItem);
                            if (updatedUser && updatedUser.profile) {
                                $scope.faculties = normalizeFacultyList(
                                    updatedUser.profile.faculties
                                );
                                $scope.facultiesTotalPages = calculateTotalPages(
                                    $scope.faculties.length,
                                    $scope.facultiesPageSize
                                );
                                $scope.facultiesPage = normalizePage(
                                    $scope.facultiesPage,
                                    $scope.facultiesTotalPages
                                );
                            }

                            $scope.closeAddFacultyModal();
                        };

                        $scope.handleAddFaculty = function () {
                            $scope.facultyForm = createEmptyFacultyForm();
                            $scope.showAddFacultyModal = true;
                        };
                    }

                    function setupStudentAfterMenu() {
                        $scope.handleQuizHub = function () {
                            $rootScope.$broadcast('openModal', 'student-quizhub');
                        };

                        $scope.handleSubmitIdea = function () {
                            $scope.openSubmitIdeaModal();
                        };

                        $scope.showSubmitIdeaModal = false;
                        $scope.ideaForm = createEmptyStudentIdeaForm();

                        $scope.openSubmitIdeaModal = function () {
                            $scope.ideaForm = createEmptyStudentIdeaForm();
                            $scope.showSubmitIdeaModal = true;
                        };

                        $scope.closeSubmitIdeaModal = function () {
                            $scope.showSubmitIdeaModal = false;
                            $scope.ideaForm = createEmptyStudentIdeaForm();
                        };

                        $scope.onIdeaDocumentSelected = function (files) {
                            $scope.ideaForm.documentFile = files || null;
                        };

                        $scope.downloadIdeaTemplate = function () {
                            // TODO: Replace with actual template file download
                            // eslint-disable-next-line no-console
                            console.log('Download idea template');
                        };

                        $scope.submitIdea = function () {
                            const description = $scope.ideaForm ? $scope.ideaForm.description : '';
                            const wordCount = countWordsFromText(description);

                            if (wordCount > 100) {
                                window.alert('Please limit your idea to 100 words.');
                                return;
                            }

                            // TODO: Submit idea to API
                            // eslint-disable-next-line no-console
                            console.log('Submit idea', $scope.ideaForm);
                            $scope.closeSubmitIdeaModal();
                        };
                    }

                    function setupCompanyAfterMenu(currentUser) {
                        const profile =
                            currentUser && currentUser.profile ? currentUser.profile : null;
                        $scope.companyCeoName =
                            (profile && (profile.ceoName || profile.ceo)) || 'Ankitha Wilson';
                        $scope.companyCeoImage = (profile && profile.ceoImage) || null;
                    }

                    // Load user profile data
                    function loadUserProfile() {
                        const currentUser = AuthService.getCurrentUser();
                        const roles = RoleService.getUserRoles();

                        $scope.userRole = roles && roles.length > 0 ? roles[0] : null;

                        if (currentUser) {
                            // Set sidebar title based on role
                            if ($scope.userRole === 'CAMPUS_USER') {
                                $scope.sidebarTitle = 'Campus Dashboard';
                                $scope.campusName =
                                    (currentUser.profile && currentUser.profile.campusName) ||
                                    'Campus Name';
                                $scope.campusRank =
                                    (currentUser.profile && currentUser.profile.rank) || 'Rank';
                                $scope.campusImage =
                                    (currentUser.profile && currentUser.profile.image) ||
                                    resolveFallbackImageByRole('CAMPUS_USER');
                                setupCampusAfterMenu(currentUser);
                            } else if ($scope.userRole === 'STUDENT') {
                                $scope.sidebarTitle = 'Student Dashboard';
                                $scope.userName = currentUser.name || 'Student Name';
                                $scope.userNameInitial = currentUser.name
                                    ? currentUser.name.charAt(0).toUpperCase()
                                    : 'S';
                                $scope.userRank =
                                    (currentUser.profile && currentUser.profile.rank) || 'Rank';
                                setupStudentAfterMenu();
                            } else if ($scope.userRole === 'COMPANY') {
                                $scope.sidebarTitle = 'Company Dashboard';
                                $scope.companyName =
                                    (currentUser.profile && currentUser.profile.companyName) ||
                                    'Company Name';
                                $scope.companyImage =
                                    (currentUser.profile && currentUser.profile.image) ||
                                    resolveFallbackImageByRole('COMPANY');
                                setupCompanyAfterMenu(currentUser);
                            } else {
                                $scope.sidebarTitle = 'Admin Dashboard';
                            }
                        }
                    }

                    // Initial load
                    updateMenuItems();
                    loadUserProfile();

                    // Watch for menu changes
                    $scope.$watch(
                        function () {
                            return MenuService.getMenuItems();
                        },
                        function (newItems) {
                            $scope.menuItems = newItems;
                        },
                        true
                    );

                    // Watch for role changes to update menu
                    $scope.$watch(
                        function () {
                            return RoleService.getUserRoles();
                        },
                        function () {
                            updateMenuItems();
                            loadUserProfile();
                        },
                        true
                    );

                    // Watch for user data changes
                    $scope.$watch(
                        function () {
                            return AuthService.getCurrentUser();
                        },
                        function () {
                            loadUserProfile();
                        },
                        true
                    );

                    // Handle menu item click - check if it should open modal or navigate
                    $scope.handleMenuClick = function (menuItem) {
                        // Check if menu item has modal flag or specific IDs that should open modals
                        const modalIds = [
                            'campus-courses',
                            'campus-prospectus',
                            'company-specialization',
                            'company-vision-performance',
                            'company-current-vacancy',
                            'company-benefits',
                            'student-resume',
                            'student-dream-job-toolkit',
                            'student-career-checkin',
                            'student-learning-pathway'
                        ];

                        if (modalIds.indexOf(menuItem.id) !== -1) {
                            // Broadcast event to open modal (use $emit to go up to root, then it broadcasts down)
                            $rootScope.$broadcast('openModal', menuItem.id);
                        } else {
                            // Navigate normally
                            $scope.navigate(menuItem.route);
                        }
                    };

                    // Navigate to route
                    $scope.navigate = function (route) {
                        if (route && route !== '#') {
                            $location.path(route);
                        }
                    };

                    // Check if menu item is active
                    $scope.isActive = function (menuItem) {
                        const currentPath = $location.path();
                        return (
                            menuItem.active ||
                            currentPath === menuItem.route ||
                            currentPath.startsWith(menuItem.route + '/')
                        );
                    };
                }
            ]
        };
    }
]);

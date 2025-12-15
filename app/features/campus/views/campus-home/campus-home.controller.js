/**
 * Campus Home Controller
 * Handles campus home/dashboard page for CAMPUS_USER role
 */
angular.module('campusApp.campus').controller('CampusHomeController', [
    '$scope',
    '$rootScope',
    'AuthService',
    'ApiService',
    'API_ENDPOINTS',
    // -------- add
    'CampusService',
    // --------- end add 
    function ($scope, $rootScope, AuthService, ApiService, API_ENDPOINTS) {
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
        $scope.currentBatch = [];
        $scope.placedStudents = [];
        $scope.faculties = [];
        $scope.companiesVisited = [];
        $scope.alumni = [];
        $scope.posts = [];
        $scope.currentBatchCarousel = { currentPage: 1, totalPages: 6 };
        $scope.placedStudentsCarousel = { currentPage: 1, totalPages: 6 };
        $scope.companiesVisitedCarousel = { currentPage: 1, totalPages: 6 };
        $scope.alumniCarousel = { currentPage: 1, totalPages: 6 };

        // Modal visibility flags
        $scope.showCoursesModal = false;
        $scope.showProspectusModal = false;
        $scope.showCourseDetailsModal = false;
        $scope.showAddCompanyModal = false;
        $scope.showAddPlacedStudentModal = false;

        // Courses data
        $scope.courses = [];

        // Course details form data
        $scope.courseForm = {
            id: null,
            name: '',
            fullName: '',
            seats: null,
            duration: ''
        };

        // Prospectus form data
        $scope.prospectusForm = {
            campus: '',
            course: ''
        };

        // Companies Visited form data
        $scope.addCompanyForm = {
            name: '',
            logoFile: null
        };

        // Placed Student form data
        $scope.addPlacedStudentForm = {
            studentName: '',
            studentPhoto: null,
            course: '',
            batch: '',
            placementCompany: '',
            designation: '',
            sector: ''
        };

        // Dropdown options (mock; replace with API-driven lists)
        $scope.placedStudentCourseOptions = [
            { value: 'bca', label: 'BCA' },
            { value: 'bsc', label: 'BSc' },
            { value: 'bcom', label: 'BCom' }
        ];
        $scope.placedStudentBatchOptions = [
            { value: '2023', label: '2023' },
            { value: '2024', label: '2024' },
            { value: '2025', label: '2025' }
        ];
        $scope.placedStudentDesignationOptions = [
            { value: 'intern', label: 'Intern' },
            { value: 'associate', label: 'Associate' },
            { value: 'developer', label: 'Developer' }
        ];
        $scope.placedStudentSectorOptions = [
            { value: 'it', label: 'IT' },
            { value: 'finance', label: 'Finance' },
            { value: 'healthcare', label: 'Healthcare' }
        ];

        // Set up modal event listener IMMEDIATELY
        const modalListener = $rootScope.$on('openModal', function (event, modalId) {
            // Use $evalAsync to ensure we're in the right phase
            $scope.$evalAsync(function () {
                if (modalId === 'campus-courses') {
                    loadCourses();
                    $scope.showCoursesModal = true;
                } else if (modalId === 'campus-prospectus') {
                    loadCourses(); // Load courses for dropdown
                    $scope.showProspectusModal = true;
                }
            });
        });


        // ----------------------- NEW APIS FUNCTIONS ADD 

        function loadCurrentBatch() {
            ApiService.get(API_ENDPOINTS.CAMPUS.CURRENT_BATCH)
                .then(function (response) {
                    $scope.currentBatch = response.data;
                })
                .catch(function (error) {
                    console.error('Error loading current batch:', error);
                });
        }

        function loadPosts() {
            ApiService.get(API_ENDPOINTS.CAMPUS.POSTS)
                .then(function (response) {
                    $scope.posts = response.data;
                })
                .catch(function (error) {
                    console.error('Error loading posts:', error);
                });
        }

        function loadAlumni(year) {
            ApiService.get(API_ENDPOINTS.CAMPUS.ALUMNI, { year: year })
                .then(function (response) {
                    $scope.alumni = response.data;
                })
                .catch(function (error) {
                    console.error('Error loading alumni:', error);
                });
        }

        function loadPlacedStudents() {
            ApiService.get(API_ENDPOINTS.CAMPUS.PLACED_STUDENTS)
                .then(function (response) { $scope.placedStudents = response.data; })
                .catch(function (error) { console.error(error); });
        }

        function loadCompaniesVisited() {
            ApiService.get(API_ENDPOINTS.CAMPUS.COMPANIES_VISITED)
                .then(function (response) { $scope.companiesVisited = response.data; })
                .catch(function (error) { console.error(error); });
        }


        // ------------------------- END 

        // Clean up listener
        $scope.$on('$destroy', function () {
            modalListener();
        });

        function resetAddCompanyForm() {
            $scope.addCompanyForm = {
                name: '',
                logoFile: null
            };
        }

        function resetAddPlacedStudentForm() {
            $scope.addPlacedStudentForm = {
                studentName: '',
                studentPhoto: null,
                course: '',
                batch: '',
                placementCompany: '',
                designation: '',
                sector: ''
            };
        }

        function loadCampusData() {
            $scope.loading = true;
            const currentUser = AuthService.getCurrentUser();

            if (currentUser && currentUser.profile) {
                $scope.campusData = {
                    name: currentUser.profile.campusName || 'Campus Name',
                    rank: 'Rank #1'
                };
            }

            // TODO: Load from API
            $scope.currentBatch = [
                { id: 1, name: 'Name(Cs)', avatar: '' },
                { id: 2, name: 'Name(Ca)', avatar: '' },
                { id: 3, name: 'Name(Cs)', avatar: '' },
                { id: 4, name: 'Name(Ca)', avatar: '' },
                { id: 5, name: 'Name(Cs)', avatar: '' },
                { id: 6, name: 'Name(Ca)', avatar: '' },
                { id: 7, name: 'Name(Cs)', avatar: '' }
            ];

            $scope.placedStudents = [
                { id: 1, name: 'Name', batch: '2023', company: 'Tech Corp', avatar: '' },
                { id: 2, name: 'Name', batch: '2023', company: 'Web Solutions', avatar: '' },
                { id: 3, name: 'Name', batch: '2024', company: 'StartupXYZ', avatar: '' },
                { id: 4, name: 'Name', batch: '2024', company: 'BigTech', avatar: '' }
            ];

            $scope.faculties = [
                { id: 1, name: 'Akshay Sharma', avatar: '' },
                { id: 2, name: 'Ankitha Wilson', avatar: '' },
                { id: 3, name: 'Amith Deshpande', avatar: '' }
            ];

            $scope.companiesVisited = [];

            $scope.alumni = [
                { id: 1, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' },
                { id: 2, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' },
                { id: 3, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' },
                { id: 4, name: 'Name', designation: 'Designation', company: 'Company', avatar: '' }
            ];

            $scope.posts = [
                {
                    id: 1,
                    author: 'Ankitha Wilson',
                    timeAgo: '1d',
                    image: 'campus.jpg',
                    text: "Campus life isn't just about lectures and exams—it's about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become.",
                    liked: false,
                    flagged: false
                }
            ];

            $scope.loading = false;
        }

        $scope.addAnnouncement = function () {
            // TODO: Open add announcement modal
            console.log('Add announcement');
        };

        $scope.removeAnnouncement = function () {
            // TODO: Remove announcement
            console.log('Remove announcement');
        };

        $scope.submitPost = function () {
            if ($scope.postContent) {
                // TODO: Submit post
                console.log('Submit post:', $scope.postContent);
                $scope.postContent = '';
            }
        };

        $scope.addPlacedStudent = function () {
            resetAddPlacedStudentForm();
            $scope.showAddPlacedStudentModal = true;
        };

        $scope.addCompany = function () {
            resetAddCompanyForm();
            $scope.showAddCompanyModal = true;
        };

        $scope.closeAddCompanyModal = function () {
            $scope.showAddCompanyModal = false;
            resetAddCompanyForm();
        };

        $scope.closeAddPlacedStudentModal = function () {
            $scope.showAddPlacedStudentModal = false;
            resetAddPlacedStudentForm();
        };

        $scope.onCompanyLogoSelected = function (files) {
            $scope.addCompanyForm.logoFile = files || null;
        };

        $scope.onStudentPhotoSelected = function (files) {
            $scope.addPlacedStudentForm.studentPhoto = files || null;
        };

        $scope.submitAddCompany = function () {
            if (!$scope.addCompanyForm.name) {
                return;
            }

            // ------------------------ add
            ApiService.post(API_ENDPOINTS.CAMPUS.COMPANIES_VISITED, $scope.addCompanyForm)
                .then(function (response) {
                    $scope.companiesVisited.push(response.data);
                    $scope.closeAddCompanyModal();
                })
                .catch(function (error) {
                    console.error('Error adding company:', error);
                });

            // ----------------------- end 

            // Mock: add to list locally (replace with API call)
            $scope.companiesVisited = $scope.companiesVisited || [];
            $scope.companiesVisited.push({
                id: Date.now(),
                name: $scope.addCompanyForm.name,
                logoFile: $scope.addCompanyForm.logoFile
            });

            $scope.closeAddCompanyModal();
        };

        $scope.submitAddPlacedStudent = function () {
            const form = $scope.addPlacedStudentForm;
            if (
                !form.studentName ||
                !form.course ||
                !form.batch ||
                !form.placementCompany ||
                !form.designation ||
                !form.sector
            ) {
                return;
            }

            // Mock: add to list locally (replace with API call)
            $scope.placedStudents = $scope.placedStudents || [];
            $scope.placedStudents.unshift({
                id: Date.now(),
                name: form.studentName,
                batch: form.batch,
                company: form.placementCompany,
                avatar: ''
            });

            $scope.closeAddPlacedStudentModal();
        };

        $scope.addFaculty = function () {
            // TODO: Open add faculty modal
            console.log('Add faculty');
        };

        $scope.onCurrentBatchPageChange = function (page) {
            $scope.currentBatchCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onPlacedStudentsPageChange = function (page) {
            $scope.placedStudentsCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onCompaniesVisitedPageChange = function (page) {
            $scope.companiesVisitedCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onAlumniPageChange = function (page) {
            $scope.alumniCarousel.currentPage = page;
            // TODO: Load page data from API
        };

        $scope.onPostFooterChange = function (post, state) {
            if (!post || !state) {
                return;
            }
            post.liked = !!state.liked;
            post.flagged = !!state.flagged;
        };

        // Courses Modal Functions
        function loadCourses() {
            $scope.loading = true;

            // -------------- add 

            ApiService.get(API_ENDPOINTS.CAMPUS.COURSES)
                .then(response => $scope.courses = response.data)
                .catch(console.error);

            // Create new course
            $scope.createCourse = function (courseForm) {
                ApiService.post(API_ENDPOINTS.CAMPUS.COURSES, courseForm)
                    .then(response => {
                        $scope.courses.push(response.data);
                        console.log('Course created:', response.data);
                    })
                    .catch(console.error);
            };

            // Get course by ID (for edit modal)
            $scope.editCourse = function (courseId) {
                ApiService.get(API_ENDPOINTS.CAMPUS.COURSE_BY_ID.replace(':courseId', courseId))
                    .then(response => $scope.courseForm = response.data)
                    .catch(console.error);
            };

            // Update course
            $scope.updateCourse = function (courseId, courseForm) {
                ApiService.put(API_ENDPOINTS.CAMPUS.COURSE_UPDATE.replace(':courseId', courseId), courseForm)
                    .then(response => {
                        const index = $scope.courses.findIndex(c => c.id === courseId);
                        if (index !== -1) $scope.courses[index] = response.data;
                        console.log('Course updated:', response.data);
                    })
                    .catch(console.error);
            };

            // Delete course
            $scope.deleteCourse = function (courseId) {
                ApiService.delete(API_ENDPOINTS.CAMPUS.COURSE_DELETE.replace(':courseId', courseId))
                    .then(() => {
                        $scope.courses = $scope.courses.filter(c => c.id !== courseId);
                        console.log('Course deleted:', courseId);
                    })
                    .catch(console.error);
            };

            // ------------------------ end 


            // -------------- add 

            CampusService.getCourses()
                .then(function (res) {
                    $scope.courses = res.data || [];
                })
                .finally(function () {
                    $scope.loading = false;
                });

            $scope.saveCourseDetails = function () {
                if ($scope.courseForm.id) {
                    CampusService.updateCourse($scope.courseForm.id, $scope.courseForm)
                        .then(loadCourses);
                } else {
                    CampusService.createCourse($scope.courseForm)
                        .then(loadCourses);
                }
                $scope.closeCourseDetailsModal();
            };



            // ----------- end add 


            // ----------------- current batch api add 
            function loadCurrentBatch() {
                $scope.loading = true;

                CampusService.getCurrentBatch({
                    page: $scope.currentBatchCarousel.currentPage,
                    limit: 6
                }).then(function (res) {
                    $scope.currentBatch = res.data || [];
                    $scope.currentBatchCarousel.totalPages = res.totalPages || 1;
                }).finally(function () {
                    $scope.loading = false;
                });
            }

            // ------------------------------- current batch api end 

            // ---------------------load post api add 


            function loadPosts() {
                CampusService.getPosts({ page: 1, limit: 10 })
                    .then(function (res) {
                        $scope.posts = res.data || [];
                    });
            }

            $scope.submitPost = function () {
                if (!$scope.postContent) return;

                CampusService.createPost({
                    content: $scope.postContent
                }).then(function () {
                    $scope.postContent = '';
                    loadPosts();
                });
            };




            // ---------------------- load post api end 

            // -------------------- alumini api add 


            function loadAlumni(year) {
                CampusService.getAlumni({
                    year: year,
                    page: $scope.alumniCarousel.currentPage,
                    limit: 6
                }).then(function (res) {
                    $scope.alumni = res.data || [];
                    $scope.alumniCarousel.totalPages = res.totalPages || 1;
                });
            }



            // ------------------- alumini api end 


            // -----------------------  placed students api add 


            function loadPlacedStudents() {
                CampusService.getPlacedStudents({
                    page: $scope.placedStudentsCarousel.currentPage,
                    limit: 6
                }).then(function (res) {
                    $scope.placedStudents = res.data || [];
                    $scope.placedStudentsCarousel.totalPages = res.totalPages || 1;
                });
            }


            $scope.submitAddPlacedStudent = function () {
                const form = $scope.addPlacedStudentForm;

                CampusService.addPlacedStudent(form).then(function () {
                    loadPlacedStudents();
                    $scope.closeAddPlacedStudentModal();
                });
            };

            // ------------------------------- placed studetents api end


            // ------------------- companies visited api add

            function loadCompaniesVisited() {
                CampusService.getCompaniesVisited({
                    page: $scope.companiesVisitedCarousel.currentPage,
                    limit: 6
                }).then(function (res) {
                    $scope.companiesVisited = res.data || [];
                    $scope.companiesVisitedCarousel.totalPages = res.totalPages || 1;
                });
            }

            $scope.submitAddCompany = function () {
                if (!$scope.addCompanyForm.name) return;

                CampusService.addCompany($scope.addCompanyForm)
                    .then(function () {
                        loadCompaniesVisited();
                        $scope.closeAddCompanyModal();
                    });
            };


            // --------------------------- end company visited api 



            // ------------------------- add upload prospectus 

        $scope.submitProspectus = function () {
    var formData = new FormData();
    formData.append('file', $scope.prospectusForm.campus);
    formData.append('courseId', $scope.prospectusForm.course);

    ApiService.post(
        API_ENDPOINTS.CAMPUS.PROSPECTUS_UPLOAD,
        formData,
        { headers: { 'Content-Type': undefined } }
    )
    .then(function (res) {
        console.log('Uploaded:', res.data);
        $scope.loadProspectus(); // refresh list
        $scope.closeProspectusModal();
    })
    .catch(console.error);
};

// ---------------- GET LIST PROSPECTUS
$scope.loadProspectus = function () {
    ApiService.get(API_ENDPOINTS.CAMPUS.PROSPECTUS_LIST)
        .then(function (res) {
            $scope.prospectusList = res.data;
        })
        .catch(console.error);
};

$scope.loadProspectus(); // on controller init

// ------------------ DOWNLOAD PROSPECTUS

$scope.downloadProspectus = function (id) {
    window.open(
        API_ENDPOINTS.CAMPUS.PROSPECTUS_DOWNLOAD.replace(':id', id),
        '_blank'
    );
};

// -------------------- DELETE PROSPECTUS 

$scope.deleteProspectus = function (id) {
    ApiService.delete(
        API_ENDPOINTS.CAMPUS.PROSPECTUS_DELETE.replace(':id', id)
    )
    .then(function () {
        $scope.prospectusList =
            $scope.prospectusList.filter(p => p.id !== id);
    })
    .catch(console.error);
};



            // ---------------------------- end upload prospectus 


            // -------------------------------------------------------------------------------------------------------------


            // API Call Example:
            // ApiService.get(API_ENDPOINTS.CAMPUS.COURSES)
            //     .then(function(response) {
            //         $scope.courses = response.data || response || [];
            //         $scope.loading = false;
            //     })
            //     .catch(function(error) {
            //         console.error('Error loading courses:', error);
            //         $scope.loading = false;
            //         // Fallback to mock data
            //         $scope.courses = [
            //             {
            //                 id: 1,
            //                 name: 'BCA',
            //                 fullName: 'Bachelor of Computer Applications',
            //                 seats: 50,
            //                 duration: '3 Yr'
            //             }
            //         ];
            //     });

            // Mock data (remove when API is ready)
            $scope.courses = [
                {
                    id: 1,
                    name: 'BCA',
                    fullName: 'Bachelor of Computer Applications',
                    seats: 50,
                    duration: '3 Yr'
                }
            ];
            $scope.loading = false;
        }

        $scope.closeCoursesModal = function () {
            $scope.showCoursesModal = false;
        };

        $scope.openCourseDetailsModal = function (course) {
            if (course) {
                // Edit existing course
                $scope.courseForm = {
                    id: course.id,
                    name: course.name,
                    fullName: course.fullName,
                    seats: course.seats,
                    duration: course.duration
                };
            } else {
                // Add new course
                $scope.courseForm = {
                    id: null,
                    name: '',
                    fullName: '',
                    seats: null,
                    duration: ''
                };
            }
            $scope.showCourseDetailsModal = true;
        };

        $scope.closeCourseDetailsModal = function () {
            $scope.showCourseDetailsModal = false;
            $scope.courseForm = {
                id: null,
                name: '',
                fullName: '',
                seats: null,
                duration: ''
            };
        };

        $scope.saveCourseDetails = function () {
            if (
                !$scope.courseForm.name ||
                !$scope.courseForm.duration ||
                !$scope.courseForm.seats
            ) {
                // TODO: Show validation error
                return;
            }

            $scope.loading = true;
            // API Call Example:
            // const courseData = {
            //     name: $scope.courseForm.name,
            //     fullName: $scope.courseForm.fullName,
            //     seats: $scope.courseForm.seats,
            //     duration: $scope.courseForm.duration
            // };
            //
            // if ($scope.courseForm.id) {
            //     // Update existing course
            //     ApiService.put(API_ENDPOINTS.CAMPUS.COURSES_UPDATE.replace(':id', $scope.courseForm.id), courseData)
            //         .then(function(response) {
            //             $scope.loading = false;
            //             loadCourses(); // Reload courses list
            //             $scope.closeCourseDetailsModal();
            //         })
            //         .catch(function(error) {
            //             console.error('Error updating course:', error);
            //             $scope.loading = false;
            //             // TODO: Show error message
            //         });
            // } else {
            //     // Create new course
            //     ApiService.post(API_ENDPOINTS.CAMPUS.COURSES, courseData)
            //         .then(function(response) {
            //             $scope.loading = false;
            //             loadCourses(); // Reload courses list
            //             $scope.closeCourseDetailsModal();
            //         })
            //         .catch(function(error) {
            //             console.error('Error creating course:', error);
            //             $scope.loading = false;
            //             // TODO: Show error message
            //         });
            // }

            // Mock implementation (remove when API is ready)
            if ($scope.courseForm.id) {
                // Update existing
                const index = $scope.courses.findIndex(c => c.id === $scope.courseForm.id);
                if (index !== -1) {
                    $scope.courses[index] = angular.copy($scope.courseForm);
                }
            } else {
                // Add new
                const newCourse = {
                    id: Date.now(),
                    name: $scope.courseForm.name,
                    fullName: $scope.courseForm.fullName,
                    seats: $scope.courseForm.seats,
                    duration: $scope.courseForm.duration
                };
                $scope.courses.push(newCourse);
            }
            $scope.loading = false;
            $scope.closeCourseDetailsModal();
        };

        // Prospectus Modal Functions
        $scope.closeProspectusModal = function () {
            $scope.showProspectusModal = false;
            $scope.prospectusForm = {
                campus: '',
                course: ''
            };
        };

        $scope.submitProspectus = function () {
            if (!$scope.prospectusForm.campus || !$scope.prospectusForm.course) {
                // TODO: Show validation error
                return;
            }

            $scope.loading = true;
            // API Call Example:
            // const prospectusData = {
            //     campus: $scope.prospectusForm.campus,
            //     courseId: $scope.prospectusForm.course
            // };
            //
            // ApiService.post(API_ENDPOINTS.CAMPUS.PROSPECTUS, prospectusData)
            //     .then(function(response) {
            //         $scope.loading = false;
            //         $scope.closeProspectusModal();
            //         // TODO: Show success message
            //     })
            //     .catch(function(error) {
            //         console.error('Error uploading prospectus:', error);
            //         $scope.loading = false;
            //         // TODO: Show error message
            //     });

            // Mock implementation (remove when API is ready)
            console.log('Submitting prospectus:', $scope.prospectusForm);
            $scope.loading = false;
            $scope.closeProspectusModal();
        };

        loadCampusData();

        // --------------- add 

        loadCurrentBatch();
        loadPosts();
        loadPlacedStudents();
        loadCompaniesVisited();
        loadAlumni(2024);


        // ---------- end add 
    }
]);

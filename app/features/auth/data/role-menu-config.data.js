/**
 * Role-Based Menu Configuration
 * Dynamic menu configuration for different user roles
 * Each role has its own set of menu items with titles and URLs
 */
angular.module('campusApp.auth').constant('ROLE_MENU_CONFIG', {
    /**
     * Menu configuration for CAMPUS_USER role
     */
    CAMPUS_USER: [
        {
            id: 'campus-about',
            label: 'About campus',
            // Match design (double chevron)
            icon: 'fa-angle-double-right',
            route: '/campus/about',
            order: 1,
            module: 'campus'
        },
        {
            id: 'campus-courses',
            label: 'Courses',
            // Match design (double chevron)
            icon: 'fa-angle-double-right',
            route: '#', // Modal will open instead
            order: 2,
            module: 'campus'
        },
        {
            id: 'campus-prospectus',
            label: 'Upload Prospectus',
            icon: 'fa-upload',
            route: '#', // Modal will open instead
            order: 3,
            module: 'campus'
        }
    ],

    /**
     * Menu configuration for STUDENT role
     */
    STUDENT: [
        {
            id: 'student-profile',
            label: 'Get to Know Me',
            icon: 'fa-angle-double-right',
            route: '/student/profile',
            order: 1,
            module: 'student'
        },
        {
            id: 'student-learning-pathway',
            label: 'Learning Pathway',
            icon: 'fa-book',
            route: '#', // Modal will open instead
            order: 2,
            module: 'student'
        },
        {
            id: 'student-resume',
            label: 'Resume',
            icon: 'fa-file-lines',
            route: '#', // Modal will open instead
            order: 3,
            module: 'student'
        },
        {
            id: 'student-dream-job-toolkit',
            label: 'Your Dream Job Toolkit',
            icon: 'fa-briefcase',
            route: '#', // Modal will open instead
            order: 4,
            module: 'student'
        },
        {
            id: 'student-career-checkin',
            label: 'Career Check-In',
            icon: 'fa-id-card',
            route: '#', // Modal will open instead
            order: 5,
            module: 'student'
        }
    ],

    /**
     * Menu configuration for COMPANY role
     */
    COMPANY: [
        {
            id: 'company-about',
            label: 'About company',
            icon: 'fa-angle-double-right',
            route: '/company/about',
            order: 1,
            module: 'company'
        },
        {
            id: 'company-specialization',
            label: 'Specialization',
            icon: 'fa-angle-double-right',
            route: '#', // Modal will open instead
            order: 2,
            module: 'company'
        },
        {
            id: 'company-vision-performance',
            label: 'Vision & Performance',
            icon: 'fa-angle-double-right',
            route: '#', // Modal will open instead
            order: 3,
            module: 'company'
        },
        {
            id: 'company-current-vacancy',
            label: 'Current vacancy',
            icon: 'fa-angle-double-right',
            route: '#', // Modal will open instead
            order: 4,
            module: 'company'
        },
        {
            id: 'company-benefits',
            label: 'Benefits Offer',
            icon: 'fa-angle-double-right',
            route: '#', // Modal will open instead
            order: 5,
            module: 'company'
        }
    ],

    /**
     * Helper function to get menu items for a specific role
     * @param {string} role - User role (CAMPUS_USER, STUDENT, COMPANY)
     * @returns {Array} Array of menu items for the role
     */
    getMenuItemsForRole: function (role) {
        switch (role) {
            case 'CAMPUS_USER':
                return this.CAMPUS_USER;
            case 'STUDENT':
                return this.STUDENT;
            case 'COMPANY':
                return this.COMPANY;
            default:
                return [];
        }
    },

    /**
     * Helper function to get all menu configurations
     * @returns {Object} Object containing all role menu configurations
     */
    getAllMenus: function () {
        return {
            CAMPUS_USER: this.CAMPUS_USER,
            STUDENT: this.STUDENT,
            COMPANY: this.COMPANY
        };
    }
});

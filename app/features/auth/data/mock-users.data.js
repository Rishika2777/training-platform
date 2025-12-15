/**
 * Mock Users Data
 * JSON mock data for user authentication with different roles
 * This file contains test users for development and testing purposes
 */
angular.module('campusApp.auth').constant('MOCK_USERS', {
    users: [
        {
            id: 1,
            email: 'admin@synkup.com',
            password: 'admin123',
            name: 'Admin User',
            role: 'ADMIN',
            roles: ['ADMIN', 'SUPER_ADMIN'],
            permissions: ['*'],
            profile: {
                avatar: 'assets/images/admin-avatar.jpg',
                phone: '+91 9876543210',
                department: 'Administration'
            }
        },
        {
            id: 2,
            email: 'superadmin@synkup.com',
            password: 'superadmin123',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            roles: ['SUPER_ADMIN', 'ADMIN'],
            permissions: ['*'],
            profile: {
                avatar: 'assets/images/superadmin-avatar.jpg',
                phone: '+91 9876543211',
                department: 'System Administration'
            }
        },
        {
            id: 3,
            email: 'campus@synkup.com',
            password: 'campus123',
            name: 'Campus User',
            role: 'CAMPUS_USER',
            roles: ['CAMPUS_USER'],
            permissions: ['campus:read', 'campus:write', 'student:read', 'student:write'],
            profile: {
                avatar: 'assets/images/campus-user-avatar.jpg',
                phone: '+91 9876543212',
                campusName: 'Mangalore University',
                campusId: 1
            }
        },
        {
            id: 4,
            email: 'company@synkup.com',
            password: 'company123',
            name: 'Company User',
            role: 'COMPANY',
            roles: ['COMPANY'],
            permissions: ['company:read', 'company:write', 'job:read', 'job:write'],
            profile: {
                avatar: 'assets/images/company-avatar.jpg',
                phone: '+91 9876543213',
                companyName: 'Tech Solutions Inc.',
                companyId: 1
            }
        },
        {
            id: 5,
            email: 'student@synkup.com',
            password: 'student123',
            name: 'Student User',
            role: 'STUDENT',
            roles: ['STUDENT'],
            permissions: ['student:read', 'profile:read', 'profile:write'],
            profile: {
                avatar: 'assets/images/student-avatar.jpg',
                phone: '+91 9876543214',
                studentId: 'STU001',
                campusId: 1,
                batch: '2024',
                course: 'BCA'
            }
        },
        {
            id: 6,
            email: 'user@synkup.com',
            password: 'user123',
            name: 'Regular User',
            role: 'USER',
            roles: ['USER'],
            permissions: ['profile:read'],
            profile: {
                avatar: 'assets/images/user-avatar.jpg',
                phone: '+91 9876543215'
            }
        }
    ],
    // Helper function to find user by email
    findByEmail: function (email) {
        return this.users.find(function (user) {
            return user.email.toLowerCase() === email.toLowerCase();
        });
    },
    // Helper function to find user by credentials
    findByCredentials: function (email, password) {
        return this.users.find(function (user) {
            return user.email.toLowerCase() === email.toLowerCase() && user.password === password;
        });
    },
    // Helper function to get user by ID
    findById: function (id) {
        return this.users.find(function (user) {
            return user.id === id;
        });
    }
});

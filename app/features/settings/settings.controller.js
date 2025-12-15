/**
 * Settings Controller
 * Drives settings view based on route param
 */
angular.module('campusApp').controller('SettingsController', [
    '$scope',
    '$routeParams',
    '$location',
    'RoleService',
    function ($scope, $routeParams, $location, RoleService) {
        'use strict';

        function getSectionFromParams() {
            const section = $routeParams.section;
            return section && typeof section === 'string' ? section : '';
        }

        function getAdminSections() {
            return [
                { id: 'app-customization', label: 'App Customization' },
                { id: 'user-roles-permissions', label: 'User Roles & Permissions' },
                { id: 'system-logs', label: 'System logs' },
                { id: 'data-backup-restore', label: 'Data Backup & Restore' },
                { id: 'report-issues', label: 'Report Issues' },
                { id: 'security', label: 'Security' }
            ];
        }

        function getUserSections() {
            return [
                { id: 'profile', label: 'Profile' },
                { id: 'password', label: 'Password' },
                { id: 'contact-support', label: 'Contact Support' },
                { id: 'report-issues', label: 'Report Issues' },
                { id: 'delete-account', label: 'Delete Account', tone: 'danger' }
            ];
        }

        function getSectionsForRole() {
            return RoleService.isAdmin() ? getAdminSections() : getUserSections();
        }

        function buildSections() {
            return getSectionsForRole().map(function (item) {
                return {
                    id: item.id,
                    label: item.label,
                    tone: item.tone || 'default',
                    route: '/settings/' + item.id
                };
            });
        }

        function getDefaultSection() {
            const sections = getSectionsForRole();
            return sections.length ? sections[0].id : 'profile';
        }

        function findSectionById(sections, id) {
            if (!Array.isArray(sections) || !id) {
                return null;
            }
            return (
                sections.find(function (s) {
                    return s.id === id;
                }) || null
            );
        }

        function ensureValidSectionRoute() {
            const section = getSectionFromParams();
            const sections = buildSections();
            const defaultId = getDefaultSection();

            if (!section) {
                $location.path('/settings/' + defaultId);
                return;
            }

            if (!findSectionById(sections, section)) {
                $location.path('/settings/' + defaultId);
            }
        }

        function updateActiveSection() {
            const section = getSectionFromParams() || getDefaultSection();
            $scope.activeSection = section;
            $scope.activeSectionConfig = findSectionById($scope.sections, section);
        }

        $scope.sections = buildSections();
        $scope.activeSection = getDefaultSection();
        $scope.activeSectionConfig = null;

        $scope.goToSection = function (section) {
            if (!section || !section.route) {
                return;
            }
            $location.path(section.route);
        };

        ensureValidSectionRoute();
        updateActiveSection();

        $scope.$on('$routeChangeSuccess', function () {
            // Rebuild on route change in case role changed
            $scope.sections = buildSections();
            updateActiveSection();
        });
    }
]);

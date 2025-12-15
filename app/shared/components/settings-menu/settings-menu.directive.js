/**
 * Settings Menu Directive
 * Header dropdown for settings quick navigation
 */
angular.module('campusApp').directive('appSettingsMenu', [
    '$document',
    '$location',
    'RoleService',
    function ($document, $location, RoleService) {
        'use strict';

        return {
            restrict: 'E',
            templateUrl: 'app/shared/components/settings-menu/settings-menu.html',
            scope: {
                isOpen: '=',
                anchorId: '@',
                onClose: '&?'
            },
            link: function (scope, element) {
                function getAdminItems() {
                    return [
                        {
                            id: 'app-customization',
                            label: 'App Customization',
                            route: '/settings/app-customization'
                        },
                        {
                            id: 'user-roles-permissions',
                            label: 'User Roles & Permissions',
                            route: '/settings/user-roles-permissions'
                        },
                        { id: 'system-logs', label: 'System logs', route: '/settings/system-logs' },
                        {
                            id: 'data-backup-restore',
                            label: 'Data Backup & Restore',
                            route: '/settings/data-backup-restore'
                        },
                        {
                            id: 'report-issues',
                            label: 'Report Issues',
                            route: '/settings/report-issues'
                        },
                        { id: 'security', label: 'Security', route: '/settings/security' }
                    ];
                }

                function getUserItems() {
                    return [
                        { id: 'profile', label: 'Profile', route: '/settings/profile' },
                        { id: 'password', label: 'Password', route: '/settings/password' },
                        {
                            id: 'data-privacy',
                            label: 'Data Privacy',
                            route: '/settings/data-privacy'
                        },
                        { id: 'visibility', label: 'Visibility', route: '/settings/visibility' },
                        {
                            id: 'contact-support',
                            label: 'Contact Support',
                            route: '/settings/contact-support'
                        },
                        {
                            id: 'report-issues',
                            label: 'Report Issues',
                            route: '/settings/report-issues'
                        },
                        {
                            id: 'delete-account',
                            label: 'Delete Account',
                            route: '/settings/delete-account',
                            tone: 'danger'
                        }
                    ];
                }

                function buildItems() {
                    return RoleService.isAdmin() ? getAdminItems() : getUserItems();
                }

                scope.items = buildItems();

                function close() {
                    if (scope.onClose) {
                        scope.onClose();
                        return;
                    }
                    scope.isOpen = false;
                }

                function closeOnOutsideClick(event) {
                    if (!scope.isOpen) {
                        return;
                    }

                    const target = event.target;
                    const menuEl = element[0];
                    const anchorEl = scope.anchorId
                        ? document.getElementById(scope.anchorId)
                        : null;

                    if (menuEl && menuEl.contains(target)) {
                        return;
                    }

                    if (anchorEl && anchorEl.contains(target)) {
                        return;
                    }

                    scope.$apply(close);
                }

                function closeOnEscape(event) {
                    if (!scope.isOpen) {
                        return;
                    }

                    if (event.key === 'Escape' || event.keyCode === 27) {
                        scope.$apply(close);
                    }
                }

                scope.handleSelect = function (item) {
                    if (!item || !item.route) {
                        close();
                        return;
                    }

                    $location.path(item.route);
                    close();
                };

                $document.on('click', closeOnOutsideClick);
                $document.on('keydown', closeOnEscape);

                scope.$on('$destroy', function () {
                    $document.off('click', closeOnOutsideClick);
                    $document.off('keydown', closeOnEscape);
                });
            }
        };
    }
]);

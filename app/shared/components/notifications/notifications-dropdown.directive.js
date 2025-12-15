/**
 * Notifications Dropdown Directive
 * Header dropdown for recent notifications
 */
angular.module('campusApp').directive('appNotificationsDropdown', [
    '$document',
    'NotificationService',
    function ($document, NotificationService) {
        'use strict';

        return {
            restrict: 'E',
            templateUrl: 'app/shared/components/notifications/notifications-dropdown.html',
            scope: {
                isOpen: '=',
                anchorId: '@',
                onClose: '&?'
            },
            link: function (scope, element) {
                scope.state = {
                    isLoading: false,
                    errorMessage: '',
                    notifications: [],
                    groups: []
                };

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
                    const dropdownEl = element[0];
                    const anchorEl = scope.anchorId
                        ? document.getElementById(scope.anchorId)
                        : null;

                    if (dropdownEl && dropdownEl.contains(target)) {
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

                function groupNotifications(notifications) {
                    if (!Array.isArray(notifications)) {
                        return [];
                    }
                    const groups = {};
                    notifications.forEach(function (n) {
                        const key = n.group || 'Today';
                        if (!groups[key]) {
                            groups[key] = [];
                        }
                        groups[key].push(n);
                    });

                    return Object.keys(groups).map(function (key) {
                        return {
                            label: key,
                            items: groups[key]
                        };
                    });
                }

                function loadNotifications() {
                    scope.state.isLoading = true;
                    scope.state.errorMessage = '';

                    NotificationService.getRecent({ limit: 10 })
                        .then(
                            function (items) {
                                scope.state.notifications = items || [];
                                scope.state.groups = groupNotifications(scope.state.notifications);
                            },
                            function () {
                                scope.state.errorMessage = 'Unable to load notifications.';
                                scope.state.notifications = [];
                                scope.state.groups = [];
                            }
                        )
                        .finally(function () {
                            scope.state.isLoading = false;
                        });
                }

                scope.handleMarkAllRead = function () {
                    NotificationService.markAllRead().finally(function () {
                        close();
                    });
                };

                scope.handleSeePrevious = function () {
                    close();
                };

                scope.$watch('isOpen', function (next) {
                    if (next) {
                        loadNotifications();
                    }
                });

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

/**
 * Notification Service
 * Centralized service for fetching user notifications
 */
angular.module('campusApp').service('NotificationService', [
    '$q',
    'ApiService',
    'API_ENDPOINTS',
    function ($q, ApiService, API_ENDPOINTS) {
        'use strict';

        function getMockNotifications() {
            return [
                {
                    id: 'n1',
                    title: 'Ankita Willson has just posted a comment.',
                    timeLabel: '4h',
                    avatarUrl: 'assets/images/login-hero-image.png',
                    group: 'New'
                },
                {
                    id: 'n2',
                    title: 'Ankita Willson has just posted a comment.',
                    timeLabel: '4h',
                    avatarUrl: 'assets/images/login-hero-image.png',
                    group: 'New'
                },
                {
                    id: 'n3',
                    title: 'Amit Deshpande has posted a reel.',
                    timeLabel: '8h',
                    avatarUrl: 'assets/images/login-news-image.png',
                    group: 'Today'
                },
                {
                    id: 'n4',
                    title: 'Amit Deshpande has posted a reel.',
                    timeLabel: '9h',
                    avatarUrl: 'assets/images/login-news-image.png',
                    group: 'Today'
                }
            ];
        }

        function getNotificationsEndpoint() {
            if (!API_ENDPOINTS || !API_ENDPOINTS.NOTIFICATIONS) {
                return null;
            }
            return API_ENDPOINTS.NOTIFICATIONS.LIST || null;
        }

        function normalizeNotifications(data) {
            if (!data) {
                return [];
            }

            // If API returns { items: [...] }
            if (data.items && Array.isArray(data.items)) {
                return data.items;
            }

            // If API returns [...] directly
            if (Array.isArray(data)) {
                return data;
            }

            return [];
        }

        /**
         * Fetch recent notifications
         * - Keeps API call isolated here so UI integration stays stable
         */
        this.getRecent = function (options) {
            const endpoint = getNotificationsEndpoint();
            const limit = options && typeof options.limit === 'number' ? options.limit : 10;

            if (!endpoint) {
                return $q.resolve(getMockNotifications());
            }

            return ApiService.get(endpoint, { limit: limit }).then(
                function (data) {
                    const items = normalizeNotifications(data);
                    return items.length ? items : getMockNotifications();
                },
                function () {
                    // Do not break UI if backend is not ready yet
                    return getMockNotifications();
                }
            );
        };

        /**
         * Mark all notifications as read
         * Uses API endpoint when available; otherwise no-ops.
         */
        this.markAllRead = function () {
            const endpoint =
                API_ENDPOINTS &&
                API_ENDPOINTS.NOTIFICATIONS &&
                API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
                    ? API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
                    : null;

            if (!endpoint) {
                return $q.resolve(true);
            }

            return ApiService.post(endpoint, {}).then(
                function () {
                    return true;
                },
                function () {
                    // Do not break UI if backend is not ready yet
                    return true;
                }
            );
        };
    }
]);

/**
 * Storage Service
 * Centralized service for localStorage/sessionStorage operations
 */
angular.module('campusApp').service('StorageService', [
    function () {
        'use strict';

        /**
         * Set item in localStorage
         */
        this.set = function (key, value) {
            try {
                const serializedValue = angular.isObject(value) ? JSON.stringify(value) : value;
                localStorage.setItem(key, serializedValue);
                return true;
            } catch (e) {
                console.error('Error saving to localStorage:', e);
                return false;
            }
        };

        /**
         * Get item from localStorage
         */
        this.get = function (key) {
            try {
                const item = localStorage.getItem(key);
                if (!item) {
                    return null;
                }

                // Try to parse as JSON, if fails return as string
                try {
                    return JSON.parse(item);
                } catch (e) {
                    return item;
                }
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return null;
            }
        };

        /**
         * Remove item from localStorage
         */
        this.remove = function (key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Error removing from localStorage:', e);
                return false;
            }
        };

        /**
         * Clear all items from localStorage
         */
        this.clear = function () {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('Error clearing localStorage:', e);
                return false;
            }
        };

        /**
         * Set item in sessionStorage
         */
        this.setSession = function (key, value) {
            try {
                const serializedValue = angular.isObject(value) ? JSON.stringify(value) : value;
                sessionStorage.setItem(key, serializedValue);
                return true;
            } catch (e) {
                console.error('Error saving to sessionStorage:', e);
                return false;
            }
        };

        /**
         * Get item from sessionStorage
         */
        this.getSession = function (key) {
            try {
                const item = sessionStorage.getItem(key);
                if (!item) {
                    return null;
                }

                try {
                    return JSON.parse(item);
                } catch (e) {
                    return item;
                }
            } catch (e) {
                console.error('Error reading from sessionStorage:', e);
                return null;
            }
        };

        /**
         * Remove item from sessionStorage
         */
        this.removeSession = function (key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Error removing from sessionStorage:', e);
                return false;
            }
        };
    }
]);

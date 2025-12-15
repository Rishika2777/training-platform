/**
 * Main Application Module
 * CRM Application - Modular Architecture
 */
angular.module('campusApp', [
    'ngRoute',
    'campusApp.auth',
    'campusApp.dashboard',
    'campusApp.campus',
    'campusApp.courses',
    'campusApp.admin',
    'campusApp.registration',
    'campusApp.student',
    'campusApp.company',
    'campusApp.settings'
]);

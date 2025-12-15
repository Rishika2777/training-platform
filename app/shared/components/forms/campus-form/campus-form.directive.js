/**
 * Campus Form Directive
 * Reusable campus form component supporting create, edit, and review modes
 */
angular.module('campusApp').directive('appCampusForm', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/forms/campus-form/campus-form.html',
        scope: {
            campusData: '=ngModel',
            mode: '@?', // 'create', 'edit', 'review'
            onSubmit: '&?',
            onCancel: '&?',
            formTitle: '@?'
        },
        link: function (scope, element, attrs) {
            scope.mode = scope.mode || 'create';
            scope.isReviewMode = scope.mode === 'review';
            scope.isEditMode = scope.mode === 'edit';
            scope.isCreateMode = scope.mode === 'create';

            scope.formTitle =
                scope.formTitle ||
                (scope.isCreateMode
                    ? 'Campus Registration Form'
                    : scope.isEditMode
                      ? 'Edit Campus'
                      : 'Review Campus');

            // Initialize form data if not provided
            if (!scope.campusData) {
                scope.campusData = {
                    name: '',
                    rank: '',
                    website: '',
                    about: '',
                    address: '',
                    adminName: '',
                    adminEmail: '',
                    adminPhone: '',
                    adminDept: '',
                    adminDesignation: '',
                    photo: null
                };
            }

            scope.handleSubmit = function () {
                if (scope.onSubmit) {
                    scope.onSubmit({ campus: scope.campusData });
                }
            };

            scope.handleCancel = function () {
                if (scope.onCancel) {
                    scope.onCancel();
                }
            };
        }
    };
});

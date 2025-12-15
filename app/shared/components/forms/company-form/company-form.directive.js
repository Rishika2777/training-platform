/**
 * Company Form Directive
 * Reusable company form component supporting create, edit, and review modes
 */
angular.module('campusApp').directive('appCompanyForm', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/forms/company-form/company-form.html',
        scope: {
            companyData: '=ngModel',
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
                    ? 'Company Registration Form'
                    : scope.isEditMode
                      ? 'Edit Company'
                      : 'Review Company');

            // Initialize form data if not provided
            if (!scope.companyData) {
                scope.companyData = {
                    name: '',
                    website: '',
                    otherWebsite: '',
                    registerNumber: '',
                    about: '',
                    address: '',
                    adminName: '',
                    adminEmail: '',
                    adminPhone: '',
                    adminDesignation: '',
                    photo: null,
                    keyPeople: []
                };
            }

            // Initialize keyPeople array if not exists
            if (!scope.companyData.keyPeople || scope.companyData.keyPeople.length === 0) {
                scope.companyData.keyPeople = [
                    {
                        name: '',
                        designation: '',
                        photo: null
                    }
                ];
            }

            scope.addKeyPerson = function () {
                scope.companyData.keyPeople.push({
                    name: '',
                    designation: '',
                    photo: null
                });
            };

            scope.removeKeyPerson = function (index) {
                if (scope.companyData.keyPeople && scope.companyData.keyPeople.length > 1) {
                    scope.companyData.keyPeople.splice(index, 1);
                }
            };

            scope.removeKeyPersonAtIndex = function (index) {
                return function () {
                    scope.removeKeyPerson(index);
                };
            };

            scope.handleSubmit = function () {
                if (scope.onSubmit) {
                    scope.onSubmit({ company: scope.companyData });
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

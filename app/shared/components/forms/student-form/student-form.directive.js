/**
 * Student Form Directive
 * Reusable multi-step student form component supporting create, edit, and review modes
 */
angular.module('campusApp').directive('appStudentForm', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/forms/student-form/student-form.html',
        scope: {
            studentData: '=ngModel',
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
                    ? 'Student Registration Form'
                    : scope.isEditMode
                      ? 'Edit Student'
                      : 'Review Student');

            // Initialize form data if not provided
            if (!scope.studentData) {
                scope.studentData = {
                    firstName: '',
                    lastName: '',
                    dateOfBirth: '',
                    gender: '',
                    mobile: '',
                    email: '',
                    address: '',
                    profileSummary: '',
                    education: {
                        degree: '',
                        institution: '',
                        year: '',
                        gpa: ''
                    },
                    skills: [],
                    experience: []
                };
            }

            // Define form steps
            scope.steps = [
                { label: 'Personal Information' },
                { label: 'Education Details' },
                { label: 'Skills and Experience' },
                { label: 'Additional Information' }
            ];

            scope.currentStep = 0;

            // Initialize education if not exists
            if (!scope.studentData.education) {
                scope.studentData.education = {
                    degree: '',
                    institution: '',
                    year: '',
                    gpa: ''
                };
            }

            // Initialize skills and experience arrays
            if (!scope.studentData.skills) {
                scope.studentData.skills = [];
            }
            if (!scope.studentData.experience) {
                scope.studentData.experience = [];
            }

            scope.genderOptions = [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
            ];

            scope.nextStep = function () {
                if (scope.currentStep < scope.steps.length - 1) {
                    scope.currentStep++;
                }
            };

            scope.prevStep = function () {
                if (scope.currentStep > 0) {
                    scope.currentStep--;
                }
            };

            scope.goToStep = function (index) {
                if (index >= 0 && index < scope.steps.length) {
                    scope.currentStep = index;
                }
            };

            scope.handleSubmit = function () {
                if (scope.onSubmit) {
                    scope.onSubmit({ student: scope.studentData });
                }
            };

            scope.handleCancel = function () {
                if (scope.onCancel) {
                    scope.onCancel();
                }
            };

            scope.isLastStep = function () {
                return scope.currentStep === scope.steps.length - 1;
            };

            scope.isFirstStep = function () {
                return scope.currentStep === 0;
            };

            // Initialize newSkill for skills input
            scope.newSkill = '';

            scope.addSkill = function () {
                if (scope.newSkill && scope.newSkill.trim()) {
                    scope.studentData.skills.push(scope.newSkill.trim());
                    scope.newSkill = '';
                }
            };
        }
    };
});

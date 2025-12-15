/**
 * Input Directive
 * Reusable input component with validation and file upload support
 */
angular.module('campusApp').directive('appInput', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/input/input.html',
        require: '?ngModel',
        scope: {
            type: '@?',
            model: '=ngModel',
            placeholder: '@?',
            label: '@?',
            required: '=?',
            disabled: '=?',
            error: '@?',
            accept: '@?',
            icon: '@?',
            multiple: '=?',
            onFileSelect: '&?'
        },
        link: function (scope, element, attrs, ngModelCtrl) {
            scope.type = scope.type || 'text';
            scope.inputId = 'input-' + Math.random().toString(36).substr(2, 9);

            if (scope.type === 'file') {
                scope.showIcon = scope.icon !== 'none';
                scope.icon = scope.icon || 'fa-paperclip';
                scope.isFileInput = true;
                scope.selectedFiles = null;

                scope.getFileName = function () {
                    if (
                        !scope.selectedFiles ||
                        (scope.selectedFiles.length !== undefined &&
                            scope.selectedFiles.length === 0) ||
                        (!scope.selectedFiles.length && !scope.selectedFiles.name)
                    ) {
                        return scope.placeholder || 'Choose file';
                    }

                    if (scope.multiple && scope.selectedFiles.length > 1) {
                        return scope.selectedFiles.length + ' files selected';
                    }

                    const file =
                        scope.multiple && scope.selectedFiles.length
                            ? scope.selectedFiles[0]
                            : scope.selectedFiles;
                    return file && file.name ? file.name : 'File selected';
                };

                const fileInput = element.find('input[type="file"]');

                fileInput.on('change', function (event) {
                    const files = event.target.files;
                    if (files && files.length > 0) {
                        scope.selectedFiles = scope.multiple
                            ? Array.prototype.slice.call(files)
                            : files[0];

                        if (ngModelCtrl) {
                            ngModelCtrl.$setViewValue(scope.selectedFiles);
                        }

                        if (scope.model !== undefined) {
                            scope.model = scope.selectedFiles;
                        }

                        if (scope.onFileSelect) {
                            scope.onFileSelect({ files: scope.selectedFiles });
                        }

                        scope.$apply();
                    }
                });

                scope.$watch('model', function (newVal) {
                    if (newVal && (newVal.length || newVal.name)) {
                        scope.selectedFiles = newVal;
                    }
                });
            } else {
                scope.showIcon = false;
                scope.isFileInput = false;
            }
        }
    };
});

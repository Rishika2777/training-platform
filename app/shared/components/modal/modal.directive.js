/**
 * Modal Directive
 * Reusable modal component with comprehensive properties
 */
angular.module('campusApp').directive('appModal', [
    '$document',
    '$timeout',
    function ($document, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'app/shared/components/modal/modal.html',
            transclude: {
                header: '?modalHeader',
                body: 'modalBody',
                footer: '?modalFooter'
            },
            scope: {
                isVisible: '=?ngShow',
                visible: '=?',
                title: '@?',
                size: '@?',
                closeOnBackdrop: '=?',
                closeOnEscape: '=?',
                showCloseButton: '=?',
                onClose: '&?',
                modalClass: '@?'
            },
            link: function (scope, element, attrs) {
                scope.size = scope.size || 'md';
                scope.closeOnBackdrop = scope.closeOnBackdrop !== false;
                scope.closeOnEscape = scope.closeOnEscape !== false;
                scope.showCloseButton = scope.showCloseButton !== false;

                // Initialize isVisible from visible attribute if provided
                if (attrs.visible !== undefined && scope.visible !== undefined) {
                    scope.isVisible = scope.visible;
                } else if (attrs.ngShow !== undefined && scope.isVisible !== undefined) {
                    // Use ngShow if provided
                    // isVisible is already bound via scope binding
                } else {
                    scope.isVisible = false;
                }

                // Watch visible attribute and update isVisible
                scope.$watch('visible', function (newVal) {
                    if (newVal !== undefined) {
                        scope.isVisible = newVal;
                    }
                });

                // Watch isVisible and update visible if it's bound
                scope.$watch('isVisible', function (newVal) {
                    if (attrs.visible !== undefined && scope.visible !== undefined) {
                        scope.visible = newVal;
                    }
                });

                scope.close = function () {
                    if (scope.onClose) {
                        scope.onClose();
                    } else {
                        scope.isVisible = false;
                        if (attrs.visible !== undefined && scope.visible !== undefined) {
                            scope.visible = false;
                        }
                    }
                };

                scope.closeOnBackdropClick = function (event) {
                    if (scope.closeOnBackdrop && event.target === event.currentTarget) {
                        scope.close();
                        scope.$apply();
                    }
                };

                const escapeKeyHandler = function (event) {
                    if (scope.isVisible && scope.closeOnEscape && event.keyCode === 27) {
                        scope.close();
                        scope.$apply();
                    }
                };

                if (scope.closeOnEscape) {
                    $document.on('keydown', escapeKeyHandler);
                }

                scope.$on('$destroy', function () {
                    if (scope.closeOnEscape) {
                        $document.off('keydown', escapeKeyHandler);
                    }
                });

                scope.$watch('isVisible', function (newVal) {
                    if (newVal) {
                        $timeout(function () {
                            const modalContent = element[0].querySelector('.app-modal-content');
                            if (modalContent) {
                                modalContent.focus();
                            }
                        }, 100);
                    }
                });
            }
        };
    }
]);

/**
 * For documentation please refer to the project wiki:
 * https://github.com/bvaughn/angular-form-for/wiki/API-Reference#selectfield
 */
angular.module('formFor').directive('selectField',
  function($document, $log, $timeout) {
    return {
      require: '^formFor',
      restrict: 'EA',
      templateUrl: 'form-for/templates/select-field.html',
      scope: {
        attribute: '@',
        disable: '@',
        filter: '=?',
        filterDebounce: '@?',
        help: '@?',
        label: '@?',
        options: '=',
        placeholder: '@?'
      },
      link: function($scope, $element, $attributes, formForController) {
        if (!$scope.attribute) {
          $log.error('Missing required field "attribute"');

          return;
        }

        $scope.allowBlank = $attributes.hasOwnProperty('allowBlank');
        $scope.enableFiltering = $attributes.hasOwnProperty('enableFiltering');

        $scope.labelAttribute = $attributes.labelAttribute || 'label';
        $scope.valueAttribute = $attributes.valueAttribute || 'value';

        $scope.model = formForController.registerFormField($scope, $scope.attribute);

        /*****************************************************************************************
         * The following code pertains to filtering visible options.
         *****************************************************************************************/

        $scope.emptyOption = {};
        $scope.filteredOptions = [];

        var sanitize = function(value) {
          return value && value.toLowerCase();
        };

        var calculateFilteredOptions = function() {
          var options = $scope.options || [];

          $scope.filteredOptions.splice(0);

          if (!$scope.enableFiltering || !$scope.filter) {
            angular.copy(options, $scope.filteredOptions);
          } else {
            var filter = sanitize($scope.filter);

            angular.copy(
              _.filter(options,
                function(option) {
                  return sanitize(option[$scope.labelAttribute]).indexOf(filter) >= 0;
                }),
              $scope.filteredOptions);
          }

          if ($scope.allowBlank) {
            $scope.filteredOptions.unshift($scope.emptyOption);
          }
        };

        $scope.$watch('filter', calculateFilteredOptions);
        $scope.$watch('options.length', calculateFilteredOptions);

        /*****************************************************************************************
         * The following code deals with toggling/collapsing the drop-down and selecting values.
         *****************************************************************************************/

        $scope.$watch('model.bindable', function(value) {
          var option = _.find($scope.options,
            function(option) {
              return value === option[$scope.valueAttribute];
            });

          $scope.selectedOption = option;
          $scope.selectedOptionLabel = option && option[$scope.labelAttribute];
        });

        var oneClick = function(target, handler) {
          $timeout(function() { // Delay to avoid processing the same click event that trigger the toggle-open
            target.one('click', handler);
          }, 1);
        };

        var removeClickWatch = function() {
          $document.off('click', clickWatcher);
        };

        var addClickToOpen = function() {
          oneClick($element.find('.select-field-toggle-button'), clickToOpen);
        };

        $scope.selectOption = function(option) {
          $scope.model.bindable = option && option[$scope.valueAttribute];
          $scope.isOpen = false;

          removeClickWatch();

          addClickToOpen();
        };

        var clickWatcher = function(event) {
          $scope.isOpen = false;
          $scope.$apply();

          removeClickWatch();

          addClickToOpen();
        };

        var scroller = $element.find('.list-group-container');
        var list = $element.find('.list-group');

        var clickToOpen = function() {
          if ($scope.disable || $scope.disabledByForm) {
            addClickToOpen();

            return;
          }

          $scope.isOpen = !$scope.isOpen;

          if ($scope.isOpen) {
            // TODO Determine whether to open downward or upward
            // TODO Auto-focus input field if filterable

            oneClick($document, clickWatcher);

            var value = $scope.model.bindable;

            $timeout(
              angular.bind(
                this,
                function() {
                  var listItem =
                    _.find(list.find('.list-group-item'),
                      function(listItem) {
                        var option = $(listItem).scope().option;

                        return option && option[$scope.valueAttribute] === value;
                      });

                  if (listItem) {
                    scroller.scrollTop(
                      $(listItem).offset().top - $(listItem).parent().offset().top);
                  }
                }), 1);
          }
        };

        addClickToOpen();

        /*****************************************************************************************
         * The following code responds to keyboard events when the drop-down is visible
         *****************************************************************************************/

        $scope.mouseOver = function(index) {
          $scope.mouseOverIndex = index;
          $scope.mouseOverOption = index >= 0 ? $scope.filteredOptions[index] : null;
        };

        // Listen to key down, not up, because ENTER key sometimes gets converted into a click event.
        $scope.keyDown = function(event) {
          switch (event.keyCode) {
            case 27: // Escape key
              $scope.isOpen = false;
              break;
            case 13: // Enter key
              $scope.selectOption($scope.mouseOverOption);
              $scope.isOpen = false;

              // Don't bubble up and submit the parent form
              event.preventDefault();
              event.stopPropagation();
              break;
            case 38: // Up arrow
              $scope.mouseOver( $scope.mouseOverIndex > 0 ? $scope.mouseOverIndex - 1 : $scope.filteredOptions.length - 1 );
              break;
            case 40: // Down arrow
              $scope.mouseOver( $scope.mouseOverIndex < $scope.filteredOptions.length - 1 ? $scope.mouseOverIndex + 1 : 0 );
              break;
          }
        };

        $scope.$watchCollection('[isOpen, filteredOptions.length]', function() {
          $scope.mouseOver(-1); // Reset hover anytime our list opens/closes or our collection is refreshed.
        });

        $scope.$on('$destroy', function() {
          removeClickWatch();
        });
      }
    };
  });

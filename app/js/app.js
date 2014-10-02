$(document).ready(function() {

	// Make sure we have a state
	if (!window.$state) {
		console.log('Error: No state provided.');
		alert('An application error has occurred: No state provided');
		return;
	}

	// Apply it
	var $scope = $('html').scope();
	var $injector = angular.injector(['ng']);

	for (var key in $state) {
		$scope[key] = $state[key];
	}

	$scope.startup = false;
	$scope.$apply();

	// Install custom behaviors

	$('input[type=text].filter').each(function() {
		var $filter = $(this);
		var $ngApp = $('[ng-app]');
		var $scope = $ngApp.scope();
		var property = $filter.data('filter');
		var data = $scope.$eval(property); 
		var filtering = false;
		var subprop = $filter.data('target');	

		var doFilter = function(data, filter) {
			var filteredData = [];

			if (!filter)
				return data;

			for (var key in data) {
				var row = data[key];
				var target = row;
				if (subprop)
					target = row[subprop];

				if (target.indexOf(filter) >= 0) 
					filteredData.push(row);
			}

			return filteredData;
		};

		$scope.$watch(property, function(newValue, oldValue) {
			if (filtering)
				return;
			data = newValue;	
			$filter.change();
		});

		var timeout = null;
		$filter.keydown(function() {
			if (timeout)
				clearTimeout(timeout);

			setTimeout(function() {
				$filter.change();
			}, 500);
		});

		$filter.change(function() {
			filtering = true;
			var innerScope = $scope;
			var comps = property.split('.');
			for (var i in comps) {
				var key = comps[i];
				if (parseInt(i) + 1 == comps.length)
					break;
				if (!innerScope[key])
					innerScope[key] = {};

				innerScope = innerScope[key];
			}

			innerScope[comps[comps.length - 1]] = doFilter(data, $filter.val());
			$scope.$apply();
		});
	});

	$('.query-ui').each(function() {
		var $queryUi = $(this);
		var $queryInput = $queryUi.find('.query-input');
		var $queryResults = $queryUi.find('.query-results');
		var timeout = null;
		var $button = $queryUi.find('button.execute');

		$button.prop('disabled', true);
		$button.removeClass('btn-danger').addClass('btn-primary');
		$button.html('Query');

		$button.click(function() {
			
		});

		var $editingCell = null;
		var $editingRow = null;

		$queryUi.find('th.selectAll input').change(function() {
			if ($(this).is(':checked')) {
				$queryUi.find('tbody tr').addClass('selected');
				$queryUi.find('tbody tr td.select input').prop('checked', true);
			} else {
				$queryUi.find('tbody tr').removeClass('selected');
				$queryUi.find('tbody tr td.select input').prop('checked', false);
			}
		});

		$queryUi.find('td.select input').change(function() {
			if ($(this).is(':checked'))
				$(this).parents('tr:first').addClass('selected');
			else
				$(this).parents('tr:first').removeClass('selected');
		});

		$queryUi.find('td').click(function() {
			if ($(this).hasClass('status') || $(this).hasClass('select'))
				return;

			var value = $(this).data('value');
			var $cell = $(this);
			$cell.html('<input type="text" style="width:100%;height:100%;" />');
			var $input = $cell.find('input');

			$input.val(value);
			$input.focus();
			$input.keydown(function(ev) {
				if (ev.which == 27) {
					$input.val(value);
				}

				if (ev.which == 13 || ev.which == 27) {
					$input.blur();
				}
			});

			$input.blur(function() {
				$cell.html('<span class="trailer"></span>');
				$cell.find('.trailer').attr('title', $input.val()).html($input.val());
				
				if ($input.val() != value) {
					$editingRow.find('td.status').html('<button class="btn-danger" type="button">Save</button><button class="btn-primary" type="button">Revert</button>');
					$cell.data('newValue', $input.val());
					$cell.addClass('unsaved');
					$editingRow.addClass('unsaved');
					var $overallStatus = $queryResults.find('thead th.status');
					var total = $queryResults.find('tr.unsaved').length;
					if (total > 1)
						$overallStatus.html('<button class="btn btn-danger">Save '+total+' rows</button>');
					else
						$overallStatus.html('');
				}

			});

			$editingCell = $(this);
			$editingRow = $(this).parent();
		});

		$queryInput.keydown(function() {
			if (timeout)
				clearTimeout(timeout);
			timeout = setTimeout(function() {
				var query = $queryInput.val();
				query = query.replace(/--.*$/mg, ''); 
				query = query.replace(/^\s+/, '');
				query = query.replace(/\s+$/, '');
				parts = query.split(' ');
				verb = parts[0].toUpperCase();
		
				$button
					.removeClass('btn-primary')
					.removeClass('btn-danger')
					.removeClass('btn-success');

				if (query == "") {
					$button.addClass('btn-primary');
					$button.prop('disabled', true);
					return;
				}

				$button.prop('disabled', false);

				if (verb == "UPDATE" || verb == "DELETE" || verb == "CREATE"
				    || verb == "INSERT" || verb == "TRUNCATE") {
					$button
						.html('Execute')
						.addClass('btn-danger');
				} else {
					var validated = false;
					if (verb == "SELECT" || verb == "SHOW")
						validated = true;

					$button
						.html('Query')
						.addClass(validated? 'btn-success' : 'btn-primary');
			
					
				}
			}, 500);
		});
	});
});

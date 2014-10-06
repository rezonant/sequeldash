/** Assertions  **/

var assert = require('./assert.js');
var api = require('./api.js');
var queryGenerator = require('./queryGenerator.js');

/** UI **/

$(document).ready(function() {

	// Make sure we have a state
	if (!window.$state) {
		console.log('Error: No state provided.');
		alert('An application error has occurred: No state provided');
		return;
	}

	// Apply it
	var $scope = $('html').scope();

	for (var key in $state) {
		$scope[key] = $state[key];
	}

	$scope.startup = false;
	$scope.$apply();

	jQuery.fn.extractRow = function() {
		var row = $(this).data('resultRow');
		if (row)
			return resultRow;

		row = {};

		if ($(this).data('pkey'))
			row.__primaryKey = $(this).data('pkey');
		if ($(this).data('id'))
			row.__id = $(this).data('id');

		row.__table = $(this).parents('table:first').data('table');
		row.__proposed = {};
		row.__unsaved = $(this).hasClass('unsaved');
		row.getProposed = function() {
			var clone = {};
			for (var name in this.__proposed) {
				if (name.indexOf('__') == 0)
					continue;
				if (typeof this.__proposed[name] == 'function')
					continue;

				clone[name] = this.__proposed[name];
			}

			return clone;

		}

		row.getData = function() {
			var clone = {};
			for (var name in this) {
				if (name.indexOf('__') == 0)
					continue;
				if (typeof this[name] == 'function')
					continue;

				clone[name] = this[name];
			}

			return clone;
		}

		$(this).find('td').each(function() {
			var key = $(this).data('key');
			var value = $(this).data('value');
			var proposedValue = $(this).data('proposedValue');

			if (!key)
				return;

			row[key] = value;
			if (proposedValue)
				row.__proposed[key] = proposedValue;
		});

		return row;
	}

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

	/**
	 * Updates the display of the given data values for all matching rows which are not pending 
	 * changes within the given result set.  
	 * This is used to fix display of rows which we implicitly know have changed server side, such as 
	 * when doing an update on a table without primary keys when there are (or could be) multiple
	 * identical rows.
	 */	
	function updateDisplayRowsByCriteria($queryResults, criteria, data)
	{
		$queryResults.find('tbody tr').not('.unsaved').each(function() {
			var row = $(this).extractRow();
			var skip = false;
			for (var field in criteria) {
				if (criteria[field] != row[field]) {
					skip = true; break;
				}
			}

			if (skip)
				return;

			// Matching row, update

			$(this).find('td').each(function() {
				if (!data[$(this).data('key')]) {
					return;
				}

				var value = data[$(this).data('key')];

				$(this).removeClass('unsaved');
				$(this).data('value', value);
				$(this).html('<span class="trailer"></span>');
				$(this).find('.trailer').attr('title', value).html(value);
			});
			flashRow($(this));
		});
	}

	function markRowSaved($row) {
		$row.removeClass('unsaved');
		$row.find('td.unsaved').each(function() {
			$(this).data('value', $(this).data('proposedValue'));
		}).removeClass('unsaved');
		flashRow($row);

		$row.find('td.status').html('');
	}

	function flashRow($row) {
		$row.css({backgroundColor: 'rgba(255, 163, 102, 1)'});
		$row.animate({
			backgroundColor: 'rgba(255, 163, 102, 0)'
		}, {
			duration: 4000
		});
	}

	function initializeQueryUi($queryUi) {
		var $queryInput = $queryUi.find('.query-input');
		var $queryAce = $queryUi.find('.query-ace');

		var $queryResults = $queryUi.find('.query-results');
		var $button = $queryUi.find('button.execute');

		$queryAce.html($queryInput.val()).show();
		$queryInput.hide();
    		var $ace = ace.edit($queryAce.get(0));
	        $ace.setTheme("ace/theme/chrome");
	        $ace.getSession().setMode("ace/mode/sql");
		$ace.setUseWrapMode(true);
		$ace.setShowPrintMargin(true);

		$button.prop('disabled', true);
		$button.removeClass('btn-danger').addClass('btn-primary');
		$button.html('Query');

		$button.click(function(ev) {
			if ($button.hasClass('refresh')) {
				ev.stopPropagation();
				window.location.reload();
				return false;
			}
		});

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
			if (!$queryResults.data('table'))
				return;

			if ($(this).hasClass('status') || $(this).hasClass('select'))
				return;

			var value = $(this).data('value');
			
			if ($(this).data('proposedValue')) {
				value = $(this).data('proposedValue');
			}

			var $cell = $(this);
			$cell.html('<input type="text" style="width:100%;height:100%;" />');
			var $input = $cell.find('input');
			
			var $editingCell = $(this);
			var $editingRow = $(this).parent();

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
					$editingRow
					    .addClass('unsaved')
					    .find('td.status')
					    .html(
						'<button class="do-save-row btn-danger" '+
						  'type="button">Save</button>'+
						'<button class="btn-primary" '+
						  'type="button">Revert</button>'
					    )
					    .find('.do-save-row')
					    .click(function() {

						var pkey = $editingRow.data('pkey');
						var id = $editingRow.data('id');
						var table = $queryResults.data('table');
						var row = $editingRow.extractRow();
						var dbName = $queryResults.data('db');
						var db = new api.db(dbName);

						if (pkey) {
							var updateSql = queryGenerator.updatePkey(table, pkey, id, 
								row.getProposed());
	
							alert('Save row #'+id+' ('+pkey+')  \n\n'+updateSql);

							db  .query(updateSql)
							    .then(function(r) {
								// Update the UI
								markRowSaved($editingRow);
							    }).catch(function(r) {
								console.log('query failed:');
								console.log(r);
								alert('query failed');
							    });	
						} else {
							var updateSql = queryGenerator.update(table, 
								row.getData(),
								row.getProposed());
							var selectSql = queryGenerator.select(
								table,
								['COUNT(*) ct'],
								row.getData()
							);
							var updateAllMatches = false;

							db  .query(selectSql)
							    .then(function(r) {
								if (r.query.count < 1) {
									alert('Invalid result (should be 1 count row)');
									return;
								}

								if (r.query.results[0].ct > 1) {
									updateAllMatches = true;
									var confirmed = confirm(
										'Warning:\n'+
										'This action will update multiple rows.\n'+
										'Rows affected: '+r.query.results[0].ct+"\n\n"+
										"OK to continue, Cancel to abort\n\n"+
										"Query:\n\n"+updateSql);
									if (!confirmed)
										throw "userAborted";
								}

								return true;
							    })
							    .then(function() {
								return db.query(updateSql);
							    }).then(function(r) {
								if (r.error) {
									alert(r.error);
									throw "queryError";
								}
								// Update the UI
								markRowSaved($editingRow);
	
								if (updateAllMatches) {
									updateDisplayRowsByCriteria($queryResults, row.getData(), row.getProposed());
								}
							    });
						}

						


					    });

					$cell
					    .data('proposedValue', $input.val())
					    .addClass('unsaved');
					
					var $overallStatus = $queryResults.find('thead th.status');
					var total = $queryResults.find('tr.unsaved').length;

					if (total > 1) {
						
						$overallStatus
						    .html(
							'<button class="do-save-all btn btn-danger" type="button">'+
							'Save '+total+' rows</button>'
						    )
						    .find('.do-save-all')
						    .click(function() {
							var queries = [];
							var queryState = [];
							var warned = false;

							if ($queryResults.find('tr.unsaved').length == 0) {
								$queryResults.find('tr th.status').html('');
								return;
							}

							$queryResults.find('tr.unsaved').each(function() {
								var $row = $(this);

								var pkey = $row.data('pkey');
								var id = $row.data('id');
								var table = $queryResults.data('table');
								var row = $row.extractRow();
								var dbName = $queryResults.data('db');
								var db = new api.db(dbName);

								if (!warned && !pkey) {
									var message = 
										'Warning: This table does not have a primary key.\n'+
										'The requested update operations may affect more rows '+
											'than expected.\n\n'+
										'Click OK to proceed, or Cancel to abort.';

									if (!confirm(message)) {
										throw "userAbort";
									}
			
									warned = true;
								}

								if (pkey) {
									var updateSql = queryGenerator.updatePkey(table, pkey, id, 
										row.getProposed());
	
									queries.push(updateSql);
								} else {
									var updateSql = queryGenerator.update(table, 
										row.getData(),
										row.getProposed());
									queries.push(updateSql);
								}

								queryState.push({
									row: row,
									$row: $row,
									table: table,
									db: dbName,
									pkey: pkey,
									id: id
								});
							});

							var db = new api.db($queryResults.data('db'));
							db  .query(queries.join('; '))
							    .catch(function(r) { return r; }) // going to process anyway
							    .then(function(r) {
								for (var i in queryState) {
									var state = queryState[i];
									var result = r.queries[i];
									var $row = state.$row;
									var row = state.row;

									if (result.error) {
										console.log('Failed to save row with state: ');
										console.log(state);
										console.log('Query and result:');
										console.log(result);
										alert('Failed to save row: '+result.error);
										continue;
									}

									if (!$row.data('pkey'))
										updateDisplayRowsByCriteria(
											$queryResults, row.getData(), row.getProposed());
									markRowSaved($row);
								}
								$queryResults.find('th.status').html('');
							    });
						    });
					} else {
						// Only one 
						$overallStatus.html('');
					}
				}

			});
		});

		var updateButton = function() {	
		    var timeout = null;
		    return function () {
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
					.removeClass('refresh')
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

				} else if ($queryInput.data('currentquery') == query) {
					$button.prop('disabled', false);
					$button.addClass('btn-primary');
					$button.addClass('refresh');
					$button.html('Refresh');
				} else {
					var validated = false;
					if (verb == "SELECT" || verb == "SHOW")
						validated = true;

					$button
						.html('Query')
						.addClass(validated? 'btn-success' : 'btn-primary');
			
					
				}
			}, 500);
		    };
		}();	

		// ACE events

		$ace.getSession().on('change', function(e) {
		    $queryInput.val($ace.getValue());
			console.log($ace.getValue());
		    updateButton();
		});
		
		$ace.commands.addCommand({
		    name: 'execute',
		    bindKey: {win: 'Ctrl-E',  mac: 'Command-E'},
		    exec: function(editor) {
			$queryInput.val($ace.getValue());
			$button.click();
		    },
		    readOnly: true // false if this command should not apply in readOnly mode
		});

		// Legacy mode support (with regular textbox)
		$queryInput.keydown(function(ev) {
			if ((ev.metaKey || ev.ctrlKey) && ev.which == 69) {
				$button.click();
			}

			updateButton();
		});
		$queryInput.keydown();
	}
	window.initializeQueryUi = initializeQueryUi;

	$('.query-ui').each(function() {
		initializeQueryUi($(this));
	});


});

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var api = {
	db: function(name) {
		this.query = function(sql, params)
		{
			return new Promise(function(resolve, reject) {
				// FIXME pathing (put a fucken <base> on thar)
				$.post('/sequeldash/app/dbs/'+name+'/query', {
					query: sql,
					ajax: 1
				}, function(r) {
					if (!r.error)
						resolve(r);
					else
						reject(r);

				}, 'json').fail(function(xhr) {
					console.log("xhr error");
					console.log(xhr);
					reject({error: "XHR error", query: {}});
				});
			});
		};
	}
};

window.api = api;
exports = api;

},{}],2:[function(require,module,exports){
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

},{"./api.js":1,"./assert.js":3,"./queryGenerator.js":5}],3:[function(require,module,exports){
/** Assertions  **/

var assert = function(statement, message)
{
        message = message || "Condition was not successful";
        if (statement)
                return;

        if (window.console) {
                console.log("Assertion failed");
                console.log(message);
        }

        if (assert.debug)
                debugger;

        if (assert.production)
                return;

        throw new "Assertion failed: "+message;
}
assert.debug = false;
assert.production = false;

exports = assert;

},{}],4:[function(require,module,exports){
require('./app.js');

},{"./app.js":2}],5:[function(require,module,exports){
/** Assertions  **/

// Query generation
var queryGenerator = {
	updatePkey: function(table, pkey, id, data)
	{
		var criteria = {};
		criteria[pkey] = id;
		return this.update(table, criteria, data);
	},

	update: function(table, criteria, data)
	{
		var sql = "UPDATE `"+table+"` \nSET \n";
		var parts = [];
		for (var key in data) {
			var value = data[key];
			parts.push('  `'+key+'` = "'+(value+"").replace(/"/g, '""')+'"');
		}

		sql += parts.join(", \n")+" \n";
		sql += "WHERE \n";
		parts = [];
		for (var key in criteria) {
			var value = criteria[key];
			parts.push('  `'+key+'` = "'+(value+"").replace(/"/g, '""')+'"');
		}
		sql += parts.join(" \n  AND ")+" \n";
		return sql;
	},

	select: function(table, selection, criteria, order, page)
	{
		var sql = "SELECT ";

		if (selection) {
			var groomedSelection = [];
			for (var i in selection) {
				var item = selection[i];

				if (item.match(/^[A-Za-z0-9]+$/)) {
					item = '`'+item+'`';
				}

				groomedSelection.push(item);
			}
		
			selection = groomedSelection;
		}

		if (!selection || selection.length == 0)
			sql += '* ';
		else if (selection.length == 1)
			sql += selection[0]+" ";
		else
			sql += "\n  "+selection.join(", \n  ")+" \n";

		if (!table && criteria) {
			throw "Must specify a table if criteria is specified";
		}

		if (table) {
			if (!selection || selection.length <= 1)
				sql += "FROM `"+table+"` \n";
			else
				sql += "FROM\n  `"+table+"` \n";
		}

		if (criteria) {
			sql += "WHERE ";
			var parts = [];
			for (var field in criteria) {
				parts.push('  `'+field+'` = "'+(criteria[field]+"").replace(/"/g, '""')+'"');
			}

			if (parts.length == 1)
				sql += parts[0]+" \n";
			else
				sql += " \n"+parts.join(" AND \n")+" \n";
		}

		if (order) {
			sql += "ORDER BY ";
			var parts = [];
			for (var field in order) {
				parts.push('`'+field+'` '+(order[field].toLowerCase() == "asc" ? "ASC" : "DESC"));
			}
			
			if (parts.length == 1)
				sql += parts[0]+" \n";
			else
				sql += " \n"+parts.join(", \n")+" \n";
		}

		if (page) {
			sql += "LIMIT "+page.limit;

			if (page.offset)
				sql += " OFFSET "+page.offset;	
		}
		return sql.replace(/^\n|\n$/mg, "")+" \n";
	}
};

exports = queryGenerator;

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvYXBpLmpzIiwiL2hvbWUvbGlhbS9DcmVhdGl2ZS9Db2RlL1dlYi9zZXF1ZWxkYXNoL2pzL2FwcC5qcyIsIi9ob21lL2xpYW0vQ3JlYXRpdmUvQ29kZS9XZWIvc2VxdWVsZGFzaC9qcy9hc3NlcnQuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvZW50cnkuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvcXVlcnlHZW5lcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbnZhciBhcGkgPSB7XG5cdGRiOiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0dGhpcy5xdWVyeSA9IGZ1bmN0aW9uKHNxbCwgcGFyYW1zKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0Ly8gRklYTUUgcGF0aGluZyAocHV0IGEgZnVja2VuIDxiYXNlPiBvbiB0aGFyKVxuXHRcdFx0XHQkLnBvc3QoJy9zZXF1ZWxkYXNoL2FwcC9kYnMvJytuYW1lKycvcXVlcnknLCB7XG5cdFx0XHRcdFx0cXVlcnk6IHNxbCxcblx0XHRcdFx0XHRhamF4OiAxXG5cdFx0XHRcdH0sIGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRpZiAoIXIuZXJyb3IpXG5cdFx0XHRcdFx0XHRyZXNvbHZlKHIpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdHJlamVjdChyKTtcblxuXHRcdFx0XHR9LCAnanNvbicpLmZhaWwoZnVuY3Rpb24oeGhyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJ4aHIgZXJyb3JcIik7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coeGhyKTtcblx0XHRcdFx0XHRyZWplY3Qoe2Vycm9yOiBcIlhIUiBlcnJvclwiLCBxdWVyeToge319KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXHR9XG59O1xuXG53aW5kb3cuYXBpID0gYXBpO1xuZXhwb3J0cyA9IGFwaTtcbiIsIi8qKiBBc3NlcnRpb25zICAqKi9cblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4vYXNzZXJ0LmpzJyk7XG52YXIgYXBpID0gcmVxdWlyZSgnLi9hcGkuanMnKTtcbnZhciBxdWVyeUdlbmVyYXRvciA9IHJlcXVpcmUoJy4vcXVlcnlHZW5lcmF0b3IuanMnKTtcblxuLyoqIFVJICoqL1xuXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuXHQvLyBNYWtlIHN1cmUgd2UgaGF2ZSBhIHN0YXRlXG5cdGlmICghd2luZG93LiRzdGF0ZSkge1xuXHRcdGNvbnNvbGUubG9nKCdFcnJvcjogTm8gc3RhdGUgcHJvdmlkZWQuJyk7XG5cdFx0YWxlcnQoJ0FuIGFwcGxpY2F0aW9uIGVycm9yIGhhcyBvY2N1cnJlZDogTm8gc3RhdGUgcHJvdmlkZWQnKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBBcHBseSBpdFxuXHR2YXIgJHNjb3BlID0gJCgnaHRtbCcpLnNjb3BlKCk7XG5cblx0Zm9yICh2YXIga2V5IGluICRzdGF0ZSkge1xuXHRcdCRzY29wZVtrZXldID0gJHN0YXRlW2tleV07XG5cdH1cblxuXHQkc2NvcGUuc3RhcnR1cCA9IGZhbHNlO1xuXHQkc2NvcGUuJGFwcGx5KCk7XG5cblx0alF1ZXJ5LmZuLmV4dHJhY3RSb3cgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgcm93ID0gJCh0aGlzKS5kYXRhKCdyZXN1bHRSb3cnKTtcblx0XHRpZiAocm93KVxuXHRcdFx0cmV0dXJuIHJlc3VsdFJvdztcblxuXHRcdHJvdyA9IHt9O1xuXG5cdFx0aWYgKCQodGhpcykuZGF0YSgncGtleScpKVxuXHRcdFx0cm93Ll9fcHJpbWFyeUtleSA9ICQodGhpcykuZGF0YSgncGtleScpO1xuXHRcdGlmICgkKHRoaXMpLmRhdGEoJ2lkJykpXG5cdFx0XHRyb3cuX19pZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcblxuXHRcdHJvdy5fX3RhYmxlID0gJCh0aGlzKS5wYXJlbnRzKCd0YWJsZTpmaXJzdCcpLmRhdGEoJ3RhYmxlJyk7XG5cdFx0cm93Ll9fcHJvcG9zZWQgPSB7fTtcblx0XHRyb3cuX191bnNhdmVkID0gJCh0aGlzKS5oYXNDbGFzcygndW5zYXZlZCcpO1xuXHRcdHJvdy5nZXRQcm9wb3NlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNsb25lID0ge307XG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHRoaXMuX19wcm9wb3NlZCkge1xuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCdfXycpID09IDApXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGlmICh0eXBlb2YgdGhpcy5fX3Byb3Bvc2VkW25hbWVdID09ICdmdW5jdGlvbicpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0Y2xvbmVbbmFtZV0gPSB0aGlzLl9fcHJvcG9zZWRbbmFtZV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBjbG9uZTtcblxuXHRcdH1cblxuXHRcdHJvdy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY2xvbmUgPSB7fTtcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gdGhpcykge1xuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCdfXycpID09IDApXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGlmICh0eXBlb2YgdGhpc1tuYW1lXSA9PSAnZnVuY3Rpb24nKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdGNsb25lW25hbWVdID0gdGhpc1tuYW1lXTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGNsb25lO1xuXHRcdH1cblxuXHRcdCQodGhpcykuZmluZCgndGQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgna2V5Jyk7XG5cdFx0XHR2YXIgdmFsdWUgPSAkKHRoaXMpLmRhdGEoJ3ZhbHVlJyk7XG5cdFx0XHR2YXIgcHJvcG9zZWRWYWx1ZSA9ICQodGhpcykuZGF0YSgncHJvcG9zZWRWYWx1ZScpO1xuXG5cdFx0XHRpZiAoIWtleSlcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRyb3dba2V5XSA9IHZhbHVlO1xuXHRcdFx0aWYgKHByb3Bvc2VkVmFsdWUpXG5cdFx0XHRcdHJvdy5fX3Byb3Bvc2VkW2tleV0gPSBwcm9wb3NlZFZhbHVlO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJvdztcblx0fVxuXG5cdC8vIEluc3RhbGwgY3VzdG9tIGJlaGF2aW9yc1xuXG5cdCQoJ2lucHV0W3R5cGU9dGV4dF0uZmlsdGVyJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHR2YXIgJGZpbHRlciA9ICQodGhpcyk7XG5cdFx0dmFyICRuZ0FwcCA9ICQoJ1tuZy1hcHBdJyk7XG5cdFx0dmFyICRzY29wZSA9ICRuZ0FwcC5zY29wZSgpO1xuXHRcdHZhciBwcm9wZXJ0eSA9ICRmaWx0ZXIuZGF0YSgnZmlsdGVyJyk7XG5cdFx0dmFyIGRhdGEgPSAkc2NvcGUuJGV2YWwocHJvcGVydHkpOyBcblx0XHR2YXIgZmlsdGVyaW5nID0gZmFsc2U7XG5cdFx0dmFyIHN1YnByb3AgPSAkZmlsdGVyLmRhdGEoJ3RhcmdldCcpO1x0XG5cblx0XHR2YXIgZG9GaWx0ZXIgPSBmdW5jdGlvbihkYXRhLCBmaWx0ZXIpIHtcblx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSBbXTtcblxuXHRcdFx0aWYgKCFmaWx0ZXIpXG5cdFx0XHRcdHJldHVybiBkYXRhO1xuXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuXHRcdFx0XHR2YXIgcm93ID0gZGF0YVtrZXldO1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gcm93O1xuXHRcdFx0XHRpZiAoc3VicHJvcClcblx0XHRcdFx0XHR0YXJnZXQgPSByb3dbc3VicHJvcF07XG5cblx0XHRcdFx0aWYgKHRhcmdldC5pbmRleE9mKGZpbHRlcikgPj0gMCkgXG5cdFx0XHRcdFx0ZmlsdGVyZWREYXRhLnB1c2gocm93KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZpbHRlcmVkRGF0YTtcblx0XHR9O1xuXG5cdFx0JHNjb3BlLiR3YXRjaChwcm9wZXJ0eSwgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG5cdFx0XHRpZiAoZmlsdGVyaW5nKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRkYXRhID0gbmV3VmFsdWU7XHRcblx0XHRcdCRmaWx0ZXIuY2hhbmdlKCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgdGltZW91dCA9IG51bGw7XG5cdFx0JGZpbHRlci5rZXlkb3duKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRpbWVvdXQpXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JGZpbHRlci5jaGFuZ2UoKTtcblx0XHRcdH0sIDUwMCk7XG5cdFx0fSk7XG5cblx0XHQkZmlsdGVyLmNoYW5nZShmdW5jdGlvbigpIHtcblx0XHRcdGZpbHRlcmluZyA9IHRydWU7XG5cdFx0XHR2YXIgaW5uZXJTY29wZSA9ICRzY29wZTtcblx0XHRcdHZhciBjb21wcyA9IHByb3BlcnR5LnNwbGl0KCcuJyk7XG5cdFx0XHRmb3IgKHZhciBpIGluIGNvbXBzKSB7XG5cdFx0XHRcdHZhciBrZXkgPSBjb21wc1tpXTtcblx0XHRcdFx0aWYgKHBhcnNlSW50KGkpICsgMSA9PSBjb21wcy5sZW5ndGgpXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGlmICghaW5uZXJTY29wZVtrZXldKVxuXHRcdFx0XHRcdGlubmVyU2NvcGVba2V5XSA9IHt9O1xuXG5cdFx0XHRcdGlubmVyU2NvcGUgPSBpbm5lclNjb3BlW2tleV07XG5cdFx0XHR9XG5cblx0XHRcdGlubmVyU2NvcGVbY29tcHNbY29tcHMubGVuZ3RoIC0gMV1dID0gZG9GaWx0ZXIoZGF0YSwgJGZpbHRlci52YWwoKSk7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBkaXNwbGF5IG9mIHRoZSBnaXZlbiBkYXRhIHZhbHVlcyBmb3IgYWxsIG1hdGNoaW5nIHJvd3Mgd2hpY2ggYXJlIG5vdCBwZW5kaW5nIFxuXHQgKiBjaGFuZ2VzIHdpdGhpbiB0aGUgZ2l2ZW4gcmVzdWx0IHNldC4gIFxuXHQgKiBUaGlzIGlzIHVzZWQgdG8gZml4IGRpc3BsYXkgb2Ygcm93cyB3aGljaCB3ZSBpbXBsaWNpdGx5IGtub3cgaGF2ZSBjaGFuZ2VkIHNlcnZlciBzaWRlLCBzdWNoIGFzIFxuXHQgKiB3aGVuIGRvaW5nIGFuIHVwZGF0ZSBvbiBhIHRhYmxlIHdpdGhvdXQgcHJpbWFyeSBrZXlzIHdoZW4gdGhlcmUgYXJlIChvciBjb3VsZCBiZSkgbXVsdGlwbGVcblx0ICogaWRlbnRpY2FsIHJvd3MuXG5cdCAqL1x0XG5cdGZ1bmN0aW9uIHVwZGF0ZURpc3BsYXlSb3dzQnlDcml0ZXJpYSgkcXVlcnlSZXN1bHRzLCBjcml0ZXJpYSwgZGF0YSlcblx0e1xuXHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndGJvZHkgdHInKS5ub3QoJy51bnNhdmVkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciByb3cgPSAkKHRoaXMpLmV4dHJhY3RSb3coKTtcblx0XHRcdHZhciBza2lwID0gZmFsc2U7XG5cdFx0XHRmb3IgKHZhciBmaWVsZCBpbiBjcml0ZXJpYSkge1xuXHRcdFx0XHRpZiAoY3JpdGVyaWFbZmllbGRdICE9IHJvd1tmaWVsZF0pIHtcblx0XHRcdFx0XHRza2lwID0gdHJ1ZTsgYnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHNraXApXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0Ly8gTWF0Y2hpbmcgcm93LCB1cGRhdGVcblxuXHRcdFx0JCh0aGlzKS5maW5kKCd0ZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICghZGF0YVskKHRoaXMpLmRhdGEoJ2tleScpXSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB2YWx1ZSA9IGRhdGFbJCh0aGlzKS5kYXRhKCdrZXknKV07XG5cblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygndW5zYXZlZCcpO1xuXHRcdFx0XHQkKHRoaXMpLmRhdGEoJ3ZhbHVlJywgdmFsdWUpO1xuXHRcdFx0XHQkKHRoaXMpLmh0bWwoJzxzcGFuIGNsYXNzPVwidHJhaWxlclwiPjwvc3Bhbj4nKTtcblx0XHRcdFx0JCh0aGlzKS5maW5kKCcudHJhaWxlcicpLmF0dHIoJ3RpdGxlJywgdmFsdWUpLmh0bWwodmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0XHRmbGFzaFJvdygkKHRoaXMpKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIG1hcmtSb3dTYXZlZCgkcm93KSB7XG5cdFx0JHJvdy5yZW1vdmVDbGFzcygndW5zYXZlZCcpO1xuXHRcdCRyb3cuZmluZCgndGQudW5zYXZlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMpLmRhdGEoJ3ZhbHVlJywgJCh0aGlzKS5kYXRhKCdwcm9wb3NlZFZhbHVlJykpO1xuXHRcdH0pLnJlbW92ZUNsYXNzKCd1bnNhdmVkJyk7XG5cdFx0Zmxhc2hSb3coJHJvdyk7XG5cblx0XHQkcm93LmZpbmQoJ3RkLnN0YXR1cycpLmh0bWwoJycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmxhc2hSb3coJHJvdykge1xuXHRcdCRyb3cuY3NzKHtiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1NSwgMTYzLCAxMDIsIDEpJ30pO1xuXHRcdCRyb3cuYW5pbWF0ZSh7XG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1NSwgMTYzLCAxMDIsIDApJ1xuXHRcdH0sIHtcblx0XHRcdGR1cmF0aW9uOiA0MDAwXG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplUXVlcnlVaSgkcXVlcnlVaSkge1xuXHRcdHZhciAkcXVlcnlJbnB1dCA9ICRxdWVyeVVpLmZpbmQoJy5xdWVyeS1pbnB1dCcpO1xuXHRcdHZhciAkcXVlcnlBY2UgPSAkcXVlcnlVaS5maW5kKCcucXVlcnktYWNlJyk7XG5cblx0XHR2YXIgJHF1ZXJ5UmVzdWx0cyA9ICRxdWVyeVVpLmZpbmQoJy5xdWVyeS1yZXN1bHRzJyk7XG5cdFx0dmFyICRidXR0b24gPSAkcXVlcnlVaS5maW5kKCdidXR0b24uZXhlY3V0ZScpO1xuXG5cdFx0JHF1ZXJ5QWNlLmh0bWwoJHF1ZXJ5SW5wdXQudmFsKCkpLnNob3coKTtcblx0XHQkcXVlcnlJbnB1dC5oaWRlKCk7XG4gICAgXHRcdHZhciAkYWNlID0gYWNlLmVkaXQoJHF1ZXJ5QWNlLmdldCgwKSk7XG5cdCAgICAgICAgJGFjZS5zZXRUaGVtZShcImFjZS90aGVtZS9jaHJvbWVcIik7XG5cdCAgICAgICAgJGFjZS5nZXRTZXNzaW9uKCkuc2V0TW9kZShcImFjZS9tb2RlL3NxbFwiKTtcblx0XHQkYWNlLnNldFVzZVdyYXBNb2RlKHRydWUpO1xuXHRcdCRhY2Uuc2V0U2hvd1ByaW50TWFyZ2luKHRydWUpO1xuXG5cdFx0JGJ1dHRvbi5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuXHRcdCRidXR0b24ucmVtb3ZlQ2xhc3MoJ2J0bi1kYW5nZXInKS5hZGRDbGFzcygnYnRuLXByaW1hcnknKTtcblx0XHQkYnV0dG9uLmh0bWwoJ1F1ZXJ5Jyk7XG5cblx0XHQkYnV0dG9uLmNsaWNrKGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRpZiAoJGJ1dHRvbi5oYXNDbGFzcygncmVmcmVzaCcpKSB7XG5cdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCRxdWVyeVVpLmZpbmQoJ3RoLnNlbGVjdEFsbCBpbnB1dCcpLmNoYW5nZShmdW5jdGlvbigpIHtcblx0XHRcdGlmICgkKHRoaXMpLmlzKCc6Y2hlY2tlZCcpKSB7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyJykuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyIHRkLnNlbGVjdCBpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyIHRkLnNlbGVjdCBpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkcXVlcnlVaS5maW5kKCd0ZC5zZWxlY3QgaW5wdXQnKS5jaGFuZ2UoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5pcygnOmNoZWNrZWQnKSlcblx0XHRcdFx0JCh0aGlzKS5wYXJlbnRzKCd0cjpmaXJzdCcpLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHQkKHRoaXMpLnBhcmVudHMoJ3RyOmZpcnN0JykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0fSk7XG5cblx0XHQkcXVlcnlVaS5maW5kKCd0ZCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCEkcXVlcnlSZXN1bHRzLmRhdGEoJ3RhYmxlJykpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKCQodGhpcykuaGFzQ2xhc3MoJ3N0YXR1cycpIHx8ICQodGhpcykuaGFzQ2xhc3MoJ3NlbGVjdCcpKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdHZhciB2YWx1ZSA9ICQodGhpcykuZGF0YSgndmFsdWUnKTtcblx0XHRcdFxuXHRcdFx0aWYgKCQodGhpcykuZGF0YSgncHJvcG9zZWRWYWx1ZScpKSB7XG5cdFx0XHRcdHZhbHVlID0gJCh0aGlzKS5kYXRhKCdwcm9wb3NlZFZhbHVlJyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciAkY2VsbCA9ICQodGhpcyk7XG5cdFx0XHQkY2VsbC5odG1sKCc8aW5wdXQgdHlwZT1cInRleHRcIiBzdHlsZT1cIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7XCIgLz4nKTtcblx0XHRcdHZhciAkaW5wdXQgPSAkY2VsbC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0XG5cdFx0XHR2YXIgJGVkaXRpbmdDZWxsID0gJCh0aGlzKTtcblx0XHRcdHZhciAkZWRpdGluZ1JvdyA9ICQodGhpcykucGFyZW50KCk7XG5cblx0XHRcdCRpbnB1dC52YWwodmFsdWUpO1xuXHRcdFx0JGlucHV0LmZvY3VzKCk7XG5cdFx0XHQkaW5wdXQua2V5ZG93bihmdW5jdGlvbihldikge1xuXHRcdFx0XHRpZiAoZXYud2hpY2ggPT0gMjcpIHtcblx0XHRcdFx0XHQkaW5wdXQudmFsKHZhbHVlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChldi53aGljaCA9PSAxMyB8fCBldi53aGljaCA9PSAyNykge1xuXHRcdFx0XHRcdCRpbnB1dC5ibHVyKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cblx0XHRcdCRpbnB1dC5ibHVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkY2VsbC5odG1sKCc8c3BhbiBjbGFzcz1cInRyYWlsZXJcIj48L3NwYW4+Jyk7XG5cdFx0XHRcdCRjZWxsLmZpbmQoJy50cmFpbGVyJykuYXR0cigndGl0bGUnLCAkaW5wdXQudmFsKCkpLmh0bWwoJGlucHV0LnZhbCgpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICgkaW5wdXQudmFsKCkgIT0gdmFsdWUpIHtcblx0XHRcdFx0XHQkZWRpdGluZ1Jvd1xuXHRcdFx0XHRcdCAgICAuYWRkQ2xhc3MoJ3Vuc2F2ZWQnKVxuXHRcdFx0XHRcdCAgICAuZmluZCgndGQuc3RhdHVzJylcblx0XHRcdFx0XHQgICAgLmh0bWwoXG5cdFx0XHRcdFx0XHQnPGJ1dHRvbiBjbGFzcz1cImRvLXNhdmUtcm93IGJ0bi1kYW5nZXJcIiAnK1xuXHRcdFx0XHRcdFx0ICAndHlwZT1cImJ1dHRvblwiPlNhdmU8L2J1dHRvbj4nK1xuXHRcdFx0XHRcdFx0JzxidXR0b24gY2xhc3M9XCJidG4tcHJpbWFyeVwiICcrXG5cdFx0XHRcdFx0XHQgICd0eXBlPVwiYnV0dG9uXCI+UmV2ZXJ0PC9idXR0b24+J1xuXHRcdFx0XHRcdCAgICApXG5cdFx0XHRcdFx0ICAgIC5maW5kKCcuZG8tc2F2ZS1yb3cnKVxuXHRcdFx0XHRcdCAgICAuY2xpY2soZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHZhciBwa2V5ID0gJGVkaXRpbmdSb3cuZGF0YSgncGtleScpO1xuXHRcdFx0XHRcdFx0dmFyIGlkID0gJGVkaXRpbmdSb3cuZGF0YSgnaWQnKTtcblx0XHRcdFx0XHRcdHZhciB0YWJsZSA9ICRxdWVyeVJlc3VsdHMuZGF0YSgndGFibGUnKTtcblx0XHRcdFx0XHRcdHZhciByb3cgPSAkZWRpdGluZ1Jvdy5leHRyYWN0Um93KCk7XG5cdFx0XHRcdFx0XHR2YXIgZGJOYW1lID0gJHF1ZXJ5UmVzdWx0cy5kYXRhKCdkYicpO1xuXHRcdFx0XHRcdFx0dmFyIGRiID0gbmV3IGFwaS5kYihkYk5hbWUpO1xuXG5cdFx0XHRcdFx0XHRpZiAocGtleSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlU3FsID0gcXVlcnlHZW5lcmF0b3IudXBkYXRlUGtleSh0YWJsZSwgcGtleSwgaWQsIFxuXHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XG5cdFx0XHRcdFx0XHRcdGFsZXJ0KCdTYXZlIHJvdyAjJytpZCsnICgnK3BrZXkrJykgIFxcblxcbicrdXBkYXRlU3FsKTtcblxuXHRcdFx0XHRcdFx0XHRkYiAgLnF1ZXJ5KHVwZGF0ZVNxbClcblx0XHRcdFx0XHRcdFx0ICAgIC50aGVuKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIFVJXG5cdFx0XHRcdFx0XHRcdFx0bWFya1Jvd1NhdmVkKCRlZGl0aW5nUm93KTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncXVlcnkgZmFpbGVkOicpO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHIpO1xuXHRcdFx0XHRcdFx0XHRcdGFsZXJ0KCdxdWVyeSBmYWlsZWQnKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pO1x0XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlU3FsID0gcXVlcnlHZW5lcmF0b3IudXBkYXRlKHRhYmxlLCBcblx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0RGF0YSgpLFxuXHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0dmFyIHNlbGVjdFNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnNlbGVjdChcblx0XHRcdFx0XHRcdFx0XHR0YWJsZSxcblx0XHRcdFx0XHRcdFx0XHRbJ0NPVU5UKCopIGN0J10sXG5cdFx0XHRcdFx0XHRcdFx0cm93LmdldERhdGEoKVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlQWxsTWF0Y2hlcyA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRcdGRiICAucXVlcnkoc2VsZWN0U3FsKVxuXHRcdFx0XHRcdFx0XHQgICAgLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChyLnF1ZXJ5LmNvdW50IDwgMSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoJ0ludmFsaWQgcmVzdWx0IChzaG91bGQgYmUgMSBjb3VudCByb3cpJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHIucXVlcnkucmVzdWx0c1swXS5jdCA+IDEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZUFsbE1hdGNoZXMgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGNvbmZpcm1lZCA9IGNvbmZpcm0oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdXYXJuaW5nOlxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdUaGlzIGFjdGlvbiB3aWxsIHVwZGF0ZSBtdWx0aXBsZSByb3dzLlxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdSb3dzIGFmZmVjdGVkOiAnK3IucXVlcnkucmVzdWx0c1swXS5jdCtcIlxcblxcblwiK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIk9LIHRvIGNvbnRpbnVlLCBDYW5jZWwgdG8gYWJvcnRcXG5cXG5cIitcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJRdWVyeTpcXG5cXG5cIit1cGRhdGVTcWwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFjb25maXJtZWQpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwidXNlckFib3J0ZWRcIjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pXG5cdFx0XHRcdFx0XHRcdCAgICAudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZGIucXVlcnkodXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChyLmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhbGVydChyLmVycm9yKTtcblx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwicXVlcnlFcnJvclwiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIFVJXG5cdFx0XHRcdFx0XHRcdFx0bWFya1Jvd1NhdmVkKCRlZGl0aW5nUm93KTtcblx0XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHVwZGF0ZUFsbE1hdGNoZXMpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZURpc3BsYXlSb3dzQnlDcml0ZXJpYSgkcXVlcnlSZXN1bHRzLCByb3cuZ2V0RGF0YSgpLCByb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQgICAgfSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFxuXG5cblx0XHRcdFx0XHQgICAgfSk7XG5cblx0XHRcdFx0XHQkY2VsbFxuXHRcdFx0XHRcdCAgICAuZGF0YSgncHJvcG9zZWRWYWx1ZScsICRpbnB1dC52YWwoKSlcblx0XHRcdFx0XHQgICAgLmFkZENsYXNzKCd1bnNhdmVkJyk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyICRvdmVyYWxsU3RhdHVzID0gJHF1ZXJ5UmVzdWx0cy5maW5kKCd0aGVhZCB0aC5zdGF0dXMnKTtcblx0XHRcdFx0XHR2YXIgdG90YWwgPSAkcXVlcnlSZXN1bHRzLmZpbmQoJ3RyLnVuc2F2ZWQnKS5sZW5ndGg7XG5cblx0XHRcdFx0XHRpZiAodG90YWwgPiAxKSB7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCRvdmVyYWxsU3RhdHVzXG5cdFx0XHRcdFx0XHQgICAgLmh0bWwoXG5cdFx0XHRcdFx0XHRcdCc8YnV0dG9uIGNsYXNzPVwiZG8tc2F2ZS1hbGwgYnRuIGJ0bi1kYW5nZXJcIiB0eXBlPVwiYnV0dG9uXCI+Jytcblx0XHRcdFx0XHRcdFx0J1NhdmUgJyt0b3RhbCsnIHJvd3M8L2J1dHRvbj4nXG5cdFx0XHRcdFx0XHQgICAgKVxuXHRcdFx0XHRcdFx0ICAgIC5maW5kKCcuZG8tc2F2ZS1hbGwnKVxuXHRcdFx0XHRcdFx0ICAgIC5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHF1ZXJpZXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0dmFyIHF1ZXJ5U3RhdGUgPSBbXTtcblx0XHRcdFx0XHRcdFx0dmFyIHdhcm5lZCA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRcdGlmICgkcXVlcnlSZXN1bHRzLmZpbmQoJ3RyLnVuc2F2ZWQnKS5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndHIgdGguc3RhdHVzJykuaHRtbCgnJyk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0JHF1ZXJ5UmVzdWx0cy5maW5kKCd0ci51bnNhdmVkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgJHJvdyA9ICQodGhpcyk7XG5cblx0XHRcdFx0XHRcdFx0XHR2YXIgcGtleSA9ICRyb3cuZGF0YSgncGtleScpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBpZCA9ICRyb3cuZGF0YSgnaWQnKTtcblx0XHRcdFx0XHRcdFx0XHR2YXIgdGFibGUgPSAkcXVlcnlSZXN1bHRzLmRhdGEoJ3RhYmxlJyk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHJvdyA9ICRyb3cuZXh0cmFjdFJvdygpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBkYk5hbWUgPSAkcXVlcnlSZXN1bHRzLmRhdGEoJ2RiJyk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGRiID0gbmV3IGFwaS5kYihkYk5hbWUpO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF3YXJuZWQgJiYgIXBrZXkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBtZXNzYWdlID0gXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdXYXJuaW5nOiBUaGlzIHRhYmxlIGRvZXMgbm90IGhhdmUgYSBwcmltYXJ5IGtleS5cXG4nK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnVGhlIHJlcXVlc3RlZCB1cGRhdGUgb3BlcmF0aW9ucyBtYXkgYWZmZWN0IG1vcmUgcm93cyAnK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCd0aGFuIGV4cGVjdGVkLlxcblxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdDbGljayBPSyB0byBwcm9jZWVkLCBvciBDYW5jZWwgdG8gYWJvcnQuJztcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFjb25maXJtKG1lc3NhZ2UpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwidXNlckFib3J0XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRcdHdhcm5lZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHBrZXkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciB1cGRhdGVTcWwgPSBxdWVyeUdlbmVyYXRvci51cGRhdGVQa2V5KHRhYmxlLCBwa2V5LCBpZCwgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XG5cdFx0XHRcdFx0XHRcdFx0XHRxdWVyaWVzLnB1c2godXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHVwZGF0ZVNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnVwZGF0ZSh0YWJsZSwgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXREYXRhKCksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0XHRcdHF1ZXJpZXMucHVzaCh1cGRhdGVTcWwpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdHF1ZXJ5U3RhdGUucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdFx0XHRcdCRyb3c6ICRyb3csXG5cdFx0XHRcdFx0XHRcdFx0XHR0YWJsZTogdGFibGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRkYjogZGJOYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0cGtleTogcGtleSxcblx0XHRcdFx0XHRcdFx0XHRcdGlkOiBpZFxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHR2YXIgZGIgPSBuZXcgYXBpLmRiKCRxdWVyeVJlc3VsdHMuZGF0YSgnZGInKSk7XG5cdFx0XHRcdFx0XHRcdGRiICAucXVlcnkocXVlcmllcy5qb2luKCc7ICcpKVxuXHRcdFx0XHRcdFx0XHQgICAgLmNhdGNoKGZ1bmN0aW9uKHIpIHsgcmV0dXJuIHI7IH0pIC8vIGdvaW5nIHRvIHByb2Nlc3MgYW55d2F5XG5cdFx0XHRcdFx0XHRcdCAgICAudGhlbihmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgaSBpbiBxdWVyeVN0YXRlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgc3RhdGUgPSBxdWVyeVN0YXRlW2ldO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJlc3VsdCA9IHIucXVlcmllc1tpXTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciAkcm93ID0gc3RhdGUuJHJvdztcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByb3cgPSBzdGF0ZS5yb3c7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmIChyZXN1bHQuZXJyb3IpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZhaWxlZCB0byBzYXZlIHJvdyB3aXRoIHN0YXRlOiAnKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coc3RhdGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnUXVlcnkgYW5kIHJlc3VsdDonKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoJ0ZhaWxlZCB0byBzYXZlIHJvdzogJytyZXN1bHQuZXJyb3IpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEkcm93LmRhdGEoJ3BrZXknKSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlRGlzcGxheVJvd3NCeUNyaXRlcmlhKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMsIHJvdy5nZXREYXRhKCksIHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0XHRcdG1hcmtSb3dTYXZlZCgkcm93KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0JHF1ZXJ5UmVzdWx0cy5maW5kKCd0aC5zdGF0dXMnKS5odG1sKCcnKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pO1xuXHRcdFx0XHRcdFx0ICAgIH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBPbmx5IG9uZSBcblx0XHRcdFx0XHRcdCRvdmVyYWxsU3RhdHVzLmh0bWwoJycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHZhciB1cGRhdGVCdXR0b24gPSBmdW5jdGlvbigpIHtcdFxuXHRcdCAgICB2YXIgdGltZW91dCA9IG51bGw7XG5cdFx0ICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGltZW91dClcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBxdWVyeSA9ICRxdWVyeUlucHV0LnZhbCgpO1xuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoLy0tLiokL21nLCAnJyk7IFxuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoL15cXHMrLywgJycpO1xuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoL1xccyskLywgJycpO1xuXHRcdFx0XHRwYXJ0cyA9IHF1ZXJ5LnNwbGl0KCcgJyk7XG5cdFx0XHRcdHZlcmIgPSBwYXJ0c1swXS50b1VwcGVyQ2FzZSgpO1xuXHRcblx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygncmVmcmVzaCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdidG4tcHJpbWFyeScpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdidG4tZGFuZ2VyJylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2J0bi1zdWNjZXNzJyk7XG5cblx0XHRcdFx0aWYgKHF1ZXJ5ID09IFwiXCIpIHtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdidG4tcHJpbWFyeScpO1xuXHRcdFx0XHRcdCRidXR0b24ucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JGJ1dHRvbi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcblx0XHRcdFx0aWYgKHZlcmIgPT0gXCJVUERBVEVcIiB8fCB2ZXJiID09IFwiREVMRVRFXCIgfHwgdmVyYiA9PSBcIkNSRUFURVwiXG5cdFx0XHRcdCAgICB8fCB2ZXJiID09IFwiSU5TRVJUXCIgfHwgdmVyYiA9PSBcIlRSVU5DQVRFXCIpIHtcblx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHQuaHRtbCgnRXhlY3V0ZScpXG5cdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2J0bi1kYW5nZXInKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKCRxdWVyeUlucHV0LmRhdGEoJ2N1cnJlbnRxdWVyeScpID09IHF1ZXJ5KSB7XG5cdFx0XHRcdFx0JGJ1dHRvbi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdidG4tcHJpbWFyeScpO1xuXHRcdFx0XHRcdCRidXR0b24uYWRkQ2xhc3MoJ3JlZnJlc2gnKTtcblx0XHRcdFx0XHQkYnV0dG9uLmh0bWwoJ1JlZnJlc2gnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgdmFsaWRhdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0aWYgKHZlcmIgPT0gXCJTRUxFQ1RcIiB8fCB2ZXJiID09IFwiU0hPV1wiKVxuXHRcdFx0XHRcdFx0dmFsaWRhdGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdC5odG1sKCdRdWVyeScpXG5cdFx0XHRcdFx0XHQuYWRkQ2xhc3ModmFsaWRhdGVkPyAnYnRuLXN1Y2Nlc3MnIDogJ2J0bi1wcmltYXJ5Jyk7XG5cdFx0XHRcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fSwgNTAwKTtcblx0XHQgICAgfTtcblx0XHR9KCk7XHRcblxuXHRcdC8vIEFDRSBldmVudHNcblxuXHRcdCRhY2UuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKSB7XG5cdFx0ICAgICRxdWVyeUlucHV0LnZhbCgkYWNlLmdldFZhbHVlKCkpO1xuXHRcdFx0Y29uc29sZS5sb2coJGFjZS5nZXRWYWx1ZSgpKTtcblx0XHQgICAgdXBkYXRlQnV0dG9uKCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JGFjZS5jb21tYW5kcy5hZGRDb21tYW5kKHtcblx0XHQgICAgbmFtZTogJ2V4ZWN1dGUnLFxuXHRcdCAgICBiaW5kS2V5OiB7d2luOiAnQ3RybC1FJywgIG1hYzogJ0NvbW1hbmQtRSd9LFxuXHRcdCAgICBleGVjOiBmdW5jdGlvbihlZGl0b3IpIHtcblx0XHRcdCRxdWVyeUlucHV0LnZhbCgkYWNlLmdldFZhbHVlKCkpO1xuXHRcdFx0JGJ1dHRvbi5jbGljaygpO1xuXHRcdCAgICB9LFxuXHRcdCAgICByZWFkT25seTogdHJ1ZSAvLyBmYWxzZSBpZiB0aGlzIGNvbW1hbmQgc2hvdWxkIG5vdCBhcHBseSBpbiByZWFkT25seSBtb2RlXG5cdFx0fSk7XG5cblx0XHQvLyBMZWdhY3kgbW9kZSBzdXBwb3J0ICh3aXRoIHJlZ3VsYXIgdGV4dGJveClcblx0XHQkcXVlcnlJbnB1dC5rZXlkb3duKGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRpZiAoKGV2Lm1ldGFLZXkgfHwgZXYuY3RybEtleSkgJiYgZXYud2hpY2ggPT0gNjkpIHtcblx0XHRcdFx0JGJ1dHRvbi5jbGljaygpO1xuXHRcdFx0fVxuXG5cdFx0XHR1cGRhdGVCdXR0b24oKTtcblx0XHR9KTtcblx0XHQkcXVlcnlJbnB1dC5rZXlkb3duKCk7XG5cdH1cblx0d2luZG93LmluaXRpYWxpemVRdWVyeVVpID0gaW5pdGlhbGl6ZVF1ZXJ5VWk7XG5cblx0JCgnLnF1ZXJ5LXVpJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRpbml0aWFsaXplUXVlcnlVaSgkKHRoaXMpKTtcblx0fSk7XG5cblxufSk7XG4iLCIvKiogQXNzZXJ0aW9ucyAgKiovXG5cbnZhciBhc3NlcnQgPSBmdW5jdGlvbihzdGF0ZW1lbnQsIG1lc3NhZ2UpXG57XG4gICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlIHx8IFwiQ29uZGl0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bFwiO1xuICAgICAgICBpZiAoc3RhdGVtZW50KVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAod2luZG93LmNvbnNvbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFzc2VydGlvbiBmYWlsZWRcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXNzZXJ0LmRlYnVnKVxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuXG4gICAgICAgIGlmIChhc3NlcnQucHJvZHVjdGlvbilcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdGhyb3cgbmV3IFwiQXNzZXJ0aW9uIGZhaWxlZDogXCIrbWVzc2FnZTtcbn1cbmFzc2VydC5kZWJ1ZyA9IGZhbHNlO1xuYXNzZXJ0LnByb2R1Y3Rpb24gPSBmYWxzZTtcblxuZXhwb3J0cyA9IGFzc2VydDtcbiIsInJlcXVpcmUoJy4vYXBwLmpzJyk7XG4iLCIvKiogQXNzZXJ0aW9ucyAgKiovXG5cbi8vIFF1ZXJ5IGdlbmVyYXRpb25cbnZhciBxdWVyeUdlbmVyYXRvciA9IHtcblx0dXBkYXRlUGtleTogZnVuY3Rpb24odGFibGUsIHBrZXksIGlkLCBkYXRhKVxuXHR7XG5cdFx0dmFyIGNyaXRlcmlhID0ge307XG5cdFx0Y3JpdGVyaWFbcGtleV0gPSBpZDtcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUodGFibGUsIGNyaXRlcmlhLCBkYXRhKTtcblx0fSxcblxuXHR1cGRhdGU6IGZ1bmN0aW9uKHRhYmxlLCBjcml0ZXJpYSwgZGF0YSlcblx0e1xuXHRcdHZhciBzcWwgPSBcIlVQREFURSBgXCIrdGFibGUrXCJgIFxcblNFVCBcXG5cIjtcblx0XHR2YXIgcGFydHMgPSBbXTtcblx0XHRmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuXHRcdFx0dmFyIHZhbHVlID0gZGF0YVtrZXldO1xuXHRcdFx0cGFydHMucHVzaCgnICBgJytrZXkrJ2AgPSBcIicrKHZhbHVlK1wiXCIpLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJyk7XG5cdFx0fVxuXG5cdFx0c3FsICs9IHBhcnRzLmpvaW4oXCIsIFxcblwiKStcIiBcXG5cIjtcblx0XHRzcWwgKz0gXCJXSEVSRSBcXG5cIjtcblx0XHRwYXJ0cyA9IFtdO1xuXHRcdGZvciAodmFyIGtleSBpbiBjcml0ZXJpYSkge1xuXHRcdFx0dmFyIHZhbHVlID0gY3JpdGVyaWFba2V5XTtcblx0XHRcdHBhcnRzLnB1c2goJyAgYCcra2V5KydgID0gXCInKyh2YWx1ZStcIlwiKS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIicpO1xuXHRcdH1cblx0XHRzcWwgKz0gcGFydHMuam9pbihcIiBcXG4gIEFORCBcIikrXCIgXFxuXCI7XG5cdFx0cmV0dXJuIHNxbDtcblx0fSxcblxuXHRzZWxlY3Q6IGZ1bmN0aW9uKHRhYmxlLCBzZWxlY3Rpb24sIGNyaXRlcmlhLCBvcmRlciwgcGFnZSlcblx0e1xuXHRcdHZhciBzcWwgPSBcIlNFTEVDVCBcIjtcblxuXHRcdGlmIChzZWxlY3Rpb24pIHtcblx0XHRcdHZhciBncm9vbWVkU2VsZWN0aW9uID0gW107XG5cdFx0XHRmb3IgKHZhciBpIGluIHNlbGVjdGlvbikge1xuXHRcdFx0XHR2YXIgaXRlbSA9IHNlbGVjdGlvbltpXTtcblxuXHRcdFx0XHRpZiAoaXRlbS5tYXRjaCgvXltBLVphLXowLTldKyQvKSkge1xuXHRcdFx0XHRcdGl0ZW0gPSAnYCcraXRlbSsnYCc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRncm9vbWVkU2VsZWN0aW9uLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRzZWxlY3Rpb24gPSBncm9vbWVkU2VsZWN0aW9uO1xuXHRcdH1cblxuXHRcdGlmICghc2VsZWN0aW9uIHx8IHNlbGVjdGlvbi5sZW5ndGggPT0gMClcblx0XHRcdHNxbCArPSAnKiAnO1xuXHRcdGVsc2UgaWYgKHNlbGVjdGlvbi5sZW5ndGggPT0gMSlcblx0XHRcdHNxbCArPSBzZWxlY3Rpb25bMF0rXCIgXCI7XG5cdFx0ZWxzZVxuXHRcdFx0c3FsICs9IFwiXFxuICBcIitzZWxlY3Rpb24uam9pbihcIiwgXFxuICBcIikrXCIgXFxuXCI7XG5cblx0XHRpZiAoIXRhYmxlICYmIGNyaXRlcmlhKSB7XG5cdFx0XHR0aHJvdyBcIk11c3Qgc3BlY2lmeSBhIHRhYmxlIGlmIGNyaXRlcmlhIGlzIHNwZWNpZmllZFwiO1xuXHRcdH1cblxuXHRcdGlmICh0YWJsZSkge1xuXHRcdFx0aWYgKCFzZWxlY3Rpb24gfHwgc2VsZWN0aW9uLmxlbmd0aCA8PSAxKVxuXHRcdFx0XHRzcWwgKz0gXCJGUk9NIGBcIit0YWJsZStcImAgXFxuXCI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHNxbCArPSBcIkZST01cXG4gIGBcIit0YWJsZStcImAgXFxuXCI7XG5cdFx0fVxuXG5cdFx0aWYgKGNyaXRlcmlhKSB7XG5cdFx0XHRzcWwgKz0gXCJXSEVSRSBcIjtcblx0XHRcdHZhciBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgZmllbGQgaW4gY3JpdGVyaWEpIHtcblx0XHRcdFx0cGFydHMucHVzaCgnICBgJytmaWVsZCsnYCA9IFwiJysoY3JpdGVyaWFbZmllbGRdK1wiXCIpLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXJ0cy5sZW5ndGggPT0gMSlcblx0XHRcdFx0c3FsICs9IHBhcnRzWzBdK1wiIFxcblwiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzcWwgKz0gXCIgXFxuXCIrcGFydHMuam9pbihcIiBBTkQgXFxuXCIpK1wiIFxcblwiO1xuXHRcdH1cblxuXHRcdGlmIChvcmRlcikge1xuXHRcdFx0c3FsICs9IFwiT1JERVIgQlkgXCI7XG5cdFx0XHR2YXIgcGFydHMgPSBbXTtcblx0XHRcdGZvciAodmFyIGZpZWxkIGluIG9yZGVyKSB7XG5cdFx0XHRcdHBhcnRzLnB1c2goJ2AnK2ZpZWxkKydgICcrKG9yZGVyW2ZpZWxkXS50b0xvd2VyQ2FzZSgpID09IFwiYXNjXCIgPyBcIkFTQ1wiIDogXCJERVNDXCIpKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHBhcnRzLmxlbmd0aCA9PSAxKVxuXHRcdFx0XHRzcWwgKz0gcGFydHNbMF0rXCIgXFxuXCI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHNxbCArPSBcIiBcXG5cIitwYXJ0cy5qb2luKFwiLCBcXG5cIikrXCIgXFxuXCI7XG5cdFx0fVxuXG5cdFx0aWYgKHBhZ2UpIHtcblx0XHRcdHNxbCArPSBcIkxJTUlUIFwiK3BhZ2UubGltaXQ7XG5cblx0XHRcdGlmIChwYWdlLm9mZnNldClcblx0XHRcdFx0c3FsICs9IFwiIE9GRlNFVCBcIitwYWdlLm9mZnNldDtcdFxuXHRcdH1cblx0XHRyZXR1cm4gc3FsLnJlcGxhY2UoL15cXG58XFxuJC9tZywgXCJcIikrXCIgXFxuXCI7XG5cdH1cbn07XG5cbmV4cG9ydHMgPSBxdWVyeUdlbmVyYXRvcjtcbiJdfQ==

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
module.exports = api;

},{}],2:[function(require,module,exports){
/** Assertions  **/

var assert = require('./assert.js');
var api = require('./api.js');
var queryGenerator = require('./queryGenerator.js');
window.queryGenerator = queryGenerator;

/** UI **/

window.addEventListener('polymer-ready', function() {
	$(document).ready(function() {
		sequeldashInit();
	});
});

window.sequeldash = {
};

function sequeldashInit() {
	$('.loading-indicator').addClass('active');

	// Initialize Angular
	angular.module('sequeldash', []);
	angular.bootstrap(document, ['sequeldash']);

	function updateHeroHeader(firstPage)
	{

		if ($('.content-container .hero-content').length > 0) {
			$('core-toolbar .middle').html($('.content-container .hero-content').children());
			$('core-toolbar').addClass('hero');
		} else {
			$('core-toolbar').removeClass('hero');
		}

		$('core-toolbar .middle').hide();
		$('.content-container .hero-content').remove();

		var size = 131;
		var duration = 1000;
		var hideBar = true;
		var container = $('core-scroll-header-panel::shadow #mainContainer').get(0);

		if ($('core-toolbar').hasClass('hero')) {
			size = 341;
			hideBar = false;
			duration = 3000;
		}
		

		if (container) {
			$(container).css('padding-top', $('core-toolbar').height());

			setTimeout(function() {

				$('core-scroll-header-panel').get(0).async('measureHeaderHeight');

				if (!hideBar || !firstPage) {
					console.log('not hide, scrolling down immediately');
					$(container).scrollTop(size);
				}

				console.log('remeasure');
				$('core-toolbar .middle').show();
				// Make the header pretty
				if (!hideBar) {
					setTimeout(function() {
						$(container).animate({scrollTop: 0}, {duration:duration});
					}, 500);

				} else if (firstPage) {
					setTimeout(function() {
						$(container).animate({scrollTop: size}, {duration:duration});
					}, 250);
				}
			}, 500);
		}
	}

	updateHeroHeader(true);

	var $coreScrollHeaderPanel = $( 'core-scroll-header-panel' );
	$coreScrollHeaderPanel.shadow('#headerContainer').on( 'wheel', function (e) {
		var $mainContainer = $coreScrollHeaderPanel.shadow('#mainContainer');
		var val = $mainContainer.scrollTop() + e.originalEvent.deltaY;
		console.log(val + " / " + e.offsetY);
		$mainContainer.scrollTop(val);
	});

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

	$(document).trigger('app-ready');

	// Install custom behaviors

	var $templateCache = {};
	var $urlToTemplate = {};

	/**
	 * Quick mode, store the template we need for that page for later return
	 */
	$(window).on('popstate', function(e) {
		var url = document.location+"";
		var $scope = $('html').scope();
		var data = e.state;

		console.log("goin: "+url);
		loadPage(url);
		//applyPage($scope, data.model);
		//data.$template($scope);
	});

	$('body').on('click', 'a', function(e) {
		e.preventDefault();
		var $a = $(e.currentTarget);
		var url = $a.attr('href');

		loadPage(url);
	});

	function applyPage($scope, $model, content)
	{
		$scope.$apply(function($scope) { 
			for (var key in window.$state) 
				delete $scope[key];
			
			for (var key in $model) 
				$scope[key] = $model[key];
		});
		
		var $injector = angular.injector(['ng']);
		var $compileState = null;
		$injector.invoke(function($compile) {

			var $dom = $('<template>'+content+'</template>');
			var templateName = $dom.get(0).content.querySelector("div.meta.template-name");
			if (templateName)
				templateName = templateName.getAttribute('data-value');
			else
				templateName = null;

			$dom.remove();

			var $template = null;
			var cached = null;
			
			if (templateName)
				cached = $templateCache[templateName];

			// It appears that there's no fucking way to make this template caching
			// work correctly, because the second page load of a template (ie 
			// when the template is already cached), the result will have the OLD
			// template data and there is no way to change this ever again.
			
			if (false && cached) {
				$template = cached;	
			} else {
				$template = $compile(content);
				$templateCache[templateName] = $template;				
			}

			$('.content-container').html('<div></div>');
			$('.content-container').find('div').html('');
			$('.content-container').find('div').replaceWith($template($scope));
			$scope.$apply();

			$compileState = {
				template: $template, 
				state: $model
			};
			$('.loading-indicator').removeClass('active');
		});

		return $compileState;
	}

	var viewStackState = {};

	function loadPage(url) {
		var self = this;
		$('.loading-indicator').addClass('active');
		$.post(url, {
			inline: 1
		}, function(r) {
			var $model = JSON.parse(r.model);
			var $scope = $('html').scope();
			if ($scope) {
				var $compileState = applyPage($scope, $model, r.content);
				$('core-toolbar .middle').html('');
				updateHeroHeader();	

				window.history.pushState({}, "Another", url);
			}
			
		}, 'json').error(function(e) {
			alert('Error: '+e);
			console.log(e);
		});

		return false;
	}

	$('input[type=text].filter').each(function() {
		var $filter = $(this);
		var $ngApp = $('[ng-app]');
		var $scope = $ngApp.scope();
		var property = $filter.data('filter');

		if (!$scope) {
			console.log('failed to find angular scope for filter');
			return;
		}

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
	
	}
	$('.loading-indicator').removeClass('active');
}

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

module.exports = queryGenerator;

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvYXBpLmpzIiwiL2hvbWUvbGlhbS9DcmVhdGl2ZS9Db2RlL1dlYi9zZXF1ZWxkYXNoL2pzL2FwcC5qcyIsIi9ob21lL2xpYW0vQ3JlYXRpdmUvQ29kZS9XZWIvc2VxdWVsZGFzaC9qcy9hc3NlcnQuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvZW50cnkuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvcXVlcnlHZW5lcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN29CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxudmFyIGFwaSA9IHtcblx0ZGI6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24oc3FsLCBwYXJhbXMpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0XHQvLyBGSVhNRSBwYXRoaW5nIChwdXQgYSBmdWNrZW4gPGJhc2U+IG9uIHRoYXIpXG5cdFx0XHRcdCQucG9zdCgnL3NlcXVlbGRhc2gvYXBwL2Ricy8nK25hbWUrJy9xdWVyeScsIHtcblx0XHRcdFx0XHRxdWVyeTogc3FsLFxuXHRcdFx0XHRcdGFqYXg6IDFcblx0XHRcdFx0fSwgZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdGlmICghci5lcnJvcilcblx0XHRcdFx0XHRcdHJlc29sdmUocik7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cmVqZWN0KHIpO1xuXG5cdFx0XHRcdH0sICdqc29uJykuZmFpbChmdW5jdGlvbih4aHIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcInhociBlcnJvclwiKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyh4aHIpO1xuXHRcdFx0XHRcdHJlamVjdCh7ZXJyb3I6IFwiWEhSIGVycm9yXCIsIHF1ZXJ5OiB7fX0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cdH1cbn07XG5cbndpbmRvdy5hcGkgPSBhcGk7XG5tb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiIsIi8qKiBBc3NlcnRpb25zICAqKi9cblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4vYXNzZXJ0LmpzJyk7XG52YXIgYXBpID0gcmVxdWlyZSgnLi9hcGkuanMnKTtcbnZhciBxdWVyeUdlbmVyYXRvciA9IHJlcXVpcmUoJy4vcXVlcnlHZW5lcmF0b3IuanMnKTtcbndpbmRvdy5xdWVyeUdlbmVyYXRvciA9IHF1ZXJ5R2VuZXJhdG9yO1xuXG4vKiogVUkgKiovXG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb2x5bWVyLXJlYWR5JywgZnVuY3Rpb24oKSB7XG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdHNlcXVlbGRhc2hJbml0KCk7XG5cdH0pO1xufSk7XG5cbndpbmRvdy5zZXF1ZWxkYXNoID0ge1xufTtcblxuZnVuY3Rpb24gc2VxdWVsZGFzaEluaXQoKSB7XG5cdCQoJy5sb2FkaW5nLWluZGljYXRvcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuXHQvLyBJbml0aWFsaXplIEFuZ3VsYXJcblx0YW5ndWxhci5tb2R1bGUoJ3NlcXVlbGRhc2gnLCBbXSk7XG5cdGFuZ3VsYXIuYm9vdHN0cmFwKGRvY3VtZW50LCBbJ3NlcXVlbGRhc2gnXSk7XG5cblx0ZnVuY3Rpb24gdXBkYXRlSGVyb0hlYWRlcihmaXJzdFBhZ2UpXG5cdHtcblxuXHRcdGlmICgkKCcuY29udGVudC1jb250YWluZXIgLmhlcm8tY29udGVudCcpLmxlbmd0aCA+IDApIHtcblx0XHRcdCQoJ2NvcmUtdG9vbGJhciAubWlkZGxlJykuaHRtbCgkKCcuY29udGVudC1jb250YWluZXIgLmhlcm8tY29udGVudCcpLmNoaWxkcmVuKCkpO1xuXHRcdFx0JCgnY29yZS10b29sYmFyJykuYWRkQ2xhc3MoJ2hlcm8nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnY29yZS10b29sYmFyJykucmVtb3ZlQ2xhc3MoJ2hlcm8nKTtcblx0XHR9XG5cblx0XHQkKCdjb3JlLXRvb2xiYXIgLm1pZGRsZScpLmhpZGUoKTtcblx0XHQkKCcuY29udGVudC1jb250YWluZXIgLmhlcm8tY29udGVudCcpLnJlbW92ZSgpO1xuXG5cdFx0dmFyIHNpemUgPSAxMzE7XG5cdFx0dmFyIGR1cmF0aW9uID0gMTAwMDtcblx0XHR2YXIgaGlkZUJhciA9IHRydWU7XG5cdFx0dmFyIGNvbnRhaW5lciA9ICQoJ2NvcmUtc2Nyb2xsLWhlYWRlci1wYW5lbDo6c2hhZG93ICNtYWluQ29udGFpbmVyJykuZ2V0KDApO1xuXG5cdFx0aWYgKCQoJ2NvcmUtdG9vbGJhcicpLmhhc0NsYXNzKCdoZXJvJykpIHtcblx0XHRcdHNpemUgPSAzNDE7XG5cdFx0XHRoaWRlQmFyID0gZmFsc2U7XG5cdFx0XHRkdXJhdGlvbiA9IDMwMDA7XG5cdFx0fVxuXHRcdFxuXG5cdFx0aWYgKGNvbnRhaW5lcikge1xuXHRcdFx0JChjb250YWluZXIpLmNzcygncGFkZGluZy10b3AnLCAkKCdjb3JlLXRvb2xiYXInKS5oZWlnaHQoKSk7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0JCgnY29yZS1zY3JvbGwtaGVhZGVyLXBhbmVsJykuZ2V0KDApLmFzeW5jKCdtZWFzdXJlSGVhZGVySGVpZ2h0Jyk7XG5cblx0XHRcdFx0aWYgKCFoaWRlQmFyIHx8ICFmaXJzdFBhZ2UpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnbm90IGhpZGUsIHNjcm9sbGluZyBkb3duIGltbWVkaWF0ZWx5Jyk7XG5cdFx0XHRcdFx0JChjb250YWluZXIpLnNjcm9sbFRvcChzaXplKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZW1lYXN1cmUnKTtcblx0XHRcdFx0JCgnY29yZS10b29sYmFyIC5taWRkbGUnKS5zaG93KCk7XG5cdFx0XHRcdC8vIE1ha2UgdGhlIGhlYWRlciBwcmV0dHlcblx0XHRcdFx0aWYgKCFoaWRlQmFyKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoY29udGFpbmVyKS5hbmltYXRlKHtzY3JvbGxUb3A6IDB9LCB7ZHVyYXRpb246ZHVyYXRpb259KTtcblx0XHRcdFx0XHR9LCA1MDApO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoZmlyc3RQYWdlKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoY29udGFpbmVyKS5hbmltYXRlKHtzY3JvbGxUb3A6IHNpemV9LCB7ZHVyYXRpb246ZHVyYXRpb259KTtcblx0XHRcdFx0XHR9LCAyNTApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCA1MDApO1xuXHRcdH1cblx0fVxuXG5cdHVwZGF0ZUhlcm9IZWFkZXIodHJ1ZSk7XG5cblx0dmFyICRjb3JlU2Nyb2xsSGVhZGVyUGFuZWwgPSAkKCAnY29yZS1zY3JvbGwtaGVhZGVyLXBhbmVsJyApO1xuXHQkY29yZVNjcm9sbEhlYWRlclBhbmVsLnNoYWRvdygnI2hlYWRlckNvbnRhaW5lcicpLm9uKCAnd2hlZWwnLCBmdW5jdGlvbiAoZSkge1xuXHRcdHZhciAkbWFpbkNvbnRhaW5lciA9ICRjb3JlU2Nyb2xsSGVhZGVyUGFuZWwuc2hhZG93KCcjbWFpbkNvbnRhaW5lcicpO1xuXHRcdHZhciB2YWwgPSAkbWFpbkNvbnRhaW5lci5zY3JvbGxUb3AoKSArIGUub3JpZ2luYWxFdmVudC5kZWx0YVk7XG5cdFx0Y29uc29sZS5sb2codmFsICsgXCIgLyBcIiArIGUub2Zmc2V0WSk7XG5cdFx0JG1haW5Db250YWluZXIuc2Nyb2xsVG9wKHZhbCk7XG5cdH0pO1xuXG5cdC8vIE1ha2Ugc3VyZSB3ZSBoYXZlIGEgc3RhdGVcblx0aWYgKCF3aW5kb3cuJHN0YXRlKSB7XG5cdFx0Y29uc29sZS5sb2coJ0Vycm9yOiBObyBzdGF0ZSBwcm92aWRlZC4nKTtcblx0XHRhbGVydCgnQW4gYXBwbGljYXRpb24gZXJyb3IgaGFzIG9jY3VycmVkOiBObyBzdGF0ZSBwcm92aWRlZCcpO1xuXHRcdHJldHVybjtcblx0fVxuXHRcblxuXHQvLyBBcHBseSBpdFxuXHR2YXIgJHNjb3BlID0gJCgnaHRtbCcpLnNjb3BlKCk7XG5cdGZvciAodmFyIGtleSBpbiAkc3RhdGUpIHtcblx0XHQkc2NvcGVba2V5XSA9ICRzdGF0ZVtrZXldO1xuXHR9XG5cdCRzY29wZS5zdGFydHVwID0gZmFsc2U7XG5cdCRzY29wZS4kYXBwbHkoKTtcblxuXHQkKGRvY3VtZW50KS50cmlnZ2VyKCdhcHAtcmVhZHknKTtcblxuXHQvLyBJbnN0YWxsIGN1c3RvbSBiZWhhdmlvcnNcblxuXHR2YXIgJHRlbXBsYXRlQ2FjaGUgPSB7fTtcblx0dmFyICR1cmxUb1RlbXBsYXRlID0ge307XG5cblx0LyoqXG5cdCAqIFF1aWNrIG1vZGUsIHN0b3JlIHRoZSB0ZW1wbGF0ZSB3ZSBuZWVkIGZvciB0aGF0IHBhZ2UgZm9yIGxhdGVyIHJldHVyblxuXHQgKi9cblx0JCh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgdXJsID0gZG9jdW1lbnQubG9jYXRpb24rXCJcIjtcblx0XHR2YXIgJHNjb3BlID0gJCgnaHRtbCcpLnNjb3BlKCk7XG5cdFx0dmFyIGRhdGEgPSBlLnN0YXRlO1xuXG5cdFx0Y29uc29sZS5sb2coXCJnb2luOiBcIit1cmwpO1xuXHRcdGxvYWRQYWdlKHVybCk7XG5cdFx0Ly9hcHBseVBhZ2UoJHNjb3BlLCBkYXRhLm1vZGVsKTtcblx0XHQvL2RhdGEuJHRlbXBsYXRlKCRzY29wZSk7XG5cdH0pO1xuXG5cdCQoJ2JvZHknKS5vbignY2xpY2snLCAnYScsIGZ1bmN0aW9uKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dmFyICRhID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuXHRcdHZhciB1cmwgPSAkYS5hdHRyKCdocmVmJyk7XG5cblx0XHRsb2FkUGFnZSh1cmwpO1xuXHR9KTtcblxuXHRmdW5jdGlvbiBhcHBseVBhZ2UoJHNjb3BlLCAkbW9kZWwsIGNvbnRlbnQpXG5cdHtcblx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCRzY29wZSkgeyBcblx0XHRcdGZvciAodmFyIGtleSBpbiB3aW5kb3cuJHN0YXRlKSBcblx0XHRcdFx0ZGVsZXRlICRzY29wZVtrZXldO1xuXHRcdFx0XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gJG1vZGVsKSBcblx0XHRcdFx0JHNjb3BlW2tleV0gPSAkbW9kZWxba2V5XTtcblx0XHR9KTtcblx0XHRcblx0XHR2YXIgJGluamVjdG9yID0gYW5ndWxhci5pbmplY3RvcihbJ25nJ10pO1xuXHRcdHZhciAkY29tcGlsZVN0YXRlID0gbnVsbDtcblx0XHQkaW5qZWN0b3IuaW52b2tlKGZ1bmN0aW9uKCRjb21waWxlKSB7XG5cblx0XHRcdHZhciAkZG9tID0gJCgnPHRlbXBsYXRlPicrY29udGVudCsnPC90ZW1wbGF0ZT4nKTtcblx0XHRcdHZhciB0ZW1wbGF0ZU5hbWUgPSAkZG9tLmdldCgwKS5jb250ZW50LnF1ZXJ5U2VsZWN0b3IoXCJkaXYubWV0YS50ZW1wbGF0ZS1uYW1lXCIpO1xuXHRcdFx0aWYgKHRlbXBsYXRlTmFtZSlcblx0XHRcdFx0dGVtcGxhdGVOYW1lID0gdGVtcGxhdGVOYW1lLmdldEF0dHJpYnV0ZSgnZGF0YS12YWx1ZScpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0ZW1wbGF0ZU5hbWUgPSBudWxsO1xuXG5cdFx0XHQkZG9tLnJlbW92ZSgpO1xuXG5cdFx0XHR2YXIgJHRlbXBsYXRlID0gbnVsbDtcblx0XHRcdHZhciBjYWNoZWQgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRpZiAodGVtcGxhdGVOYW1lKVxuXHRcdFx0XHRjYWNoZWQgPSAkdGVtcGxhdGVDYWNoZVt0ZW1wbGF0ZU5hbWVdO1xuXG5cdFx0XHQvLyBJdCBhcHBlYXJzIHRoYXQgdGhlcmUncyBubyBmdWNraW5nIHdheSB0byBtYWtlIHRoaXMgdGVtcGxhdGUgY2FjaGluZ1xuXHRcdFx0Ly8gd29yayBjb3JyZWN0bHksIGJlY2F1c2UgdGhlIHNlY29uZCBwYWdlIGxvYWQgb2YgYSB0ZW1wbGF0ZSAoaWUgXG5cdFx0XHQvLyB3aGVuIHRoZSB0ZW1wbGF0ZSBpcyBhbHJlYWR5IGNhY2hlZCksIHRoZSByZXN1bHQgd2lsbCBoYXZlIHRoZSBPTERcblx0XHRcdC8vIHRlbXBsYXRlIGRhdGEgYW5kIHRoZXJlIGlzIG5vIHdheSB0byBjaGFuZ2UgdGhpcyBldmVyIGFnYWluLlxuXHRcdFx0XG5cdFx0XHRpZiAoZmFsc2UgJiYgY2FjaGVkKSB7XG5cdFx0XHRcdCR0ZW1wbGF0ZSA9IGNhY2hlZDtcdFxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JHRlbXBsYXRlID0gJGNvbXBpbGUoY29udGVudCk7XG5cdFx0XHRcdCR0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSAkdGVtcGxhdGU7XHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0JCgnLmNvbnRlbnQtY29udGFpbmVyJykuaHRtbCgnPGRpdj48L2Rpdj4nKTtcblx0XHRcdCQoJy5jb250ZW50LWNvbnRhaW5lcicpLmZpbmQoJ2RpdicpLmh0bWwoJycpO1xuXHRcdFx0JCgnLmNvbnRlbnQtY29udGFpbmVyJykuZmluZCgnZGl2JykucmVwbGFjZVdpdGgoJHRlbXBsYXRlKCRzY29wZSkpO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXG5cdFx0XHQkY29tcGlsZVN0YXRlID0ge1xuXHRcdFx0XHR0ZW1wbGF0ZTogJHRlbXBsYXRlLCBcblx0XHRcdFx0c3RhdGU6ICRtb2RlbFxuXHRcdFx0fTtcblx0XHRcdCQoJy5sb2FkaW5nLWluZGljYXRvcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiAkY29tcGlsZVN0YXRlO1xuXHR9XG5cblx0dmFyIHZpZXdTdGFja1N0YXRlID0ge307XG5cblx0ZnVuY3Rpb24gbG9hZFBhZ2UodXJsKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdCQoJy5sb2FkaW5nLWluZGljYXRvcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHQkLnBvc3QodXJsLCB7XG5cdFx0XHRpbmxpbmU6IDFcblx0XHR9LCBmdW5jdGlvbihyKSB7XG5cdFx0XHR2YXIgJG1vZGVsID0gSlNPTi5wYXJzZShyLm1vZGVsKTtcblx0XHRcdHZhciAkc2NvcGUgPSAkKCdodG1sJykuc2NvcGUoKTtcblx0XHRcdGlmICgkc2NvcGUpIHtcblx0XHRcdFx0dmFyICRjb21waWxlU3RhdGUgPSBhcHBseVBhZ2UoJHNjb3BlLCAkbW9kZWwsIHIuY29udGVudCk7XG5cdFx0XHRcdCQoJ2NvcmUtdG9vbGJhciAubWlkZGxlJykuaHRtbCgnJyk7XG5cdFx0XHRcdHVwZGF0ZUhlcm9IZWFkZXIoKTtcdFxuXG5cdFx0XHRcdHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgXCJBbm90aGVyXCIsIHVybCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9LCAnanNvbicpLmVycm9yKGZ1bmN0aW9uKGUpIHtcblx0XHRcdGFsZXJ0KCdFcnJvcjogJytlKTtcblx0XHRcdGNvbnNvbGUubG9nKGUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0JCgnaW5wdXRbdHlwZT10ZXh0XS5maWx0ZXInKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdHZhciAkZmlsdGVyID0gJCh0aGlzKTtcblx0XHR2YXIgJG5nQXBwID0gJCgnW25nLWFwcF0nKTtcblx0XHR2YXIgJHNjb3BlID0gJG5nQXBwLnNjb3BlKCk7XG5cdFx0dmFyIHByb3BlcnR5ID0gJGZpbHRlci5kYXRhKCdmaWx0ZXInKTtcblxuXHRcdGlmICghJHNjb3BlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZmFpbGVkIHRvIGZpbmQgYW5ndWxhciBzY29wZSBmb3IgZmlsdGVyJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGRhdGEgPSAkc2NvcGUuJGV2YWwocHJvcGVydHkpOyBcblx0XHR2YXIgZmlsdGVyaW5nID0gZmFsc2U7XG5cdFx0dmFyIHN1YnByb3AgPSAkZmlsdGVyLmRhdGEoJ3RhcmdldCcpO1x0XG5cblx0XHR2YXIgZG9GaWx0ZXIgPSBmdW5jdGlvbihkYXRhLCBmaWx0ZXIpIHtcblx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSBbXTtcblxuXHRcdFx0aWYgKCFmaWx0ZXIpXG5cdFx0XHRcdHJldHVybiBkYXRhO1xuXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuXHRcdFx0XHR2YXIgcm93ID0gZGF0YVtrZXldO1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gcm93O1xuXHRcdFx0XHRpZiAoc3VicHJvcClcblx0XHRcdFx0XHR0YXJnZXQgPSByb3dbc3VicHJvcF07XG5cblx0XHRcdFx0aWYgKHRhcmdldC5pbmRleE9mKGZpbHRlcikgPj0gMCkgXG5cdFx0XHRcdFx0ZmlsdGVyZWREYXRhLnB1c2gocm93KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZpbHRlcmVkRGF0YTtcblx0XHR9O1xuXG5cdFx0JHNjb3BlLiR3YXRjaChwcm9wZXJ0eSwgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG5cdFx0XHRpZiAoZmlsdGVyaW5nKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRkYXRhID0gbmV3VmFsdWU7XHRcblx0XHRcdCRmaWx0ZXIuY2hhbmdlKCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgdGltZW91dCA9IG51bGw7XG5cdFx0JGZpbHRlci5rZXlkb3duKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRpbWVvdXQpXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JGZpbHRlci5jaGFuZ2UoKTtcblx0XHRcdH0sIDUwMCk7XG5cdFx0fSk7XG5cblx0XHQkZmlsdGVyLmNoYW5nZShmdW5jdGlvbigpIHtcblx0XHRcdGZpbHRlcmluZyA9IHRydWU7XG5cdFx0XHR2YXIgaW5uZXJTY29wZSA9ICRzY29wZTtcblx0XHRcdHZhciBjb21wcyA9IHByb3BlcnR5LnNwbGl0KCcuJyk7XG5cdFx0XHRmb3IgKHZhciBpIGluIGNvbXBzKSB7XG5cdFx0XHRcdHZhciBrZXkgPSBjb21wc1tpXTtcblx0XHRcdFx0aWYgKHBhcnNlSW50KGkpICsgMSA9PSBjb21wcy5sZW5ndGgpXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGlmICghaW5uZXJTY29wZVtrZXldKVxuXHRcdFx0XHRcdGlubmVyU2NvcGVba2V5XSA9IHt9O1xuXG5cdFx0XHRcdGlubmVyU2NvcGUgPSBpbm5lclNjb3BlW2tleV07XG5cdFx0XHR9XG5cblx0XHRcdGlubmVyU2NvcGVbY29tcHNbY29tcHMubGVuZ3RoIC0gMV1dID0gZG9GaWx0ZXIoZGF0YSwgJGZpbHRlci52YWwoKSk7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBkaXNwbGF5IG9mIHRoZSBnaXZlbiBkYXRhIHZhbHVlcyBmb3IgYWxsIG1hdGNoaW5nIHJvd3Mgd2hpY2ggYXJlIG5vdCBwZW5kaW5nIFxuXHQgKiBjaGFuZ2VzIHdpdGhpbiB0aGUgZ2l2ZW4gcmVzdWx0IHNldC4gIFxuXHQgKiBUaGlzIGlzIHVzZWQgdG8gZml4IGRpc3BsYXkgb2Ygcm93cyB3aGljaCB3ZSBpbXBsaWNpdGx5IGtub3cgaGF2ZSBjaGFuZ2VkIHNlcnZlciBzaWRlLCBzdWNoIGFzIFxuXHQgKiB3aGVuIGRvaW5nIGFuIHVwZGF0ZSBvbiBhIHRhYmxlIHdpdGhvdXQgcHJpbWFyeSBrZXlzIHdoZW4gdGhlcmUgYXJlIChvciBjb3VsZCBiZSkgbXVsdGlwbGVcblx0ICogaWRlbnRpY2FsIHJvd3MuXG5cdCAqL1x0XG5cdGZ1bmN0aW9uIHVwZGF0ZURpc3BsYXlSb3dzQnlDcml0ZXJpYSgkcXVlcnlSZXN1bHRzLCBjcml0ZXJpYSwgZGF0YSlcblx0e1xuXHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndGJvZHkgdHInKS5ub3QoJy51bnNhdmVkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciByb3cgPSAkKHRoaXMpLmV4dHJhY3RSb3coKTtcblx0XHRcdHZhciBza2lwID0gZmFsc2U7XG5cdFx0XHRmb3IgKHZhciBmaWVsZCBpbiBjcml0ZXJpYSkge1xuXHRcdFx0XHRpZiAoY3JpdGVyaWFbZmllbGRdICE9IHJvd1tmaWVsZF0pIHtcblx0XHRcdFx0XHRza2lwID0gdHJ1ZTsgYnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHNraXApXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0Ly8gTWF0Y2hpbmcgcm93LCB1cGRhdGVcblxuXHRcdFx0JCh0aGlzKS5maW5kKCd0ZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICghZGF0YVskKHRoaXMpLmRhdGEoJ2tleScpXSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB2YWx1ZSA9IGRhdGFbJCh0aGlzKS5kYXRhKCdrZXknKV07XG5cblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygndW5zYXZlZCcpO1xuXHRcdFx0XHQkKHRoaXMpLmRhdGEoJ3ZhbHVlJywgdmFsdWUpO1xuXHRcdFx0XHQkKHRoaXMpLmh0bWwoJzxzcGFuIGNsYXNzPVwidHJhaWxlclwiPjwvc3Bhbj4nKTtcblx0XHRcdFx0JCh0aGlzKS5maW5kKCcudHJhaWxlcicpLmF0dHIoJ3RpdGxlJywgdmFsdWUpLmh0bWwodmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0XHRmbGFzaFJvdygkKHRoaXMpKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIG1hcmtSb3dTYXZlZCgkcm93KSB7XG5cdFx0JHJvdy5yZW1vdmVDbGFzcygndW5zYXZlZCcpO1xuXHRcdCRyb3cuZmluZCgndGQudW5zYXZlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMpLmRhdGEoJ3ZhbHVlJywgJCh0aGlzKS5kYXRhKCdwcm9wb3NlZFZhbHVlJykpO1xuXHRcdH0pLnJlbW92ZUNsYXNzKCd1bnNhdmVkJyk7XG5cdFx0Zmxhc2hSb3coJHJvdyk7XG5cblx0XHQkcm93LmZpbmQoJ3RkLnN0YXR1cycpLmh0bWwoJycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmxhc2hSb3coJHJvdykge1xuXHRcdCRyb3cuY3NzKHtiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1NSwgMTYzLCAxMDIsIDEpJ30pO1xuXHRcdCRyb3cuYW5pbWF0ZSh7XG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1NSwgMTYzLCAxMDIsIDApJ1xuXHRcdH0sIHtcblx0XHRcdGR1cmF0aW9uOiA0MDAwXG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplUXVlcnlVaSgkcXVlcnlVaSkge1xuXHRcdHZhciAkcXVlcnlJbnB1dCA9ICRxdWVyeVVpLmZpbmQoJy5xdWVyeS1pbnB1dCcpO1xuXHRcdHZhciAkcXVlcnlBY2UgPSAkcXVlcnlVaS5maW5kKCcucXVlcnktYWNlJyk7XG5cblx0XHR2YXIgJHF1ZXJ5UmVzdWx0cyA9ICRxdWVyeVVpLmZpbmQoJy5xdWVyeS1yZXN1bHRzJyk7XG5cblx0XHQkcXVlcnlVaS5maW5kKCd0aC5zZWxlY3RBbGwgaW5wdXQnKS5jaGFuZ2UoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5pcygnOmNoZWNrZWQnKSkge1xuXHRcdFx0XHQkcXVlcnlVaS5maW5kKCd0Ym9keSB0cicpLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuXHRcdFx0XHQkcXVlcnlVaS5maW5kKCd0Ym9keSB0ciB0ZC5zZWxlY3QgaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkcXVlcnlVaS5maW5kKCd0Ym9keSB0cicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpO1xuXHRcdFx0XHQkcXVlcnlVaS5maW5kKCd0Ym9keSB0ciB0ZC5zZWxlY3QgaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JHF1ZXJ5VWkuZmluZCgndGQuc2VsZWN0IGlucHV0JykuY2hhbmdlKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCQodGhpcykuaXMoJzpjaGVja2VkJykpXG5cdFx0XHRcdCQodGhpcykucGFyZW50cygndHI6Zmlyc3QnKS5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0JCh0aGlzKS5wYXJlbnRzKCd0cjpmaXJzdCcpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpO1xuXHRcdH0pO1xuXG5cdFx0JHF1ZXJ5VWkuZmluZCgndGQnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdGlmICghJHF1ZXJ5UmVzdWx0cy5kYXRhKCd0YWJsZScpKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdGlmICgkKHRoaXMpLmhhc0NsYXNzKCdzdGF0dXMnKSB8fCAkKHRoaXMpLmhhc0NsYXNzKCdzZWxlY3QnKSlcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHR2YXIgdmFsdWUgPSAkKHRoaXMpLmRhdGEoJ3ZhbHVlJyk7XG5cdFx0XHRcblx0XHRcdGlmICgkKHRoaXMpLmRhdGEoJ3Byb3Bvc2VkVmFsdWUnKSkge1xuXHRcdFx0XHR2YWx1ZSA9ICQodGhpcykuZGF0YSgncHJvcG9zZWRWYWx1ZScpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgJGNlbGwgPSAkKHRoaXMpO1xuXHRcdFx0JGNlbGwuaHRtbCgnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDoxMDAlO2hlaWdodDoxMDAlO1wiIC8+Jyk7XG5cdFx0XHR2YXIgJGlucHV0ID0gJGNlbGwuZmluZCgnaW5wdXQnKTtcblx0XHRcdFxuXHRcdFx0dmFyICRlZGl0aW5nQ2VsbCA9ICQodGhpcyk7XG5cdFx0XHR2YXIgJGVkaXRpbmdSb3cgPSAkKHRoaXMpLnBhcmVudCgpO1xuXG5cdFx0XHQkaW5wdXQudmFsKHZhbHVlKTtcblx0XHRcdCRpbnB1dC5mb2N1cygpO1xuXHRcdFx0JGlucHV0LmtleWRvd24oZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0aWYgKGV2LndoaWNoID09IDI3KSB7XG5cdFx0XHRcdFx0JGlucHV0LnZhbCh2YWx1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZXYud2hpY2ggPT0gMTMgfHwgZXYud2hpY2ggPT0gMjcpIHtcblx0XHRcdFx0XHQkaW5wdXQuYmx1cigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXG5cdFx0XHQkaW5wdXQuYmx1cihmdW5jdGlvbigpIHtcblx0XHRcdFx0JGNlbGwuaHRtbCgnPHNwYW4gY2xhc3M9XCJ0cmFpbGVyXCI+PC9zcGFuPicpO1xuXHRcdFx0XHQkY2VsbC5maW5kKCcudHJhaWxlcicpLmF0dHIoJ3RpdGxlJywgJGlucHV0LnZhbCgpKS5odG1sKCRpbnB1dC52YWwoKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoJGlucHV0LnZhbCgpICE9IHZhbHVlKSB7XG5cdFx0XHRcdFx0JGVkaXRpbmdSb3dcblx0XHRcdFx0XHQgICAgLmFkZENsYXNzKCd1bnNhdmVkJylcblx0XHRcdFx0XHQgICAgLmZpbmQoJ3RkLnN0YXR1cycpXG5cdFx0XHRcdFx0ICAgIC5odG1sKFxuXHRcdFx0XHRcdFx0JzxidXR0b24gY2xhc3M9XCJkby1zYXZlLXJvdyBidG4tZGFuZ2VyXCIgJytcblx0XHRcdFx0XHRcdCAgJ3R5cGU9XCJidXR0b25cIj5TYXZlPC9idXR0b24+Jytcblx0XHRcdFx0XHRcdCc8YnV0dG9uIGNsYXNzPVwiYnRuLXByaW1hcnlcIiAnK1xuXHRcdFx0XHRcdFx0ICAndHlwZT1cImJ1dHRvblwiPlJldmVydDwvYnV0dG9uPidcblx0XHRcdFx0XHQgICAgKVxuXHRcdFx0XHRcdCAgICAuZmluZCgnLmRvLXNhdmUtcm93Jylcblx0XHRcdFx0XHQgICAgLmNsaWNrKGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRcdFx0XHR2YXIgcGtleSA9ICRlZGl0aW5nUm93LmRhdGEoJ3BrZXknKTtcblx0XHRcdFx0XHRcdHZhciBpZCA9ICRlZGl0aW5nUm93LmRhdGEoJ2lkJyk7XG5cdFx0XHRcdFx0XHR2YXIgdGFibGUgPSAkcXVlcnlSZXN1bHRzLmRhdGEoJ3RhYmxlJyk7XG5cdFx0XHRcdFx0XHR2YXIgcm93ID0gJGVkaXRpbmdSb3cuZXh0cmFjdFJvdygpO1xuXHRcdFx0XHRcdFx0dmFyIGRiTmFtZSA9ICRxdWVyeVJlc3VsdHMuZGF0YSgnZGInKTtcblx0XHRcdFx0XHRcdHZhciBkYiA9IG5ldyBhcGkuZGIoZGJOYW1lKTtcblxuXHRcdFx0XHRcdFx0aWYgKHBrZXkpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHVwZGF0ZVNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnVwZGF0ZVBrZXkodGFibGUsIHBrZXksIGlkLCBcblx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFxuXHRcdFx0XHRcdFx0XHRhbGVydCgnU2F2ZSByb3cgIycraWQrJyAoJytwa2V5KycpICBcXG5cXG4nK3VwZGF0ZVNxbCk7XG5cblx0XHRcdFx0XHRcdFx0ZGIgIC5xdWVyeSh1cGRhdGVTcWwpXG5cdFx0XHRcdFx0XHRcdCAgICAudGhlbihmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBVSVxuXHRcdFx0XHRcdFx0XHRcdG1hcmtSb3dTYXZlZCgkZWRpdGluZ1Jvdyk7XG5cdFx0XHRcdFx0XHRcdCAgICB9KS5jYXRjaChmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3F1ZXJ5IGZhaWxlZDonKTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyKTtcblx0XHRcdFx0XHRcdFx0XHRhbGVydCgncXVlcnkgZmFpbGVkJyk7XG5cdFx0XHRcdFx0XHRcdCAgICB9KTtcdFxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dmFyIHVwZGF0ZVNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnVwZGF0ZSh0YWJsZSwgXG5cdFx0XHRcdFx0XHRcdFx0cm93LmdldERhdGEoKSxcblx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFx0XHRcdFx0XHRcdHZhciBzZWxlY3RTcWwgPSBxdWVyeUdlbmVyYXRvci5zZWxlY3QoXG5cdFx0XHRcdFx0XHRcdFx0dGFibGUsXG5cdFx0XHRcdFx0XHRcdFx0WydDT1VOVCgqKSBjdCddLFxuXHRcdFx0XHRcdFx0XHRcdHJvdy5nZXREYXRhKClcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0dmFyIHVwZGF0ZUFsbE1hdGNoZXMgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHRkYiAgLnF1ZXJ5KHNlbGVjdFNxbClcblx0XHRcdFx0XHRcdFx0ICAgIC50aGVuKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoci5xdWVyeS5jb3VudCA8IDEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGFsZXJ0KCdJbnZhbGlkIHJlc3VsdCAoc2hvdWxkIGJlIDEgY291bnQgcm93KScpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyLnF1ZXJ5LnJlc3VsdHNbMF0uY3QgPiAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVBbGxNYXRjaGVzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBjb25maXJtZWQgPSBjb25maXJtKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQnV2FybmluZzpcXG4nK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnVGhpcyBhY3Rpb24gd2lsbCB1cGRhdGUgbXVsdGlwbGUgcm93cy5cXG4nK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnUm93cyBhZmZlY3RlZDogJytyLnF1ZXJ5LnJlc3VsdHNbMF0uY3QrXCJcXG5cXG5cIitcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJPSyB0byBjb250aW51ZSwgQ2FuY2VsIHRvIGFib3J0XFxuXFxuXCIrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiUXVlcnk6XFxuXFxuXCIrdXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybWVkKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBcInVzZXJBYm9ydGVkXCI7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdCAgICB9KVxuXHRcdFx0XHRcdFx0XHQgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGRiLnF1ZXJ5KHVwZGF0ZVNxbCk7XG5cdFx0XHRcdFx0XHRcdCAgICB9KS50aGVuKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoci5lcnJvcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoci5lcnJvcik7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBcInF1ZXJ5RXJyb3JcIjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBVSVxuXHRcdFx0XHRcdFx0XHRcdG1hcmtSb3dTYXZlZCgkZWRpdGluZ1Jvdyk7XG5cdFxuXHRcdFx0XHRcdFx0XHRcdGlmICh1cGRhdGVBbGxNYXRjaGVzKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVEaXNwbGF5Um93c0J5Q3JpdGVyaWEoJHF1ZXJ5UmVzdWx0cywgcm93LmdldERhdGEoKSwgcm93LmdldFByb3Bvc2VkKCkpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ICAgIH0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcblxuXG5cdFx0XHRcdFx0ICAgIH0pO1xuXG5cdFx0XHRcdFx0JGNlbGxcblx0XHRcdFx0XHQgICAgLmRhdGEoJ3Byb3Bvc2VkVmFsdWUnLCAkaW5wdXQudmFsKCkpXG5cdFx0XHRcdFx0ICAgIC5hZGRDbGFzcygndW5zYXZlZCcpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciAkb3ZlcmFsbFN0YXR1cyA9ICRxdWVyeVJlc3VsdHMuZmluZCgndGhlYWQgdGguc3RhdHVzJyk7XG5cdFx0XHRcdFx0dmFyIHRvdGFsID0gJHF1ZXJ5UmVzdWx0cy5maW5kKCd0ci51bnNhdmVkJykubGVuZ3RoO1xuXG5cdFx0XHRcdFx0aWYgKHRvdGFsID4gMSkge1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQkb3ZlcmFsbFN0YXR1c1xuXHRcdFx0XHRcdFx0ICAgIC5odG1sKFxuXHRcdFx0XHRcdFx0XHQnPGJ1dHRvbiBjbGFzcz1cImRvLXNhdmUtYWxsIGJ0biBidG4tZGFuZ2VyXCIgdHlwZT1cImJ1dHRvblwiPicrXG5cdFx0XHRcdFx0XHRcdCdTYXZlICcrdG90YWwrJyByb3dzPC9idXR0b24+J1xuXHRcdFx0XHRcdFx0ICAgIClcblx0XHRcdFx0XHRcdCAgICAuZmluZCgnLmRvLXNhdmUtYWxsJylcblx0XHRcdFx0XHRcdCAgICAuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBxdWVyaWVzID0gW107XG5cdFx0XHRcdFx0XHRcdHZhciBxdWVyeVN0YXRlID0gW107XG5cdFx0XHRcdFx0XHRcdHZhciB3YXJuZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoJHF1ZXJ5UmVzdWx0cy5maW5kKCd0ci51bnNhdmVkJykubGVuZ3RoID09IDApIHtcblx0XHRcdFx0XHRcdFx0XHQkcXVlcnlSZXN1bHRzLmZpbmQoJ3RyIHRoLnN0YXR1cycpLmh0bWwoJycpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndHIudW5zYXZlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyICRyb3cgPSAkKHRoaXMpO1xuXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHBrZXkgPSAkcm93LmRhdGEoJ3BrZXknKTtcblx0XHRcdFx0XHRcdFx0XHR2YXIgaWQgPSAkcm93LmRhdGEoJ2lkJyk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHRhYmxlID0gJHF1ZXJ5UmVzdWx0cy5kYXRhKCd0YWJsZScpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciByb3cgPSAkcm93LmV4dHJhY3RSb3coKTtcblx0XHRcdFx0XHRcdFx0XHR2YXIgZGJOYW1lID0gJHF1ZXJ5UmVzdWx0cy5kYXRhKCdkYicpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBkYiA9IG5ldyBhcGkuZGIoZGJOYW1lKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmICghd2FybmVkICYmICFwa2V5KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgbWVzc2FnZSA9IFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQnV2FybmluZzogVGhpcyB0YWJsZSBkb2VzIG5vdCBoYXZlIGEgcHJpbWFyeSBrZXkuXFxuJytcblx0XHRcdFx0XHRcdFx0XHRcdFx0J1RoZSByZXF1ZXN0ZWQgdXBkYXRlIG9wZXJhdGlvbnMgbWF5IGFmZmVjdCBtb3JlIHJvd3MgJytcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQndGhhbiBleHBlY3RlZC5cXG5cXG4nK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnQ2xpY2sgT0sgdG8gcHJvY2VlZCwgb3IgQ2FuY2VsIHRvIGFib3J0Lic7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybShtZXNzYWdlKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBcInVzZXJBYm9ydFwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0XHR3YXJuZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChwa2V5KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlU3FsID0gcXVlcnlHZW5lcmF0b3IudXBkYXRlUGtleSh0YWJsZSwgcGtleSwgaWQsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFxuXHRcdFx0XHRcdFx0XHRcdFx0cXVlcmllcy5wdXNoKHVwZGF0ZVNxbCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciB1cGRhdGVTcWwgPSBxdWVyeUdlbmVyYXRvci51cGRhdGUodGFibGUsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0RGF0YSgpLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRxdWVyaWVzLnB1c2godXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRxdWVyeVN0YXRlLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdFx0XHRcdFx0XHQkcm93OiAkcm93LFxuXHRcdFx0XHRcdFx0XHRcdFx0dGFibGU6IHRhYmxlLFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGI6IGRiTmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdHBrZXk6IHBrZXksXG5cdFx0XHRcdFx0XHRcdFx0XHRpZDogaWRcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0dmFyIGRiID0gbmV3IGFwaS5kYigkcXVlcnlSZXN1bHRzLmRhdGEoJ2RiJykpO1xuXHRcdFx0XHRcdFx0XHRkYiAgLnF1ZXJ5KHF1ZXJpZXMuam9pbignOyAnKSlcblx0XHRcdFx0XHRcdFx0ICAgIC5jYXRjaChmdW5jdGlvbihyKSB7IHJldHVybiByOyB9KSAvLyBnb2luZyB0byBwcm9jZXNzIGFueXdheVxuXHRcdFx0XHRcdFx0XHQgICAgLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdFx0XHRcdGZvciAodmFyIGkgaW4gcXVlcnlTdGF0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHN0YXRlID0gcXVlcnlTdGF0ZVtpXTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXN1bHQgPSByLnF1ZXJpZXNbaV07XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgJHJvdyA9IHN0YXRlLiRyb3c7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcm93ID0gc3RhdGUucm93O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVzdWx0LmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gc2F2ZSByb3cgd2l0aCBzdGF0ZTogJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHN0YXRlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1F1ZXJ5IGFuZCByZXN1bHQ6Jyk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFsZXJ0KCdGYWlsZWQgdG8gc2F2ZSByb3c6ICcrcmVzdWx0LmVycm9yKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmICghJHJvdy5kYXRhKCdwa2V5JykpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZURpc3BsYXlSb3dzQnlDcml0ZXJpYShcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQkcXVlcnlSZXN1bHRzLCByb3cuZ2V0RGF0YSgpLCByb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXJrUm93U2F2ZWQoJHJvdyk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndGguc3RhdHVzJykuaHRtbCgnJyk7XG5cdFx0XHRcdFx0XHRcdCAgICB9KTtcblx0XHRcdFx0XHRcdCAgICB9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gT25seSBvbmUgXG5cdFx0XHRcdFx0XHQkb3ZlcmFsbFN0YXR1cy5odG1sKCcnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHR2YXIgdXBkYXRlQnV0dG9uID0gZnVuY3Rpb24oKSB7XHRcblx0XHQgICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuXHRcdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHRpbWVvdXQpXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblx0XHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcXVlcnkgPSAkcXVlcnlJbnB1dC52YWwoKTtcblx0XHRcdFx0cXVlcnkgPSBxdWVyeS5yZXBsYWNlKC8tLS4qJC9tZywgJycpOyBcblx0XHRcdFx0cXVlcnkgPSBxdWVyeS5yZXBsYWNlKC9eXFxzKy8sICcnKTtcblx0XHRcdFx0cXVlcnkgPSBxdWVyeS5yZXBsYWNlKC9cXHMrJC8sICcnKTtcblx0XHRcdFx0cGFydHMgPSBxdWVyeS5zcGxpdCgnICcpO1xuXHRcdFx0XHR2ZXJiID0gcGFydHNbMF0udG9VcHBlckNhc2UoKTtcblx0XG5cdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3JlZnJlc2gnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYnRuLXByaW1hcnknKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYnRuLWRhbmdlcicpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdidG4tc3VjY2VzcycpO1xuXG5cdFx0XHRcdGlmIChxdWVyeSA9PSBcIlwiKSB7XG5cdFx0XHRcdFx0JGJ1dHRvbi5hZGRDbGFzcygnYnRuLXByaW1hcnknKTtcblx0XHRcdFx0XHQkYnV0dG9uLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCRidXR0b24ucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG5cdFx0XHRcdGlmICh2ZXJiID09IFwiVVBEQVRFXCIgfHwgdmVyYiA9PSBcIkRFTEVURVwiIHx8IHZlcmIgPT0gXCJDUkVBVEVcIlxuXHRcdFx0XHQgICAgfHwgdmVyYiA9PSBcIklOU0VSVFwiIHx8IHZlcmIgPT0gXCJUUlVOQ0FURVwiKSB7XG5cdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0Lmh0bWwoJ0V4ZWN1dGUnKVxuXHRcdFx0XHRcdFx0LmFkZENsYXNzKCdidG4tZGFuZ2VyJyk7XG5cblx0XHRcdFx0fSBlbHNlIGlmICgkcXVlcnlJbnB1dC5kYXRhKCdjdXJyZW50cXVlcnknKSA9PSBxdWVyeSkge1xuXHRcdFx0XHRcdCRidXR0b24ucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG5cdFx0XHRcdFx0JGJ1dHRvbi5hZGRDbGFzcygnYnRuLXByaW1hcnknKTtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdyZWZyZXNoJyk7XG5cdFx0XHRcdFx0JGJ1dHRvbi5odG1sKCdSZWZyZXNoJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHZhbGlkYXRlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdGlmICh2ZXJiID09IFwiU0VMRUNUXCIgfHwgdmVyYiA9PSBcIlNIT1dcIilcblx0XHRcdFx0XHRcdHZhbGlkYXRlZCA9IHRydWU7XG5cblx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHQuaHRtbCgnUXVlcnknKVxuXHRcdFx0XHRcdFx0LmFkZENsYXNzKHZhbGlkYXRlZD8gJ2J0bi1zdWNjZXNzJyA6ICdidG4tcHJpbWFyeScpO1xuXHRcdFx0XG5cdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH0sIDUwMCk7XG5cdFx0ICAgIH07XG5cdFx0fSgpO1x0XG5cdFxuXHR9XG5cdCQoJy5sb2FkaW5nLWluZGljYXRvcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbn1cbiIsIi8qKiBBc3NlcnRpb25zICAqKi9cblxudmFyIGFzc2VydCA9IGZ1bmN0aW9uKHN0YXRlbWVudCwgbWVzc2FnZSlcbntcbiAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgXCJDb25kaXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsXCI7XG4gICAgICAgIGlmIChzdGF0ZW1lbnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICh3aW5kb3cuY29uc29sZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXNzZXJ0aW9uIGZhaWxlZFwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhc3NlcnQuZGVidWcpXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG5cbiAgICAgICAgaWYgKGFzc2VydC5wcm9kdWN0aW9uKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB0aHJvdyBuZXcgXCJBc3NlcnRpb24gZmFpbGVkOiBcIittZXNzYWdlO1xufVxuYXNzZXJ0LmRlYnVnID0gZmFsc2U7XG5hc3NlcnQucHJvZHVjdGlvbiA9IGZhbHNlO1xuXG5leHBvcnRzID0gYXNzZXJ0O1xuIiwicmVxdWlyZSgnLi9hcHAuanMnKTtcbiIsIi8qKiBBc3NlcnRpb25zICAqKi9cblxuLy8gUXVlcnkgZ2VuZXJhdGlvblxudmFyIHF1ZXJ5R2VuZXJhdG9yID0ge1xuXHR1cGRhdGVQa2V5OiBmdW5jdGlvbih0YWJsZSwgcGtleSwgaWQsIGRhdGEpXG5cdHtcblx0XHR2YXIgY3JpdGVyaWEgPSB7fTtcblx0XHRjcml0ZXJpYVtwa2V5XSA9IGlkO1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh0YWJsZSwgY3JpdGVyaWEsIGRhdGEpO1xuXHR9LFxuXG5cdHVwZGF0ZTogZnVuY3Rpb24odGFibGUsIGNyaXRlcmlhLCBkYXRhKVxuXHR7XG5cdFx0dmFyIHNxbCA9IFwiVVBEQVRFIGBcIit0YWJsZStcImAgXFxuU0VUIFxcblwiO1xuXHRcdHZhciBwYXJ0cyA9IFtdO1xuXHRcdGZvciAodmFyIGtleSBpbiBkYXRhKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBkYXRhW2tleV07XG5cdFx0XHRwYXJ0cy5wdXNoKCcgIGAnK2tleSsnYCA9IFwiJysodmFsdWUrXCJcIikucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInKTtcblx0XHR9XG5cblx0XHRzcWwgKz0gcGFydHMuam9pbihcIiwgXFxuXCIpK1wiIFxcblwiO1xuXHRcdHNxbCArPSBcIldIRVJFIFxcblwiO1xuXHRcdHBhcnRzID0gW107XG5cdFx0Zm9yICh2YXIga2V5IGluIGNyaXRlcmlhKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBjcml0ZXJpYVtrZXldO1xuXHRcdFx0cGFydHMucHVzaCgnICBgJytrZXkrJ2AgPSBcIicrKHZhbHVlK1wiXCIpLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJyk7XG5cdFx0fVxuXHRcdHNxbCArPSBwYXJ0cy5qb2luKFwiIFxcbiAgQU5EIFwiKStcIiBcXG5cIjtcblx0XHRyZXR1cm4gc3FsO1xuXHR9LFxuXG5cdHNlbGVjdDogZnVuY3Rpb24odGFibGUsIHNlbGVjdGlvbiwgY3JpdGVyaWEsIG9yZGVyLCBwYWdlKVxuXHR7XG5cdFx0dmFyIHNxbCA9IFwiU0VMRUNUIFwiO1xuXG5cdFx0aWYgKHNlbGVjdGlvbikge1xuXHRcdFx0dmFyIGdyb29tZWRTZWxlY3Rpb24gPSBbXTtcblx0XHRcdGZvciAodmFyIGkgaW4gc2VsZWN0aW9uKSB7XG5cdFx0XHRcdHZhciBpdGVtID0gc2VsZWN0aW9uW2ldO1xuXG5cdFx0XHRcdGlmIChpdGVtLm1hdGNoKC9eW0EtWmEtejAtOV0rJC8pKSB7XG5cdFx0XHRcdFx0aXRlbSA9ICdgJytpdGVtKydgJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGdyb29tZWRTZWxlY3Rpb24ucHVzaChpdGVtKTtcblx0XHRcdH1cblx0XHRcblx0XHRcdHNlbGVjdGlvbiA9IGdyb29tZWRTZWxlY3Rpb247XG5cdFx0fVxuXG5cdFx0aWYgKCFzZWxlY3Rpb24gfHwgc2VsZWN0aW9uLmxlbmd0aCA9PSAwKVxuXHRcdFx0c3FsICs9ICcqICc7XG5cdFx0ZWxzZSBpZiAoc2VsZWN0aW9uLmxlbmd0aCA9PSAxKVxuXHRcdFx0c3FsICs9IHNlbGVjdGlvblswXStcIiBcIjtcblx0XHRlbHNlXG5cdFx0XHRzcWwgKz0gXCJcXG4gIFwiK3NlbGVjdGlvbi5qb2luKFwiLCBcXG4gIFwiKStcIiBcXG5cIjtcblxuXHRcdGlmICghdGFibGUgJiYgY3JpdGVyaWEpIHtcblx0XHRcdHRocm93IFwiTXVzdCBzcGVjaWZ5IGEgdGFibGUgaWYgY3JpdGVyaWEgaXMgc3BlY2lmaWVkXCI7XG5cdFx0fVxuXG5cdFx0aWYgKHRhYmxlKSB7XG5cdFx0XHRpZiAoIXNlbGVjdGlvbiB8fCBzZWxlY3Rpb24ubGVuZ3RoIDw9IDEpXG5cdFx0XHRcdHNxbCArPSBcIkZST00gYFwiK3RhYmxlK1wiYCBcXG5cIjtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c3FsICs9IFwiRlJPTVxcbiAgYFwiK3RhYmxlK1wiYCBcXG5cIjtcblx0XHR9XG5cblx0XHRpZiAoY3JpdGVyaWEpIHtcblx0XHRcdHNxbCArPSBcIldIRVJFIFwiO1xuXHRcdFx0dmFyIHBhcnRzID0gW107XG5cdFx0XHRmb3IgKHZhciBmaWVsZCBpbiBjcml0ZXJpYSkge1xuXHRcdFx0XHRwYXJ0cy5wdXNoKCcgIGAnK2ZpZWxkKydgID0gXCInKyhjcml0ZXJpYVtmaWVsZF0rXCJcIikucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHBhcnRzLmxlbmd0aCA9PSAxKVxuXHRcdFx0XHRzcWwgKz0gcGFydHNbMF0rXCIgXFxuXCI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHNxbCArPSBcIiBcXG5cIitwYXJ0cy5qb2luKFwiIEFORCBcXG5cIikrXCIgXFxuXCI7XG5cdFx0fVxuXG5cdFx0aWYgKG9yZGVyKSB7XG5cdFx0XHRzcWwgKz0gXCJPUkRFUiBCWSBcIjtcblx0XHRcdHZhciBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgZmllbGQgaW4gb3JkZXIpIHtcblx0XHRcdFx0cGFydHMucHVzaCgnYCcrZmllbGQrJ2AgJysob3JkZXJbZmllbGRdLnRvTG93ZXJDYXNlKCkgPT0gXCJhc2NcIiA/IFwiQVNDXCIgOiBcIkRFU0NcIikpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAocGFydHMubGVuZ3RoID09IDEpXG5cdFx0XHRcdHNxbCArPSBwYXJ0c1swXStcIiBcXG5cIjtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c3FsICs9IFwiIFxcblwiK3BhcnRzLmpvaW4oXCIsIFxcblwiKStcIiBcXG5cIjtcblx0XHR9XG5cblx0XHRpZiAocGFnZSkge1xuXHRcdFx0c3FsICs9IFwiTElNSVQgXCIrcGFnZS5saW1pdDtcblxuXHRcdFx0aWYgKHBhZ2Uub2Zmc2V0KVxuXHRcdFx0XHRzcWwgKz0gXCIgT0ZGU0VUIFwiK3BhZ2Uub2Zmc2V0O1x0XG5cdFx0fVxuXHRcdHJldHVybiBzcWwucmVwbGFjZSgvXlxcbnxcXG4kL21nLCBcIlwiKStcIiBcXG5cIjtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBxdWVyeUdlbmVyYXRvcjtcbiJdfQ==

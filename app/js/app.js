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
	
	var scrollbarWidth = -1;
	
	function getScrollbarWidth() {
		if (scrollbarWidth >= 0)
			return scrollbarWidth;
		
		var outer = document.createElement("div");
		outer.style.visibility = "hidden";
		outer.style.width = "100px";
		outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

		document.body.appendChild(outer);

		var widthNoScroll = outer.offsetWidth;
		// force scrollbars
		outer.style.overflow = "scroll";

		// add innerdiv
		var inner = document.createElement("div");
		inner.style.width = "100%";
		outer.appendChild(inner);        

		var widthWithScroll = inner.offsetWidth;

		// remove divs
		outer.parentNode.removeChild(outer);

		return scrollbarWidth = (widthNoScroll - widthWithScroll);
	}
	
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

	setTimeout(function() {
		var width = getScrollbarWidth();
		$('core-scroll-header-panel::shadow #headerContainer').css('margin-right', width+'px');
		$('.top-bar').css('margin-right', width+'px');
	}, 100);

	updateHeroHeader(true);

	var $coreScrollHeaderPanel = $( 'core-scroll-header-panel' );
	$coreScrollHeaderPanel.shadow('#headerContainer').on( 'wheel', function (e) {
		if ($(e.target).closest('.hero-cards').length > 0) {
			return;
		}
		
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
 
	$('body').on('click', '.navigate', function(e) {
		var href = $(this).attr('data-href');
		loadPage(href);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvYXBpLmpzIiwiL2hvbWUvbGlhbS9DcmVhdGl2ZS9Db2RlL1dlYi9zZXF1ZWxkYXNoL2pzL2FwcC5qcyIsIi9ob21lL2xpYW0vQ3JlYXRpdmUvQ29kZS9XZWIvc2VxdWVsZGFzaC9qcy9hc3NlcnQuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvZW50cnkuanMiLCIvaG9tZS9saWFtL0NyZWF0aXZlL0NvZGUvV2ViL3NlcXVlbGRhc2gvanMvcXVlcnlHZW5lcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMXJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxudmFyIGFwaSA9IHtcblx0ZGI6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24oc3FsLCBwYXJhbXMpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0XHQvLyBGSVhNRSBwYXRoaW5nIChwdXQgYSBmdWNrZW4gPGJhc2U+IG9uIHRoYXIpXG5cdFx0XHRcdCQucG9zdCgnL3NlcXVlbGRhc2gvYXBwL2Ricy8nK25hbWUrJy9xdWVyeScsIHtcblx0XHRcdFx0XHRxdWVyeTogc3FsLFxuXHRcdFx0XHRcdGFqYXg6IDFcblx0XHRcdFx0fSwgZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdGlmICghci5lcnJvcilcblx0XHRcdFx0XHRcdHJlc29sdmUocik7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cmVqZWN0KHIpO1xuXG5cdFx0XHRcdH0sICdqc29uJykuZmFpbChmdW5jdGlvbih4aHIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcInhociBlcnJvclwiKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyh4aHIpO1xuXHRcdFx0XHRcdHJlamVjdCh7ZXJyb3I6IFwiWEhSIGVycm9yXCIsIHF1ZXJ5OiB7fX0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cdH1cbn07XG5cbndpbmRvdy5hcGkgPSBhcGk7XG5tb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiIsIi8qKiBBc3NlcnRpb25zICAqKi9cblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4vYXNzZXJ0LmpzJyk7XG52YXIgYXBpID0gcmVxdWlyZSgnLi9hcGkuanMnKTtcbnZhciBxdWVyeUdlbmVyYXRvciA9IHJlcXVpcmUoJy4vcXVlcnlHZW5lcmF0b3IuanMnKTtcbndpbmRvdy5xdWVyeUdlbmVyYXRvciA9IHF1ZXJ5R2VuZXJhdG9yO1xuXG4vKiogVUkgKiovXG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb2x5bWVyLXJlYWR5JywgZnVuY3Rpb24oKSB7XG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdHNlcXVlbGRhc2hJbml0KCk7XG5cdH0pO1xufSk7XG5cbndpbmRvdy5zZXF1ZWxkYXNoID0ge1xufTtcblxuZnVuY3Rpb24gc2VxdWVsZGFzaEluaXQoKSB7XG5cdCQoJy5sb2FkaW5nLWluZGljYXRvcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuXHQvLyBJbml0aWFsaXplIEFuZ3VsYXJcblx0YW5ndWxhci5tb2R1bGUoJ3NlcXVlbGRhc2gnLCBbXSk7XG5cdGFuZ3VsYXIuYm9vdHN0cmFwKGRvY3VtZW50LCBbJ3NlcXVlbGRhc2gnXSk7XG5cdFxuXHR2YXIgc2Nyb2xsYmFyV2lkdGggPSAtMTtcblx0XG5cdGZ1bmN0aW9uIGdldFNjcm9sbGJhcldpZHRoKCkge1xuXHRcdGlmIChzY3JvbGxiYXJXaWR0aCA+PSAwKVxuXHRcdFx0cmV0dXJuIHNjcm9sbGJhcldpZHRoO1xuXHRcdFxuXHRcdHZhciBvdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0b3V0ZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG5cdFx0b3V0ZXIuc3R5bGUud2lkdGggPSBcIjEwMHB4XCI7XG5cdFx0b3V0ZXIuc3R5bGUubXNPdmVyZmxvd1N0eWxlID0gXCJzY3JvbGxiYXJcIjsgLy8gbmVlZGVkIGZvciBXaW5KUyBhcHBzXG5cblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG91dGVyKTtcblxuXHRcdHZhciB3aWR0aE5vU2Nyb2xsID0gb3V0ZXIub2Zmc2V0V2lkdGg7XG5cdFx0Ly8gZm9yY2Ugc2Nyb2xsYmFyc1xuXHRcdG91dGVyLnN0eWxlLm92ZXJmbG93ID0gXCJzY3JvbGxcIjtcblxuXHRcdC8vIGFkZCBpbm5lcmRpdlxuXHRcdHZhciBpbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0aW5uZXIuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcblx0XHRvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7ICAgICAgICBcblxuXHRcdHZhciB3aWR0aFdpdGhTY3JvbGwgPSBpbm5lci5vZmZzZXRXaWR0aDtcblxuXHRcdC8vIHJlbW92ZSBkaXZzXG5cdFx0b3V0ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChvdXRlcik7XG5cblx0XHRyZXR1cm4gc2Nyb2xsYmFyV2lkdGggPSAod2lkdGhOb1Njcm9sbCAtIHdpZHRoV2l0aFNjcm9sbCk7XG5cdH1cblx0XG5cdGZ1bmN0aW9uIHVwZGF0ZUhlcm9IZWFkZXIoZmlyc3RQYWdlKVxuXHR7XG5cblx0XHRpZiAoJCgnLmNvbnRlbnQtY29udGFpbmVyIC5oZXJvLWNvbnRlbnQnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHQkKCdjb3JlLXRvb2xiYXIgLm1pZGRsZScpLmh0bWwoJCgnLmNvbnRlbnQtY29udGFpbmVyIC5oZXJvLWNvbnRlbnQnKS5jaGlsZHJlbigpKTtcblx0XHRcdCQoJ2NvcmUtdG9vbGJhcicpLmFkZENsYXNzKCdoZXJvJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJ2NvcmUtdG9vbGJhcicpLnJlbW92ZUNsYXNzKCdoZXJvJyk7XG5cdFx0fVxuXG5cdFx0JCgnY29yZS10b29sYmFyIC5taWRkbGUnKS5oaWRlKCk7XG5cdFx0JCgnLmNvbnRlbnQtY29udGFpbmVyIC5oZXJvLWNvbnRlbnQnKS5yZW1vdmUoKTtcblxuXHRcdHZhciBzaXplID0gMTMxO1xuXHRcdHZhciBkdXJhdGlvbiA9IDEwMDA7XG5cdFx0dmFyIGhpZGVCYXIgPSB0cnVlO1xuXHRcdHZhciBjb250YWluZXIgPSAkKCdjb3JlLXNjcm9sbC1oZWFkZXItcGFuZWw6OnNoYWRvdyAjbWFpbkNvbnRhaW5lcicpLmdldCgwKTtcblxuXHRcdGlmICgkKCdjb3JlLXRvb2xiYXInKS5oYXNDbGFzcygnaGVybycpKSB7XG5cdFx0XHRzaXplID0gMzQxO1xuXHRcdFx0aGlkZUJhciA9IGZhbHNlO1xuXHRcdFx0ZHVyYXRpb24gPSAzMDAwO1xuXHRcdH1cblx0XHRcblxuXHRcdGlmIChjb250YWluZXIpIHtcblx0XHRcdCQoY29udGFpbmVyKS5jc3MoJ3BhZGRpbmctdG9wJywgJCgnY29yZS10b29sYmFyJykuaGVpZ2h0KCkpO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRcdCQoJ2NvcmUtc2Nyb2xsLWhlYWRlci1wYW5lbCcpLmdldCgwKS5hc3luYygnbWVhc3VyZUhlYWRlckhlaWdodCcpO1xuXG5cdFx0XHRcdGlmICghaGlkZUJhciB8fCAhZmlyc3RQYWdlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ25vdCBoaWRlLCBzY3JvbGxpbmcgZG93biBpbW1lZGlhdGVseScpO1xuXHRcdFx0XHRcdCQoY29udGFpbmVyKS5zY3JvbGxUb3Aoc2l6ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zb2xlLmxvZygncmVtZWFzdXJlJyk7XG5cdFx0XHRcdCQoJ2NvcmUtdG9vbGJhciAubWlkZGxlJykuc2hvdygpO1xuXHRcdFx0XHQvLyBNYWtlIHRoZSBoZWFkZXIgcHJldHR5XG5cdFx0XHRcdGlmICghaGlkZUJhcikge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKGNvbnRhaW5lcikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAwfSwge2R1cmF0aW9uOmR1cmF0aW9ufSk7XG5cdFx0XHRcdFx0fSwgNTAwKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKGZpcnN0UGFnZSkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKGNvbnRhaW5lcikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiBzaXplfSwge2R1cmF0aW9uOmR1cmF0aW9ufSk7XG5cdFx0XHRcdFx0fSwgMjUwKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgNTAwKTtcblx0XHR9XG5cdH1cblxuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdHZhciB3aWR0aCA9IGdldFNjcm9sbGJhcldpZHRoKCk7XG5cdFx0JCgnY29yZS1zY3JvbGwtaGVhZGVyLXBhbmVsOjpzaGFkb3cgI2hlYWRlckNvbnRhaW5lcicpLmNzcygnbWFyZ2luLXJpZ2h0Jywgd2lkdGgrJ3B4Jyk7XG5cdFx0JCgnLnRvcC1iYXInKS5jc3MoJ21hcmdpbi1yaWdodCcsIHdpZHRoKydweCcpO1xuXHR9LCAxMDApO1xuXG5cdHVwZGF0ZUhlcm9IZWFkZXIodHJ1ZSk7XG5cblx0dmFyICRjb3JlU2Nyb2xsSGVhZGVyUGFuZWwgPSAkKCAnY29yZS1zY3JvbGwtaGVhZGVyLXBhbmVsJyApO1xuXHQkY29yZVNjcm9sbEhlYWRlclBhbmVsLnNoYWRvdygnI2hlYWRlckNvbnRhaW5lcicpLm9uKCAnd2hlZWwnLCBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICgkKGUudGFyZ2V0KS5jbG9zZXN0KCcuaGVyby1jYXJkcycpLmxlbmd0aCA+IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0XG5cdFx0dmFyICRtYWluQ29udGFpbmVyID0gJGNvcmVTY3JvbGxIZWFkZXJQYW5lbC5zaGFkb3coJyNtYWluQ29udGFpbmVyJyk7XG5cdFx0dmFyIHZhbCA9ICRtYWluQ29udGFpbmVyLnNjcm9sbFRvcCgpICsgZS5vcmlnaW5hbEV2ZW50LmRlbHRhWTtcblx0XHRjb25zb2xlLmxvZyh2YWwgKyBcIiAvIFwiICsgZS5vZmZzZXRZKTtcblx0XHQkbWFpbkNvbnRhaW5lci5zY3JvbGxUb3AodmFsKTtcblx0fSk7XG5cblx0Ly8gTWFrZSBzdXJlIHdlIGhhdmUgYSBzdGF0ZVxuXHRpZiAoIXdpbmRvdy4kc3RhdGUpIHtcblx0XHRjb25zb2xlLmxvZygnRXJyb3I6IE5vIHN0YXRlIHByb3ZpZGVkLicpO1xuXHRcdGFsZXJ0KCdBbiBhcHBsaWNhdGlvbiBlcnJvciBoYXMgb2NjdXJyZWQ6IE5vIHN0YXRlIHByb3ZpZGVkJyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdFxuXG5cdC8vIEFwcGx5IGl0XG5cdHZhciAkc2NvcGUgPSAkKCdodG1sJykuc2NvcGUoKTtcblx0Zm9yICh2YXIga2V5IGluICRzdGF0ZSkge1xuXHRcdCRzY29wZVtrZXldID0gJHN0YXRlW2tleV07XG5cdH1cblx0JHNjb3BlLnN0YXJ0dXAgPSBmYWxzZTtcblx0JHNjb3BlLiRhcHBseSgpO1xuXG5cdCQoZG9jdW1lbnQpLnRyaWdnZXIoJ2FwcC1yZWFkeScpO1xuXG5cdC8vIEluc3RhbGwgY3VzdG9tIGJlaGF2aW9yc1xuXG5cdHZhciAkdGVtcGxhdGVDYWNoZSA9IHt9O1xuXHR2YXIgJHVybFRvVGVtcGxhdGUgPSB7fTtcblxuXHQvKipcblx0ICogUXVpY2sgbW9kZSwgc3RvcmUgdGhlIHRlbXBsYXRlIHdlIG5lZWQgZm9yIHRoYXQgcGFnZSBmb3IgbGF0ZXIgcmV0dXJuXG5cdCAqL1xuXHQkKHdpbmRvdykub24oJ3BvcHN0YXRlJywgZnVuY3Rpb24oZSkge1xuXHRcdHZhciB1cmwgPSBkb2N1bWVudC5sb2NhdGlvbitcIlwiO1xuXHRcdHZhciAkc2NvcGUgPSAkKCdodG1sJykuc2NvcGUoKTtcblx0XHR2YXIgZGF0YSA9IGUuc3RhdGU7XG5cblx0XHRjb25zb2xlLmxvZyhcImdvaW46IFwiK3VybCk7XG5cdFx0bG9hZFBhZ2UodXJsKTtcblx0XHQvL2FwcGx5UGFnZSgkc2NvcGUsIGRhdGEubW9kZWwpO1xuXHRcdC8vZGF0YS4kdGVtcGxhdGUoJHNjb3BlKTtcblx0fSk7XG5cblx0JCgnYm9keScpLm9uKCdjbGljaycsICdhJywgZnVuY3Rpb24oZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR2YXIgJGEgPSAkKGUuY3VycmVudFRhcmdldCk7XG5cdFx0dmFyIHVybCA9ICRhLmF0dHIoJ2hyZWYnKTtcblxuXHRcdGxvYWRQYWdlKHVybCk7XG5cdH0pO1xuIFxuXHQkKCdib2R5Jykub24oJ2NsaWNrJywgJy5uYXZpZ2F0ZScsIGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgaHJlZiA9ICQodGhpcykuYXR0cignZGF0YS1ocmVmJyk7XG5cdFx0bG9hZFBhZ2UoaHJlZik7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGFwcGx5UGFnZSgkc2NvcGUsICRtb2RlbCwgY29udGVudClcblx0e1xuXHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oJHNjb3BlKSB7IFxuXHRcdFx0Zm9yICh2YXIga2V5IGluIHdpbmRvdy4kc3RhdGUpIFxuXHRcdFx0XHRkZWxldGUgJHNjb3BlW2tleV07XG5cdFx0XHRcblx0XHRcdGZvciAodmFyIGtleSBpbiAkbW9kZWwpIFxuXHRcdFx0XHQkc2NvcGVba2V5XSA9ICRtb2RlbFtrZXldO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHZhciAkaW5qZWN0b3IgPSBhbmd1bGFyLmluamVjdG9yKFsnbmcnXSk7XG5cdFx0dmFyICRjb21waWxlU3RhdGUgPSBudWxsO1xuXHRcdCRpbmplY3Rvci5pbnZva2UoZnVuY3Rpb24oJGNvbXBpbGUpIHtcblxuXHRcdFx0dmFyICRkb20gPSAkKCc8dGVtcGxhdGU+Jytjb250ZW50Kyc8L3RlbXBsYXRlPicpO1xuXHRcdFx0dmFyIHRlbXBsYXRlTmFtZSA9ICRkb20uZ2V0KDApLmNvbnRlbnQucXVlcnlTZWxlY3RvcihcImRpdi5tZXRhLnRlbXBsYXRlLW5hbWVcIik7XG5cdFx0XHRpZiAodGVtcGxhdGVOYW1lKVxuXHRcdFx0XHR0ZW1wbGF0ZU5hbWUgPSB0ZW1wbGF0ZU5hbWUuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRlbXBsYXRlTmFtZSA9IG51bGw7XG5cblx0XHRcdCRkb20ucmVtb3ZlKCk7XG5cblx0XHRcdHZhciAkdGVtcGxhdGUgPSBudWxsO1xuXHRcdFx0dmFyIGNhY2hlZCA9IG51bGw7XG5cdFx0XHRcblx0XHRcdGlmICh0ZW1wbGF0ZU5hbWUpXG5cdFx0XHRcdGNhY2hlZCA9ICR0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV07XG5cblx0XHRcdC8vIEl0IGFwcGVhcnMgdGhhdCB0aGVyZSdzIG5vIGZ1Y2tpbmcgd2F5IHRvIG1ha2UgdGhpcyB0ZW1wbGF0ZSBjYWNoaW5nXG5cdFx0XHQvLyB3b3JrIGNvcnJlY3RseSwgYmVjYXVzZSB0aGUgc2Vjb25kIHBhZ2UgbG9hZCBvZiBhIHRlbXBsYXRlIChpZSBcblx0XHRcdC8vIHdoZW4gdGhlIHRlbXBsYXRlIGlzIGFscmVhZHkgY2FjaGVkKSwgdGhlIHJlc3VsdCB3aWxsIGhhdmUgdGhlIE9MRFxuXHRcdFx0Ly8gdGVtcGxhdGUgZGF0YSBhbmQgdGhlcmUgaXMgbm8gd2F5IHRvIGNoYW5nZSB0aGlzIGV2ZXIgYWdhaW4uXG5cdFx0XHRcblx0XHRcdGlmIChmYWxzZSAmJiBjYWNoZWQpIHtcblx0XHRcdFx0JHRlbXBsYXRlID0gY2FjaGVkO1x0XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkdGVtcGxhdGUgPSAkY29tcGlsZShjb250ZW50KTtcblx0XHRcdFx0JHRlbXBsYXRlQ2FjaGVbdGVtcGxhdGVOYW1lXSA9ICR0ZW1wbGF0ZTtcdFx0XHRcdFxuXHRcdFx0fVxuXG5cdFx0XHQkKCcuY29udGVudC1jb250YWluZXInKS5odG1sKCc8ZGl2PjwvZGl2PicpO1xuXHRcdFx0JCgnLmNvbnRlbnQtY29udGFpbmVyJykuZmluZCgnZGl2JykuaHRtbCgnJyk7XG5cdFx0XHQkKCcuY29udGVudC1jb250YWluZXInKS5maW5kKCdkaXYnKS5yZXBsYWNlV2l0aCgkdGVtcGxhdGUoJHNjb3BlKSk7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cblx0XHRcdCRjb21waWxlU3RhdGUgPSB7XG5cdFx0XHRcdHRlbXBsYXRlOiAkdGVtcGxhdGUsIFxuXHRcdFx0XHRzdGF0ZTogJG1vZGVsXG5cdFx0XHR9O1xuXHRcdFx0JCgnLmxvYWRpbmctaW5kaWNhdG9yJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuICRjb21waWxlU3RhdGU7XG5cdH1cblxuXHR2YXIgdmlld1N0YWNrU3RhdGUgPSB7fTtcblxuXHRmdW5jdGlvbiBsb2FkUGFnZSh1cmwpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0JCgnLmxvYWRpbmctaW5kaWNhdG9yJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdCQucG9zdCh1cmwsIHtcblx0XHRcdGlubGluZTogMVxuXHRcdH0sIGZ1bmN0aW9uKHIpIHtcblx0XHRcdHZhciAkbW9kZWwgPSBKU09OLnBhcnNlKHIubW9kZWwpO1xuXHRcdFx0dmFyICRzY29wZSA9ICQoJ2h0bWwnKS5zY29wZSgpO1xuXHRcdFx0aWYgKCRzY29wZSkge1xuXHRcdFx0XHR2YXIgJGNvbXBpbGVTdGF0ZSA9IGFwcGx5UGFnZSgkc2NvcGUsICRtb2RlbCwgci5jb250ZW50KTtcblx0XHRcdFx0JCgnY29yZS10b29sYmFyIC5taWRkbGUnKS5odG1sKCcnKTtcblx0XHRcdFx0dXBkYXRlSGVyb0hlYWRlcigpO1x0XG5cblx0XHRcdFx0d2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBcIkFub3RoZXJcIiwgdXJsKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdH0sICdqc29uJykuZXJyb3IoZnVuY3Rpb24oZSkge1xuXHRcdFx0YWxlcnQoJ0Vycm9yOiAnK2UpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQkKCdpbnB1dFt0eXBlPXRleHRdLmZpbHRlcicpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0dmFyICRmaWx0ZXIgPSAkKHRoaXMpO1xuXHRcdHZhciAkbmdBcHAgPSAkKCdbbmctYXBwXScpO1xuXHRcdHZhciAkc2NvcGUgPSAkbmdBcHAuc2NvcGUoKTtcblx0XHR2YXIgcHJvcGVydHkgPSAkZmlsdGVyLmRhdGEoJ2ZpbHRlcicpO1xuXG5cdFx0aWYgKCEkc2NvcGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdmYWlsZWQgdG8gZmluZCBhbmd1bGFyIHNjb3BlIGZvciBmaWx0ZXInKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgZGF0YSA9ICRzY29wZS4kZXZhbChwcm9wZXJ0eSk7IFxuXHRcdHZhciBmaWx0ZXJpbmcgPSBmYWxzZTtcblx0XHR2YXIgc3VicHJvcCA9ICRmaWx0ZXIuZGF0YSgndGFyZ2V0Jyk7XHRcblxuXHRcdHZhciBkb0ZpbHRlciA9IGZ1bmN0aW9uKGRhdGEsIGZpbHRlcikge1xuXHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IFtdO1xuXG5cdFx0XHRpZiAoIWZpbHRlcilcblx0XHRcdFx0cmV0dXJuIGRhdGE7XG5cblx0XHRcdGZvciAodmFyIGtleSBpbiBkYXRhKSB7XG5cdFx0XHRcdHZhciByb3cgPSBkYXRhW2tleV07XG5cdFx0XHRcdHZhciB0YXJnZXQgPSByb3c7XG5cdFx0XHRcdGlmIChzdWJwcm9wKVxuXHRcdFx0XHRcdHRhcmdldCA9IHJvd1tzdWJwcm9wXTtcblxuXHRcdFx0XHRpZiAodGFyZ2V0LmluZGV4T2YoZmlsdGVyKSA+PSAwKSBcblx0XHRcdFx0XHRmaWx0ZXJlZERhdGEucHVzaChyb3cpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmlsdGVyZWREYXRhO1xuXHRcdH07XG5cblx0XHQkc2NvcGUuJHdhdGNoKHByb3BlcnR5LCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcblx0XHRcdGlmIChmaWx0ZXJpbmcpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGRhdGEgPSBuZXdWYWx1ZTtcdFxuXHRcdFx0JGZpbHRlci5jaGFuZ2UoKTtcblx0XHR9KTtcblxuXHRcdHZhciB0aW1lb3V0ID0gbnVsbDtcblx0XHQkZmlsdGVyLmtleWRvd24oZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAodGltZW91dClcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkZmlsdGVyLmNoYW5nZSgpO1xuXHRcdFx0fSwgNTAwKTtcblx0XHR9KTtcblxuXHRcdCRmaWx0ZXIuY2hhbmdlKGZ1bmN0aW9uKCkge1xuXHRcdFx0ZmlsdGVyaW5nID0gdHJ1ZTtcblx0XHRcdHZhciBpbm5lclNjb3BlID0gJHNjb3BlO1xuXHRcdFx0dmFyIGNvbXBzID0gcHJvcGVydHkuc3BsaXQoJy4nKTtcblx0XHRcdGZvciAodmFyIGkgaW4gY29tcHMpIHtcblx0XHRcdFx0dmFyIGtleSA9IGNvbXBzW2ldO1xuXHRcdFx0XHRpZiAocGFyc2VJbnQoaSkgKyAxID09IGNvbXBzLmxlbmd0aClcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0aWYgKCFpbm5lclNjb3BlW2tleV0pXG5cdFx0XHRcdFx0aW5uZXJTY29wZVtrZXldID0ge307XG5cblx0XHRcdFx0aW5uZXJTY29wZSA9IGlubmVyU2NvcGVba2V5XTtcblx0XHRcdH1cblxuXHRcdFx0aW5uZXJTY29wZVtjb21wc1tjb21wcy5sZW5ndGggLSAxXV0gPSBkb0ZpbHRlcihkYXRhLCAkZmlsdGVyLnZhbCgpKTtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fSk7XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgdGhlIGRpc3BsYXkgb2YgdGhlIGdpdmVuIGRhdGEgdmFsdWVzIGZvciBhbGwgbWF0Y2hpbmcgcm93cyB3aGljaCBhcmUgbm90IHBlbmRpbmcgXG5cdCAqIGNoYW5nZXMgd2l0aGluIHRoZSBnaXZlbiByZXN1bHQgc2V0LiAgXG5cdCAqIFRoaXMgaXMgdXNlZCB0byBmaXggZGlzcGxheSBvZiByb3dzIHdoaWNoIHdlIGltcGxpY2l0bHkga25vdyBoYXZlIGNoYW5nZWQgc2VydmVyIHNpZGUsIHN1Y2ggYXMgXG5cdCAqIHdoZW4gZG9pbmcgYW4gdXBkYXRlIG9uIGEgdGFibGUgd2l0aG91dCBwcmltYXJ5IGtleXMgd2hlbiB0aGVyZSBhcmUgKG9yIGNvdWxkIGJlKSBtdWx0aXBsZVxuXHQgKiBpZGVudGljYWwgcm93cy5cblx0ICovXHRcblx0ZnVuY3Rpb24gdXBkYXRlRGlzcGxheVJvd3NCeUNyaXRlcmlhKCRxdWVyeVJlc3VsdHMsIGNyaXRlcmlhLCBkYXRhKVxuXHR7XG5cdFx0JHF1ZXJ5UmVzdWx0cy5maW5kKCd0Ym9keSB0cicpLm5vdCgnLnVuc2F2ZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJvdyA9ICQodGhpcykuZXh0cmFjdFJvdygpO1xuXHRcdFx0dmFyIHNraXAgPSBmYWxzZTtcblx0XHRcdGZvciAodmFyIGZpZWxkIGluIGNyaXRlcmlhKSB7XG5cdFx0XHRcdGlmIChjcml0ZXJpYVtmaWVsZF0gIT0gcm93W2ZpZWxkXSkge1xuXHRcdFx0XHRcdHNraXAgPSB0cnVlOyBicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc2tpcClcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHQvLyBNYXRjaGluZyByb3csIHVwZGF0ZVxuXG5cdFx0XHQkKHRoaXMpLmZpbmQoJ3RkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCFkYXRhWyQodGhpcykuZGF0YSgna2V5JyldKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHZhbHVlID0gZGF0YVskKHRoaXMpLmRhdGEoJ2tleScpXTtcblxuXHRcdFx0XHQkKHRoaXMpLnJlbW92ZUNsYXNzKCd1bnNhdmVkJyk7XG5cdFx0XHRcdCQodGhpcykuZGF0YSgndmFsdWUnLCB2YWx1ZSk7XG5cdFx0XHRcdCQodGhpcykuaHRtbCgnPHNwYW4gY2xhc3M9XCJ0cmFpbGVyXCI+PC9zcGFuPicpO1xuXHRcdFx0XHQkKHRoaXMpLmZpbmQoJy50cmFpbGVyJykuYXR0cigndGl0bGUnLCB2YWx1ZSkuaHRtbCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHRcdGZsYXNoUm93KCQodGhpcykpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWFya1Jvd1NhdmVkKCRyb3cpIHtcblx0XHQkcm93LnJlbW92ZUNsYXNzKCd1bnNhdmVkJyk7XG5cdFx0JHJvdy5maW5kKCd0ZC51bnNhdmVkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdCQodGhpcykuZGF0YSgndmFsdWUnLCAkKHRoaXMpLmRhdGEoJ3Byb3Bvc2VkVmFsdWUnKSk7XG5cdFx0fSkucmVtb3ZlQ2xhc3MoJ3Vuc2F2ZWQnKTtcblx0XHRmbGFzaFJvdygkcm93KTtcblxuXHRcdCRyb3cuZmluZCgndGQuc3RhdHVzJykuaHRtbCgnJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmbGFzaFJvdygkcm93KSB7XG5cdFx0JHJvdy5jc3Moe2JhY2tncm91bmRDb2xvcjogJ3JnYmEoMjU1LCAxNjMsIDEwMiwgMSknfSk7XG5cdFx0JHJvdy5hbmltYXRlKHtcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMjU1LCAxNjMsIDEwMiwgMCknXG5cdFx0fSwge1xuXHRcdFx0ZHVyYXRpb246IDQwMDBcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVRdWVyeVVpKCRxdWVyeVVpKSB7XG5cdFx0dmFyICRxdWVyeUlucHV0ID0gJHF1ZXJ5VWkuZmluZCgnLnF1ZXJ5LWlucHV0Jyk7XG5cdFx0dmFyICRxdWVyeUFjZSA9ICRxdWVyeVVpLmZpbmQoJy5xdWVyeS1hY2UnKTtcblxuXHRcdHZhciAkcXVlcnlSZXN1bHRzID0gJHF1ZXJ5VWkuZmluZCgnLnF1ZXJ5LXJlc3VsdHMnKTtcblxuXHRcdCRxdWVyeVVpLmZpbmQoJ3RoLnNlbGVjdEFsbCBpbnB1dCcpLmNoYW5nZShmdW5jdGlvbigpIHtcblx0XHRcdGlmICgkKHRoaXMpLmlzKCc6Y2hlY2tlZCcpKSB7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyJykuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyIHRkLnNlbGVjdCBpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0XHRcdCRxdWVyeVVpLmZpbmQoJ3Rib2R5IHRyIHRkLnNlbGVjdCBpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkcXVlcnlVaS5maW5kKCd0ZC5zZWxlY3QgaW5wdXQnKS5jaGFuZ2UoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5pcygnOmNoZWNrZWQnKSlcblx0XHRcdFx0JCh0aGlzKS5wYXJlbnRzKCd0cjpmaXJzdCcpLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHQkKHRoaXMpLnBhcmVudHMoJ3RyOmZpcnN0JykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cdFx0fSk7XG5cblx0XHQkcXVlcnlVaS5maW5kKCd0ZCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCEkcXVlcnlSZXN1bHRzLmRhdGEoJ3RhYmxlJykpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKCQodGhpcykuaGFzQ2xhc3MoJ3N0YXR1cycpIHx8ICQodGhpcykuaGFzQ2xhc3MoJ3NlbGVjdCcpKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdHZhciB2YWx1ZSA9ICQodGhpcykuZGF0YSgndmFsdWUnKTtcblx0XHRcdFxuXHRcdFx0aWYgKCQodGhpcykuZGF0YSgncHJvcG9zZWRWYWx1ZScpKSB7XG5cdFx0XHRcdHZhbHVlID0gJCh0aGlzKS5kYXRhKCdwcm9wb3NlZFZhbHVlJyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciAkY2VsbCA9ICQodGhpcyk7XG5cdFx0XHQkY2VsbC5odG1sKCc8aW5wdXQgdHlwZT1cInRleHRcIiBzdHlsZT1cIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7XCIgLz4nKTtcblx0XHRcdHZhciAkaW5wdXQgPSAkY2VsbC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0XG5cdFx0XHR2YXIgJGVkaXRpbmdDZWxsID0gJCh0aGlzKTtcblx0XHRcdHZhciAkZWRpdGluZ1JvdyA9ICQodGhpcykucGFyZW50KCk7XG5cblx0XHRcdCRpbnB1dC52YWwodmFsdWUpO1xuXHRcdFx0JGlucHV0LmZvY3VzKCk7XG5cdFx0XHQkaW5wdXQua2V5ZG93bihmdW5jdGlvbihldikge1xuXHRcdFx0XHRpZiAoZXYud2hpY2ggPT0gMjcpIHtcblx0XHRcdFx0XHQkaW5wdXQudmFsKHZhbHVlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChldi53aGljaCA9PSAxMyB8fCBldi53aGljaCA9PSAyNykge1xuXHRcdFx0XHRcdCRpbnB1dC5ibHVyKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cblx0XHRcdCRpbnB1dC5ibHVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkY2VsbC5odG1sKCc8c3BhbiBjbGFzcz1cInRyYWlsZXJcIj48L3NwYW4+Jyk7XG5cdFx0XHRcdCRjZWxsLmZpbmQoJy50cmFpbGVyJykuYXR0cigndGl0bGUnLCAkaW5wdXQudmFsKCkpLmh0bWwoJGlucHV0LnZhbCgpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICgkaW5wdXQudmFsKCkgIT0gdmFsdWUpIHtcblx0XHRcdFx0XHQkZWRpdGluZ1Jvd1xuXHRcdFx0XHRcdCAgICAuYWRkQ2xhc3MoJ3Vuc2F2ZWQnKVxuXHRcdFx0XHRcdCAgICAuZmluZCgndGQuc3RhdHVzJylcblx0XHRcdFx0XHQgICAgLmh0bWwoXG5cdFx0XHRcdFx0XHQnPGJ1dHRvbiBjbGFzcz1cImRvLXNhdmUtcm93IGJ0bi1kYW5nZXJcIiAnK1xuXHRcdFx0XHRcdFx0ICAndHlwZT1cImJ1dHRvblwiPlNhdmU8L2J1dHRvbj4nK1xuXHRcdFx0XHRcdFx0JzxidXR0b24gY2xhc3M9XCJidG4tcHJpbWFyeVwiICcrXG5cdFx0XHRcdFx0XHQgICd0eXBlPVwiYnV0dG9uXCI+UmV2ZXJ0PC9idXR0b24+J1xuXHRcdFx0XHRcdCAgICApXG5cdFx0XHRcdFx0ICAgIC5maW5kKCcuZG8tc2F2ZS1yb3cnKVxuXHRcdFx0XHRcdCAgICAuY2xpY2soZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHZhciBwa2V5ID0gJGVkaXRpbmdSb3cuZGF0YSgncGtleScpO1xuXHRcdFx0XHRcdFx0dmFyIGlkID0gJGVkaXRpbmdSb3cuZGF0YSgnaWQnKTtcblx0XHRcdFx0XHRcdHZhciB0YWJsZSA9ICRxdWVyeVJlc3VsdHMuZGF0YSgndGFibGUnKTtcblx0XHRcdFx0XHRcdHZhciByb3cgPSAkZWRpdGluZ1Jvdy5leHRyYWN0Um93KCk7XG5cdFx0XHRcdFx0XHR2YXIgZGJOYW1lID0gJHF1ZXJ5UmVzdWx0cy5kYXRhKCdkYicpO1xuXHRcdFx0XHRcdFx0dmFyIGRiID0gbmV3IGFwaS5kYihkYk5hbWUpO1xuXG5cdFx0XHRcdFx0XHRpZiAocGtleSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlU3FsID0gcXVlcnlHZW5lcmF0b3IudXBkYXRlUGtleSh0YWJsZSwgcGtleSwgaWQsIFxuXHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XG5cdFx0XHRcdFx0XHRcdGFsZXJ0KCdTYXZlIHJvdyAjJytpZCsnICgnK3BrZXkrJykgIFxcblxcbicrdXBkYXRlU3FsKTtcblxuXHRcdFx0XHRcdFx0XHRkYiAgLnF1ZXJ5KHVwZGF0ZVNxbClcblx0XHRcdFx0XHRcdFx0ICAgIC50aGVuKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIFVJXG5cdFx0XHRcdFx0XHRcdFx0bWFya1Jvd1NhdmVkKCRlZGl0aW5nUm93KTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncXVlcnkgZmFpbGVkOicpO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHIpO1xuXHRcdFx0XHRcdFx0XHRcdGFsZXJ0KCdxdWVyeSBmYWlsZWQnKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pO1x0XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlU3FsID0gcXVlcnlHZW5lcmF0b3IudXBkYXRlKHRhYmxlLCBcblx0XHRcdFx0XHRcdFx0XHRyb3cuZ2V0RGF0YSgpLFxuXHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0dmFyIHNlbGVjdFNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnNlbGVjdChcblx0XHRcdFx0XHRcdFx0XHR0YWJsZSxcblx0XHRcdFx0XHRcdFx0XHRbJ0NPVU5UKCopIGN0J10sXG5cdFx0XHRcdFx0XHRcdFx0cm93LmdldERhdGEoKVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdXBkYXRlQWxsTWF0Y2hlcyA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRcdGRiICAucXVlcnkoc2VsZWN0U3FsKVxuXHRcdFx0XHRcdFx0XHQgICAgLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChyLnF1ZXJ5LmNvdW50IDwgMSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoJ0ludmFsaWQgcmVzdWx0IChzaG91bGQgYmUgMSBjb3VudCByb3cpJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHIucXVlcnkucmVzdWx0c1swXS5jdCA+IDEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZUFsbE1hdGNoZXMgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGNvbmZpcm1lZCA9IGNvbmZpcm0oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdXYXJuaW5nOlxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdUaGlzIGFjdGlvbiB3aWxsIHVwZGF0ZSBtdWx0aXBsZSByb3dzLlxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdSb3dzIGFmZmVjdGVkOiAnK3IucXVlcnkucmVzdWx0c1swXS5jdCtcIlxcblxcblwiK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIk9LIHRvIGNvbnRpbnVlLCBDYW5jZWwgdG8gYWJvcnRcXG5cXG5cIitcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJRdWVyeTpcXG5cXG5cIit1cGRhdGVTcWwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFjb25maXJtZWQpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwidXNlckFib3J0ZWRcIjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pXG5cdFx0XHRcdFx0XHRcdCAgICAudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZGIucXVlcnkodXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChyLmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhbGVydChyLmVycm9yKTtcblx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwicXVlcnlFcnJvclwiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIFVJXG5cdFx0XHRcdFx0XHRcdFx0bWFya1Jvd1NhdmVkKCRlZGl0aW5nUm93KTtcblx0XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHVwZGF0ZUFsbE1hdGNoZXMpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZURpc3BsYXlSb3dzQnlDcml0ZXJpYSgkcXVlcnlSZXN1bHRzLCByb3cuZ2V0RGF0YSgpLCByb3cuZ2V0UHJvcG9zZWQoKSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQgICAgfSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFxuXG5cblx0XHRcdFx0XHQgICAgfSk7XG5cblx0XHRcdFx0XHQkY2VsbFxuXHRcdFx0XHRcdCAgICAuZGF0YSgncHJvcG9zZWRWYWx1ZScsICRpbnB1dC52YWwoKSlcblx0XHRcdFx0XHQgICAgLmFkZENsYXNzKCd1bnNhdmVkJyk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyICRvdmVyYWxsU3RhdHVzID0gJHF1ZXJ5UmVzdWx0cy5maW5kKCd0aGVhZCB0aC5zdGF0dXMnKTtcblx0XHRcdFx0XHR2YXIgdG90YWwgPSAkcXVlcnlSZXN1bHRzLmZpbmQoJ3RyLnVuc2F2ZWQnKS5sZW5ndGg7XG5cblx0XHRcdFx0XHRpZiAodG90YWwgPiAxKSB7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCRvdmVyYWxsU3RhdHVzXG5cdFx0XHRcdFx0XHQgICAgLmh0bWwoXG5cdFx0XHRcdFx0XHRcdCc8YnV0dG9uIGNsYXNzPVwiZG8tc2F2ZS1hbGwgYnRuIGJ0bi1kYW5nZXJcIiB0eXBlPVwiYnV0dG9uXCI+Jytcblx0XHRcdFx0XHRcdFx0J1NhdmUgJyt0b3RhbCsnIHJvd3M8L2J1dHRvbj4nXG5cdFx0XHRcdFx0XHQgICAgKVxuXHRcdFx0XHRcdFx0ICAgIC5maW5kKCcuZG8tc2F2ZS1hbGwnKVxuXHRcdFx0XHRcdFx0ICAgIC5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHF1ZXJpZXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0dmFyIHF1ZXJ5U3RhdGUgPSBbXTtcblx0XHRcdFx0XHRcdFx0dmFyIHdhcm5lZCA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRcdGlmICgkcXVlcnlSZXN1bHRzLmZpbmQoJ3RyLnVuc2F2ZWQnKS5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMuZmluZCgndHIgdGguc3RhdHVzJykuaHRtbCgnJyk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0JHF1ZXJ5UmVzdWx0cy5maW5kKCd0ci51bnNhdmVkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgJHJvdyA9ICQodGhpcyk7XG5cblx0XHRcdFx0XHRcdFx0XHR2YXIgcGtleSA9ICRyb3cuZGF0YSgncGtleScpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBpZCA9ICRyb3cuZGF0YSgnaWQnKTtcblx0XHRcdFx0XHRcdFx0XHR2YXIgdGFibGUgPSAkcXVlcnlSZXN1bHRzLmRhdGEoJ3RhYmxlJyk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHJvdyA9ICRyb3cuZXh0cmFjdFJvdygpO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBkYk5hbWUgPSAkcXVlcnlSZXN1bHRzLmRhdGEoJ2RiJyk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGRiID0gbmV3IGFwaS5kYihkYk5hbWUpO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF3YXJuZWQgJiYgIXBrZXkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBtZXNzYWdlID0gXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdXYXJuaW5nOiBUaGlzIHRhYmxlIGRvZXMgbm90IGhhdmUgYSBwcmltYXJ5IGtleS5cXG4nK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnVGhlIHJlcXVlc3RlZCB1cGRhdGUgb3BlcmF0aW9ucyBtYXkgYWZmZWN0IG1vcmUgcm93cyAnK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCd0aGFuIGV4cGVjdGVkLlxcblxcbicrXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdDbGljayBPSyB0byBwcm9jZWVkLCBvciBDYW5jZWwgdG8gYWJvcnQuJztcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFjb25maXJtKG1lc3NhZ2UpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IFwidXNlckFib3J0XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRcdHdhcm5lZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHBrZXkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciB1cGRhdGVTcWwgPSBxdWVyeUdlbmVyYXRvci51cGRhdGVQa2V5KHRhYmxlLCBwa2V5LCBpZCwgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XG5cdFx0XHRcdFx0XHRcdFx0XHRxdWVyaWVzLnB1c2godXBkYXRlU3FsKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHVwZGF0ZVNxbCA9IHF1ZXJ5R2VuZXJhdG9yLnVwZGF0ZSh0YWJsZSwgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXREYXRhKCksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0XHRcdHF1ZXJpZXMucHVzaCh1cGRhdGVTcWwpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdHF1ZXJ5U3RhdGUucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdFx0XHRcdCRyb3c6ICRyb3csXG5cdFx0XHRcdFx0XHRcdFx0XHR0YWJsZTogdGFibGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRkYjogZGJOYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0cGtleTogcGtleSxcblx0XHRcdFx0XHRcdFx0XHRcdGlkOiBpZFxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHR2YXIgZGIgPSBuZXcgYXBpLmRiKCRxdWVyeVJlc3VsdHMuZGF0YSgnZGInKSk7XG5cdFx0XHRcdFx0XHRcdGRiICAucXVlcnkocXVlcmllcy5qb2luKCc7ICcpKVxuXHRcdFx0XHRcdFx0XHQgICAgLmNhdGNoKGZ1bmN0aW9uKHIpIHsgcmV0dXJuIHI7IH0pIC8vIGdvaW5nIHRvIHByb2Nlc3MgYW55d2F5XG5cdFx0XHRcdFx0XHRcdCAgICAudGhlbihmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgaSBpbiBxdWVyeVN0YXRlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgc3RhdGUgPSBxdWVyeVN0YXRlW2ldO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJlc3VsdCA9IHIucXVlcmllc1tpXTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciAkcm93ID0gc3RhdGUuJHJvdztcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByb3cgPSBzdGF0ZS5yb3c7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmIChyZXN1bHQuZXJyb3IpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZhaWxlZCB0byBzYXZlIHJvdyB3aXRoIHN0YXRlOiAnKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coc3RhdGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnUXVlcnkgYW5kIHJlc3VsdDonKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoJ0ZhaWxlZCB0byBzYXZlIHJvdzogJytyZXN1bHQuZXJyb3IpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEkcm93LmRhdGEoJ3BrZXknKSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlRGlzcGxheVJvd3NCeUNyaXRlcmlhKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCRxdWVyeVJlc3VsdHMsIHJvdy5nZXREYXRhKCksIHJvdy5nZXRQcm9wb3NlZCgpKTtcblx0XHRcdFx0XHRcdFx0XHRcdG1hcmtSb3dTYXZlZCgkcm93KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0JHF1ZXJ5UmVzdWx0cy5maW5kKCd0aC5zdGF0dXMnKS5odG1sKCcnKTtcblx0XHRcdFx0XHRcdFx0ICAgIH0pO1xuXHRcdFx0XHRcdFx0ICAgIH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBPbmx5IG9uZSBcblx0XHRcdFx0XHRcdCRvdmVyYWxsU3RhdHVzLmh0bWwoJycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHZhciB1cGRhdGVCdXR0b24gPSBmdW5jdGlvbigpIHtcdFxuXHRcdCAgICB2YXIgdGltZW91dCA9IG51bGw7XG5cdFx0ICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodGltZW91dClcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBxdWVyeSA9ICRxdWVyeUlucHV0LnZhbCgpO1xuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoLy0tLiokL21nLCAnJyk7IFxuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoL15cXHMrLywgJycpO1xuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoL1xccyskLywgJycpO1xuXHRcdFx0XHRwYXJ0cyA9IHF1ZXJ5LnNwbGl0KCcgJyk7XG5cdFx0XHRcdHZlcmIgPSBwYXJ0c1swXS50b1VwcGVyQ2FzZSgpO1xuXHRcblx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygncmVmcmVzaCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdidG4tcHJpbWFyeScpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdidG4tZGFuZ2VyJylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2J0bi1zdWNjZXNzJyk7XG5cblx0XHRcdFx0aWYgKHF1ZXJ5ID09IFwiXCIpIHtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdidG4tcHJpbWFyeScpO1xuXHRcdFx0XHRcdCRidXR0b24ucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JGJ1dHRvbi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcblx0XHRcdFx0aWYgKHZlcmIgPT0gXCJVUERBVEVcIiB8fCB2ZXJiID09IFwiREVMRVRFXCIgfHwgdmVyYiA9PSBcIkNSRUFURVwiXG5cdFx0XHRcdCAgICB8fCB2ZXJiID09IFwiSU5TRVJUXCIgfHwgdmVyYiA9PSBcIlRSVU5DQVRFXCIpIHtcblx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHQuaHRtbCgnRXhlY3V0ZScpXG5cdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2J0bi1kYW5nZXInKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKCRxdWVyeUlucHV0LmRhdGEoJ2N1cnJlbnRxdWVyeScpID09IHF1ZXJ5KSB7XG5cdFx0XHRcdFx0JGJ1dHRvbi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdidG4tcHJpbWFyeScpO1xuXHRcdFx0XHRcdCRidXR0b24uYWRkQ2xhc3MoJ3JlZnJlc2gnKTtcblx0XHRcdFx0XHQkYnV0dG9uLmh0bWwoJ1JlZnJlc2gnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgdmFsaWRhdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0aWYgKHZlcmIgPT0gXCJTRUxFQ1RcIiB8fCB2ZXJiID09IFwiU0hPV1wiKVxuXHRcdFx0XHRcdFx0dmFsaWRhdGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdC5odG1sKCdRdWVyeScpXG5cdFx0XHRcdFx0XHQuYWRkQ2xhc3ModmFsaWRhdGVkPyAnYnRuLXN1Y2Nlc3MnIDogJ2J0bi1wcmltYXJ5Jyk7XG5cdFx0XHRcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fSwgNTAwKTtcblx0XHQgICAgfTtcblx0XHR9KCk7XHRcblx0XG5cdH1cblx0JCgnLmxvYWRpbmctaW5kaWNhdG9yJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xufVxuIiwiLyoqIEFzc2VydGlvbnMgICoqL1xuXG52YXIgYXNzZXJ0ID0gZnVuY3Rpb24oc3RhdGVtZW50LCBtZXNzYWdlKVxue1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZSB8fCBcIkNvbmRpdGlvbiB3YXMgbm90IHN1Y2Nlc3NmdWxcIjtcbiAgICAgICAgaWYgKHN0YXRlbWVudClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKHdpbmRvdy5jb25zb2xlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBc3NlcnRpb24gZmFpbGVkXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFzc2VydC5kZWJ1ZylcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcblxuICAgICAgICBpZiAoYXNzZXJ0LnByb2R1Y3Rpb24pXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRocm93IG5ldyBcIkFzc2VydGlvbiBmYWlsZWQ6IFwiK21lc3NhZ2U7XG59XG5hc3NlcnQuZGVidWcgPSBmYWxzZTtcbmFzc2VydC5wcm9kdWN0aW9uID0gZmFsc2U7XG5cbmV4cG9ydHMgPSBhc3NlcnQ7XG4iLCJyZXF1aXJlKCcuL2FwcC5qcycpO1xuIiwiLyoqIEFzc2VydGlvbnMgICoqL1xuXG4vLyBRdWVyeSBnZW5lcmF0aW9uXG52YXIgcXVlcnlHZW5lcmF0b3IgPSB7XG5cdHVwZGF0ZVBrZXk6IGZ1bmN0aW9uKHRhYmxlLCBwa2V5LCBpZCwgZGF0YSlcblx0e1xuXHRcdHZhciBjcml0ZXJpYSA9IHt9O1xuXHRcdGNyaXRlcmlhW3BrZXldID0gaWQ7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHRhYmxlLCBjcml0ZXJpYSwgZGF0YSk7XG5cdH0sXG5cblx0dXBkYXRlOiBmdW5jdGlvbih0YWJsZSwgY3JpdGVyaWEsIGRhdGEpXG5cdHtcblx0XHR2YXIgc3FsID0gXCJVUERBVEUgYFwiK3RhYmxlK1wiYCBcXG5TRVQgXFxuXCI7XG5cdFx0dmFyIHBhcnRzID0gW107XG5cdFx0Zm9yICh2YXIga2V5IGluIGRhdGEpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGRhdGFba2V5XTtcblx0XHRcdHBhcnRzLnB1c2goJyAgYCcra2V5KydgID0gXCInKyh2YWx1ZStcIlwiKS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIicpO1xuXHRcdH1cblxuXHRcdHNxbCArPSBwYXJ0cy5qb2luKFwiLCBcXG5cIikrXCIgXFxuXCI7XG5cdFx0c3FsICs9IFwiV0hFUkUgXFxuXCI7XG5cdFx0cGFydHMgPSBbXTtcblx0XHRmb3IgKHZhciBrZXkgaW4gY3JpdGVyaWEpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGNyaXRlcmlhW2tleV07XG5cdFx0XHRwYXJ0cy5wdXNoKCcgIGAnK2tleSsnYCA9IFwiJysodmFsdWUrXCJcIikucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInKTtcblx0XHR9XG5cdFx0c3FsICs9IHBhcnRzLmpvaW4oXCIgXFxuICBBTkQgXCIpK1wiIFxcblwiO1xuXHRcdHJldHVybiBzcWw7XG5cdH0sXG5cblx0c2VsZWN0OiBmdW5jdGlvbih0YWJsZSwgc2VsZWN0aW9uLCBjcml0ZXJpYSwgb3JkZXIsIHBhZ2UpXG5cdHtcblx0XHR2YXIgc3FsID0gXCJTRUxFQ1QgXCI7XG5cblx0XHRpZiAoc2VsZWN0aW9uKSB7XG5cdFx0XHR2YXIgZ3Jvb21lZFNlbGVjdGlvbiA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSBpbiBzZWxlY3Rpb24pIHtcblx0XHRcdFx0dmFyIGl0ZW0gPSBzZWxlY3Rpb25baV07XG5cblx0XHRcdFx0aWYgKGl0ZW0ubWF0Y2goL15bQS1aYS16MC05XSskLykpIHtcblx0XHRcdFx0XHRpdGVtID0gJ2AnK2l0ZW0rJ2AnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Z3Jvb21lZFNlbGVjdGlvbi5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0c2VsZWN0aW9uID0gZ3Jvb21lZFNlbGVjdGlvbjtcblx0XHR9XG5cblx0XHRpZiAoIXNlbGVjdGlvbiB8fCBzZWxlY3Rpb24ubGVuZ3RoID09IDApXG5cdFx0XHRzcWwgKz0gJyogJztcblx0XHRlbHNlIGlmIChzZWxlY3Rpb24ubGVuZ3RoID09IDEpXG5cdFx0XHRzcWwgKz0gc2VsZWN0aW9uWzBdK1wiIFwiO1xuXHRcdGVsc2Vcblx0XHRcdHNxbCArPSBcIlxcbiAgXCIrc2VsZWN0aW9uLmpvaW4oXCIsIFxcbiAgXCIpK1wiIFxcblwiO1xuXG5cdFx0aWYgKCF0YWJsZSAmJiBjcml0ZXJpYSkge1xuXHRcdFx0dGhyb3cgXCJNdXN0IHNwZWNpZnkgYSB0YWJsZSBpZiBjcml0ZXJpYSBpcyBzcGVjaWZpZWRcIjtcblx0XHR9XG5cblx0XHRpZiAodGFibGUpIHtcblx0XHRcdGlmICghc2VsZWN0aW9uIHx8IHNlbGVjdGlvbi5sZW5ndGggPD0gMSlcblx0XHRcdFx0c3FsICs9IFwiRlJPTSBgXCIrdGFibGUrXCJgIFxcblwiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzcWwgKz0gXCJGUk9NXFxuICBgXCIrdGFibGUrXCJgIFxcblwiO1xuXHRcdH1cblxuXHRcdGlmIChjcml0ZXJpYSkge1xuXHRcdFx0c3FsICs9IFwiV0hFUkUgXCI7XG5cdFx0XHR2YXIgcGFydHMgPSBbXTtcblx0XHRcdGZvciAodmFyIGZpZWxkIGluIGNyaXRlcmlhKSB7XG5cdFx0XHRcdHBhcnRzLnB1c2goJyAgYCcrZmllbGQrJ2AgPSBcIicrKGNyaXRlcmlhW2ZpZWxkXStcIlwiKS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIicpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocGFydHMubGVuZ3RoID09IDEpXG5cdFx0XHRcdHNxbCArPSBwYXJ0c1swXStcIiBcXG5cIjtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c3FsICs9IFwiIFxcblwiK3BhcnRzLmpvaW4oXCIgQU5EIFxcblwiKStcIiBcXG5cIjtcblx0XHR9XG5cblx0XHRpZiAob3JkZXIpIHtcblx0XHRcdHNxbCArPSBcIk9SREVSIEJZIFwiO1xuXHRcdFx0dmFyIHBhcnRzID0gW107XG5cdFx0XHRmb3IgKHZhciBmaWVsZCBpbiBvcmRlcikge1xuXHRcdFx0XHRwYXJ0cy5wdXNoKCdgJytmaWVsZCsnYCAnKyhvcmRlcltmaWVsZF0udG9Mb3dlckNhc2UoKSA9PSBcImFzY1wiID8gXCJBU0NcIiA6IFwiREVTQ1wiKSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGlmIChwYXJ0cy5sZW5ndGggPT0gMSlcblx0XHRcdFx0c3FsICs9IHBhcnRzWzBdK1wiIFxcblwiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzcWwgKz0gXCIgXFxuXCIrcGFydHMuam9pbihcIiwgXFxuXCIpK1wiIFxcblwiO1xuXHRcdH1cblxuXHRcdGlmIChwYWdlKSB7XG5cdFx0XHRzcWwgKz0gXCJMSU1JVCBcIitwYWdlLmxpbWl0O1xuXG5cdFx0XHRpZiAocGFnZS5vZmZzZXQpXG5cdFx0XHRcdHNxbCArPSBcIiBPRkZTRVQgXCIrcGFnZS5vZmZzZXQ7XHRcblx0XHR9XG5cdFx0cmV0dXJuIHNxbC5yZXBsYWNlKC9eXFxufFxcbiQvbWcsIFwiXCIpK1wiIFxcblwiO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHF1ZXJ5R2VuZXJhdG9yO1xuIl19

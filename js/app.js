/** Assertions  **/

var assert = require('./assert.js');
var api = require('./api.js');
var queryGenerator = require('./queryGenerator.js');
window.queryGenerator = queryGenerator;

!function() {

	/* Functions */

	function basePath() {
		var basePath = $('html').attr('data-base-path');
		return basePath;
	}

	/* ////////////////// */

	var sequeldash = {
		version: '1.0',
		apiEndpoint: basePath()+'/../api.v1'
	};

	window.sequeldash = sequeldash;
	
	!function() {
	
		sequeldash.init = function() {
			/** UI **/
			$('.loading-indicator').addClass('active');

			// Initialize Angular
			var app = angular.module('sequeldash', [
				'ngRoute'
			]);
			
			/**
			 * Called to load the model for a URL during Angular routing
			 * 
			 * @param {type} $scope
			 * @param {type} url
			 * @returns {Boolean}
			 */
			function loadPageEx($scope, url) {
				$('.loading-indicator').addClass('active');
				$.post(url, {
					ajax: 1
				}, function($model) {
					$('.loading-indicator').removeClass('active');
					
					// Redirect if we need to
					if ($model.redirectTo && window.location.hash != $model.redirectTo) {
						window.location.hash = $model.redirectTo;
						return;
					}
					if (!$scope)
						return;
				
					var $root = $scope.$parent;
					if ($root) {
						$root.$apply(function($root) {
							$root.breadcrumbs = $model.breadcrumbs;
							$root.state = $model.state;
						});
					}

					$scope.$apply(function($scope) { 
						for (var key in window.$state) 
							delete $scope[key];

						for (var key in $model) 
							$scope[key] = $model[key];
					});

					window.$state = $model;

				}, 'json').error(function(e) {
					console.log('While navigating, received an XHR Error: '+e);
					console.log(e);
					if (window.location.hash != '#/error')
						window.location.hash = '#/error';
				});

				return false;	
			}
		
			function loadHash($scope)
			{
				var apiPath = sequeldash.apiEndpoint;
				loadPageEx($scope, sequeldash.apiEndpoint+window.location.hash.substr(1));		
			}
	
			// Some controllers (TODO: move out of here)
			
			app.controller('TableDetailsController', ['$scope', '$http', function($scope) {
				$scope.query = {};
				$scope.database = '';
				$scope.table = {name: '', schema: []};
				loadHash($scope);
			}]);
			app.controller('DatabaseDetailsController', ['$scope', '$http', function($scope) {
				$scope.database = {name: '', tables: []};
				loadHash($scope);
			}]);
			app.controller('StaticController', ['$scope', '$http', function($scope) {
				loadHash($scope);
			}]);
			app.controller('QueryController', ['$scope', '$http', function($scope) {
				$scope.query = {};
				$scope.database = '';
				$scope.table = '';
				loadHash($scope);
			}]);
			
			app.config(['$routeProvider',
				function($routeProvider) {
					$routeProvider.
						when('/login', {
							templateUrl: 'html/login/index.html',
							controller: 'StaticController'
						}).
						when('/dbs', {
							templateUrl: 'html/index/index.html',
							controller: 'StaticController'
						}).
						when('/dbs/:name', {
							templateUrl: 'html/database/details.html',
							controller: 'DatabaseDetailsController'
						}).
						when('/dbs/:name/query', {
							templateUrl: 'html/database/query.html',
							controller: 'QueryController'
						}).
						when('/dbs/:name/tables/:table', {
							templateUrl: 'html/database/table-details.html',
							controller: 'TableDetailsController'
						}).
						when('/about', {
							templateUrl: 'html/about/index.html',
							controller: 'StaticController'
						}).
						when('/error', {
							templateUrl: 'html/error/index.html',
							controller: 'StaticController'
						}).
						when('/error/404', {
							templateUrl: 'html/error/404.html',
							controller: 'StaticController'	
						}).
						otherwise({
							redirectTo: '/dbs'
						});
				}
			]);
			
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
							$(container).scrollTop(size);
						}

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
				var width = sequeldash.getScrollbarWidth();
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
				$mainContainer.scrollTop(val);
			});

			// Make sure we have a state
			if (window.$state) {
				// Apply it
				var $scope = $('html').scope();
				for (var key in $state) {
					$scope[key] = $state[key];
				}
				$scope.startup = false;
				$scope.$apply();
			}

			$(document).trigger('app-ready');

			// Install custom behaviors

			$('body').on('click', '.navigate', function(e) {
				var href = $(this).attr('data-href');
				window.location.hash = "#"+href;
			});

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
		};
	}();
	
	/**
	 * Get browser's scrollbar width
	 * @returns int
	 */
	!function() {
		var scrollbarWidth = -1;
		sequeldash.getScrollbarWidth = function() {
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
	}();
}();

/**
 * Initialization
 */
window.addEventListener('polymer-ready', function() {
	$(document).ready(function() {
		if ($('html').hasAttr('test'))
			return;
		window.sequeldash.init();
	});
});

/**
 * 
 * SEQUELDASH
 * (C) 2014
 * 
 */

/** Dependencies **/
var assert = require('./assert.js');
var api = require('./api.js');
var queryGenerator = require('./queryGenerator.js');
window.queryGenerator = queryGenerator;

/**
 * Core
 */
!function() {

	/**
	 * Retrieve the base path for the application
	 * @returns string
	 */
	function basePath() {
		var basePath = $('html').attr('data-base-path');
		return basePath;
	}
	
	/**
	 * Defines the primary SequelDash frontend application interface
	 */
	var sequeldash;
	sequeldash = {
		version: '1.0',
		apiEndpoint: basePath()+'/../api.v1',
		
		/**
		 * Initialize Sequeldash
		 */
		init: function() {
			window.sequeldash = this;
			
			/** UI **/
			$('.loading-indicator').addClass('active');

			this.initAngular();
			this.initHeroHeader();
			this.initHeaderPanel();
			this.initBehaviors();

			$(document).trigger('app-ready');

			/**
			 * Load the page for the current hash
			 * 
			 * @param {type} $scope
			 * @returns {undefined}
			 */
			function loadHash($scope)
			{
				var apiPath = sequeldash.apiEndpoint;
				loadPageEx($scope, sequeldash.apiEndpoint+window.location.hash.substr(1));
			}

			/**
			 * Called to load the model for a URL during Angular routing
			 * 
			 * @param scope $scope
			 * @param string url
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

					$(document).trigger('page-ready');

				}, 'json').error(function(e) {
					console.log('While navigating, received an XHR Error: '+e);
					console.log(e);
					if (window.location.hash != '#/error')
						window.location.hash = '#/error';
				});

				return false;	
			}
		},
		
		/**
		 * Initialize the hero header panel behaviors
		 */
		initHeroHeader: function()
		{
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
		},
		
		/**
		 * Initialize Angular
		 */
		initAngular: function() {
			// Initialize Angular
			var app = angular.module('sequeldash', [
				'ngRoute'
			]);

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
		},

		/**
		 * Initialize the header panel
		 */
		initHeaderPanel: function() {
			var $coreScrollHeaderPanel = $( 'core-scroll-header-panel' );
			$coreScrollHeaderPanel.shadow('#headerContainer').on( 'wheel', function (e) {
				if ($(e.target).closest('.hero-cards').length > 0) {
					return;
				}

				var $mainContainer = $coreScrollHeaderPanel.shadow('#mainContainer');
				var val = $mainContainer.scrollTop() + e.originalEvent.deltaY;
				$mainContainer.scrollTop(val);
			});
		},
		
		/**
		 * Initialize general app behaviors
		 */
		initBehaviors: function() {
			// Install custom behaviors

			$('body').on('click', '.navigate', function(e) {
				var href = $(this).attr('data-href');
				window.location.hash = "#"+href;
			});

			$('.loading-indicator').removeClass('active');
		}
	};
	
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

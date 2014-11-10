/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

// Dependencies

var api = require('./api.js');

/**
 * Core
 */
!function() {
	
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
			var self = this;
			$(document).on('app-ready', function() {
				self.initBehaviors();
			});
			
			this.initAngular();
			this.initHeroHeader();
			this.initHeaderPanel();
		},

		/**
		 * Load the page for the current hash
		 * 
		 * @param {scope} $scope
		 * @returns {undefined}
		 */
		loadHash: function($scope, disableData)
		{
			return this.loadPage($scope,
								 this.apiEndpoint+window.location.hash.substr(1),
								 disableData);
		},
		
		/**
		 * Called to load the model for a URL during Angular routing
		 * 
		 * @param scope $scope
		 * @param string url
		 */
		loadPage: function($scope, url, disableData) {
			var self = this;
			
			if (disableData) {
				
				return new Promise(function(resolve, reject) {
					$(document).trigger('page-ready');
					resolve();
				});
				
			}
			
			$('.loading-indicator').addClass('active');
			
			return new Promise(function(resolve, reject) {
				$.get(url, {
					ajax: 1
				}, function($model) {
					$('.loading-indicator').removeClass('active');

					// Show the error condition, if we have one

					if ($model.error) {
						if ($model.error.constructor == String) 
							alert($model.error);

						if ($model.exceptionRendered) {
							var errorDialog = $('#dialog-error').get(0);
							errorDialog.opened = true;
							$(errorDialog).find('.details').html($model.exceptionRendered);
						}

					}

					// Redirect if we need to, even with errors

					if ($model.redirectTo && window.location.hash != $model.redirectTo) {
						window.location.hash = $model.redirectTo;
						resolve($model);
						return;
					}

					// Terminate this response if an error occurred.

					if ($model.error) {
						resolve($model);
						return;
					}

					if (!$scope) {
						resolve($model);
						return;
					}

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

					resolve($model);

				}, 'json').error(function(e) {
					console.log('While navigating, received an XHR Error: '+e);
					console.log(e);
					if (window.location.hash != '#/error')
						window.location.hash = '#/error';
					
					reject(e);
				});
			});
		},
		
		/**
		 * Update the state of breadcrumbs from the current page
		 */
		updateBreadcrumbs: function()
		{
			//return false;
			if ($('.content-container #breadcrumbs').length > 0) {
				var $nodes = $('.content-container #breadcrumbs')
					.children();
				
				$('.breadcrumbs paper-menu-button')
					.html($nodes)
					.children()
					.wrap('<paper-item></paper-item>')
					.change();
			
			} else {
				$('.breadcrumbs paper-menu-button').html('None');
				$('.breadcrumbs paper-menu-button').change();
			}
		},
		
		/**
		 * Update the state of the hero header based on the current page.
		 * @param bool firstPage True if this is the first page 
		 */
		updateHeroHeader: function(firstPage)
		{
			if ($('.content-container #no-logo').length > 0) {
				$('.top-bar .logo').hide();
			} else {
				$('.top-bar .logo').show();
			}
			
			if ($('.content-container #hero-content').length > 0) {
				$('core-toolbar .middle').html($('.content-container #hero-content').children());
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

					/*
					if (!hideBar || !firstPage) {
						$(container).scrollTop(size);
					}
					*/
				   
					$('core-toolbar .middle').show();
					// Make the header pretty
					/*
					if (!hideBar) {
						setTimeout(function() {
							$(container).animate({scrollTop: 0}, {duration:duration});
						}, 500);

					} else if (firstPage) {
						setTimeout(function() {
							$(container).animate({scrollTop: size}, {duration:duration});
						}, 250);
					}
					// */
				}, 500);
			}
		},

		/**
		 * Initialize the hero header panel behaviors
		 */
		initHeroHeader: function()
		{
			setTimeout(function() {
				var width = getScrollbarWidth();
				$('core-scroll-header-panel::shadow #headerContainer').css('margin-right', width+'px');
				$('.top-bar').css('margin-right', width+'px');
			}, 100);

			this.updateHeroHeader(true);
		},
		
		/**
		 * Require all necessary controllers.
		 * TODO: Should this be farmed out to a single include?
		 */
		loadControllers: function() {
			require('./controllers/LoginController.js');
			require('./controllers/TableDetailsController.js');
			require('./controllers/DatabaseDetailsController.js');
			require('./controllers/StaticController.js');
			require('./controllers/DynamicController.js');
			require('./controllers/QueryController.js');
		},
		
		/**
		 * Specifies the routes used by angular routing
		 * @param {module} app
		 */
		initRouting: function(app) {
			app.config(['$routeProvider',
				function($routeProvider) {
					$routeProvider.
						when('/login', {
							templateUrl: 'html/login/index.html',
							controller: 'LoginController'
						}).
						when('/prefs', {
							templateUrl: 'html/prefs/index.html',
							controller: 'StaticController'
						}).
						when('/dbs', {
							templateUrl: 'html/index/index.html',
							controller: 'DynamicController'
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
		},
		
		/**
		 * Initialize Angular
		 * - Bootstraps Angular
		 * - Waits for app-ready to initialize watches/syncing
		 */
		initAngular: function() {
			var self = this;
			
			// Bootstrap Angular
			
			angular.element(document).ready(function() {
				$(document).trigger('app-ready');
			});
			
			var app = angular.module(
				'sequeldash', 
				['ngRoute', 'ngSanitize', 'eee-c.angularBindPolymer']);
				
			this.loadControllers();
			this.initRouting(app);
			angular.bootstrap(document, ['sequeldash']);
			
			// ------------------------------------------------------
			// Wait for the app-ready signal. By then all components
			// will be ready for the initialization bit.
			
			$(document).on('app-ready', function() {
				var $scope = $(document).scope();
				var skipNotify = false;
				
				/////////////////////////////////////////////////////////////
				// Mirror changes two-way between Angular and
				// the persistence layer (all held under angular persisted.*)
				//
				// First half, from persistence to angular
				
				api.persistence.watch(function(data) {
					console.log('reacting newly persisted data to scope');
					
					if (skipNotify) {
						skipNotify = false;
						return;
					}
					
					skipNotify = true;
					$scope.$apply(function($scope) {
						console.log('reacting this:');
						console.log(data);
						$scope.persisted = data;
					});
				});
				
				// Second half, from angular to persistence
				
				$scope.$watch('persisted', function() {
					console.log('Copy from angular -> persistence');
					api.persistence.data().then(function(data) {
						if (skipNotify) {
							skipNotify = false;
							return;
						}
						
						skipNotify = true;
						api.persistence.save($scope.persisted);
					});
				}, true);
				
				// When we receive $viewContentLoaded from Angular,
				// go ahead and update Angular state from the declarative bits 
				// included within the template.
				
				$scope.$on('$viewContentLoaded', function() {
					self.updateBreadcrumbs();
					self.updateHeroHeader();
				});
				
				// Initialize the $scope
				
				$scope.$apply(function($scope) {
					
					// Put the persisted data into Angular
					// from the persistence API
					api.persistence.data().then(function(data) {
						$scope.persisted = data;
					});
					
					// Incorporate branding. brand.html should include a
					// script which declares window.$brand.
					
					if (window.$brand) {
						$scope.brand = window.$brand;
					}
					
					// We are started up now.
					$scope.startup = false;
				});

			});
			
		},

		/**
		 * Initialize the header panel
		 */
		initHeaderPanel: function() {
			var $coreScrollHeaderPanel = $( 'core-scroll-header-panel' );
			var $mainContainer = $coreScrollHeaderPanel.shadow('#mainContainer');
			var kineticLoop = null;
			
			// Mouse wheel
			
			$coreScrollHeaderPanel.shadow('#headerContainer').on( 'wheel', function (e) {
				var $mainContainer = $coreScrollHeaderPanel.shadow('#mainContainer');
				var val = $mainContainer.scrollTop() + e.originalEvent.deltaY;
				$mainContainer.scrollTop(val);
			});
			
			// Touch events
			
			var touchY = null;
			var startTouchY = null;
			var touchTime = null;
			var accel = 0;
			var startScrollTop = 0;
			
			var $touchableElements = $coreScrollHeaderPanel.shadow('#headerContainer')
					.add('.top-bar .logo');
			
			// Mouse wheel should cancel kinetic touch 
			// scrolling (devtools, tablet PCs)
			
			$('body').on('wheel', function() {	
				if (kineticLoop) {
					kineticLoop.cancel();
					kineticLoop = null;
				}
			});
			
			$('body').on('touchstart', function(jqe) {
				if ($(jqe.target).closest('core-toolbar').length > 0) 
					return;
				
				if (kineticLoop) {
					kineticLoop.cancel();
					kineticLoop = null;
				}
			});
			
			$touchableElements.on('touchstart', function(jqe) {
				//jqe.stopPropagation();
				
				if (kineticLoop) {
					clearTimeout(kineticLoop.interval);
					kineticLoop = null;
				}
				
				var coord = $mainContainer.scrollTop();
				var velocity = 0;
				var drag = 0.05;
				var fps = 60;
				var max = $mainContainer.prop('scrollHeight');
				var clampDistance = 0.01;
				
				startScrollTop = $mainContainer.scrollTop();
				kineticLoop = {
					fingersUp: false,
					started: Date.now(),
					cancel: function() {
						clearInterval(this.interval);
					},
					
					interval: setInterval(function() {
						var self = kineticLoop;
						
						if (self.fingersUp) {
							coord = Math.min(max, coord + velocity);
							velocity *= (1-drag);
							// Clamp velocity to zero if needed
							if (-clampDistance < velocity && velocity < clampDistance)
								velocity = 0;
						}


						// Set the scroll top
						$mainContainer.scrollTop(coord);

						// Cancel ourselves if we come to rest.

						if (self.fingersUp && velocity == 0) {
							clearTimeout(self.interval);
							kineticLoop = null;
						}
						
						
						
					}, 1000/fps),
					
					follow: function(newCoord) {
						velocity = (newCoord - coord)*1.5;
						coord = newCoord;
						
					}
				};
				
				startTouchY = touchY = touchTime = null;
				accel = 0;
				
				//return false;
			});
			
			$touchableElements.on('touchmove', function(jqe) {
				//jqe.stopPropagation();
				
				var e = jqe.originalEvent;
				var touches = e.changedTouches;
				var touch = touches[0];
				
				if (touchY === null) {
					touchY = startTouchY = touch.screenY;
					touchTime = Date.now();
					return false;
				} 
				
				var delta = touchY - touch.screenY;
				var val = startScrollTop + delta;
				
				if (kineticLoop)
					kineticLoop.follow(val);
				
				//return false;
			});
			
			$touchableElements.on('touchend', function(jqe) {
				if (kineticLoop)
					kineticLoop.fingersUp = true;
				
				//return false;
			});
			
		},
		
		/**
		 * Initialize general app behaviors
		 */
		initBehaviors: function() {
			// Install custom behaviors
			$('body').on('core-overlay-open', 'paper-dialog', function() {
				$('html').addClass('dialog-open');
			});
			$('body').on('core-overlay-close-completed', 'paper-dialog', function(e) {
				if (!$(e.target).is('paper-dialog'))
					return;
				$('html').removeClass('dialog-open');
			});
			
			$('body').on('click', '.removeFavorite', function() {
				api.favorites.remove($(this).attr('data-url'));
			});
			
			$('body').on('click', '.addFavorite', function() {
				var name = $(this).attr('data-name');
				var url = $(this).attr('data-url');
				
				var $scope = $(document).scope();
				
				if ($scope) {
					$scope.$apply(function($scope) {
						if ($scope.favoriteCandidate)
							$scope.favoriteCandidate.available = false;
					});
					api.favorites.add(url, name);
				}
			});
			
			$(document).on('hashchange', function() {
				var $scope = $(document).scope();
				if (!$scope)
					return;
				
				$scope.$apply(function($scope) {
					$scope.hash = window.location.hash;
				});
			});
			
			$(document).on('app-ready', function() {
				var $scope = $(document).scope();
				if (!$scope)
					return;
				
				$scope.$apply(function($scope) {
					$scope.hash = window.location.hash;
				});
			});
			
			$('body').on('click', '.navigate', function(e) {
				var href = $(this).attr('data-href');
				window.location.hash = "#"+href;
			}); 

			if (!api.fullscreen.supported()) {
				$('html').addClass('no-fullscreen');
			}

			$('body').on('click', '.go-fullscreen', function(e) {
				
				if (api.fullscreen.active()) {
					api.fullscreen.exit();
				} else {
					var container = $('core-scroll-header-panel').get(0);
					if (!api.fullscreen.supported()) {
						alert('No fullscreen mode available');
						return false;
					}

					api.fullscreen.request(document.body);
				}
				return false;
			});
			
			$('body').on('click', '.go-preferences', function(e) {
				var prefs = $('#dialog-prefs').get(0);
				prefs.opened = true;
				return false;
			});
			
			$(document).scope().$watch('persisted.settings', function() {
				$('body').find('.setting').each(function() {
					var $setting = $(this);
					var setting = $(this).attr('data-setting');
					var value = Object.getPath($(document).scope(), "persisted.settings."+setting);				

					if ($setting.is('paper-checkbox')) {
						$setting.attr('checked', value? true : false);
					} else if ($setting.is('paper-radio-group')) {
						$setting.prop('selected', value);
					} else {
						$setting.attr('value', value);
					}
				});
			}, true);
			$('body').on('change', '.setting', function() {
				var setting = $(this).attr('data-setting');
				var value = $(this).attr('value');
				
				if ($(this).is('paper-checkbox')) {
					value = $(this).attr('checked') ? true : false;
				} else if ($(this).is('paper-radio-group')) {
					value = $(this).prop('selected');
				}
				
				$(document).scope().$apply(function($scope) {
					Object.setPath($scope, 'persisted.settings.'+setting, value, true);
					console.log('set value to '+value);
				});
			});
			
			$('.loading-indicator').removeClass('active');
			
			$('.breadcrumbs paper-menu-button').click(function() {
				if ($(this).children().length == 0) {
					window.history.back();
				}
			});
			
		}
	};
	
	window.sequeldash = sequeldash;
	api.app = sequeldash;
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

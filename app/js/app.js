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
var persistence = require('./persistence.js');
var favorites = require('./favorites.js');
var recents = require('./recents.js');

window.console.resolve = function(promise) {
	promise.then(function(r) {
		console.log('Promise resolved: ');
		console.log(r);
	}).catch(function(e) {
		console.log('Promise rejected: ');
		console.log(e);
	});
};

api.favorites = favorites;
api.recents = recents;
api.persistence = persistence;

/**
 * Core
 */
!function() {
	function exitFullscreen() {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
		
		console.log('No exitFullscreen available');
	}
	
	function requestFullscreen(elem) {
		if (elem.length)
			elem = elem[0];
		
		if (elem.requestFullscreen) {
		  elem.requestFullscreen();
		} else if (elem.msRequestFullscreen) {
		  elem.msRequestFullscreen();
		} else if (elem.mozRequestFullScreen) {
		  elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
		  elem.webkitRequestFullscreen();
		}
	}
	
	function hasFullscreen() {
		var elem = document.body;
		
		if (elem.requestFullscreen || 
			elem.msRequestFullscreen || 
			elem.mozRequestFullScreen || 
			elem.webkitRequestFullscreen) {
		
			return true;
		}
		
		return false;
	}
	
	function isFullscreen() {
		
		if (document.fullscreenElement || 
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement) {
		
			return true;
		}
		
		return false;
	}

	function updateFullscreen(value) {
		if (typeof value == 'undefined') {
			value = isFullscreen();
		}
		
		if (value) {
			$('html').addClass('fullscreen');
		} else {
			$('html').removeClass('fullscreen');
		}
	}
	
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
						return;
					}

					// Terminate this response if an error occurred.

					if ($model.error)
						return;

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

					resolve();

				}, 'json').error(function(e) {
					console.log('While navigating, received an XHR Error: '+e);
					console.log(e);
					if (window.location.hash != '#/error')
						window.location.hash = '#/error';
					
					reject(e);
				});
			});
		},
		
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
		 * Initialize Angular
		 */
		initAngular: function() {
			var self = this;
			
			// Initialize Angular
			var app = angular.module('sequeldash', [
				'ngRoute',
				'ngSanitize'
			]);


			$(document).on('app-ready', function() {
				var $scope = $('html').scope();
				var $injector = angular.injector(['sequeldash']);
				
				persistence.watch(function(data) {
					console.log('reacting newly persisted data to scope');
					$scope.$apply(function($scope) {
						console.log('reacting this:');
						console.log(data);
						$scope.persisted = data;
					});
				});
				
				$scope.$apply(function($scope) {
					persistence.data().then(function(data) {
						$scope.persisted = data;
					});
				});
				
				$injector.invoke(['$sce', function($sce) {
				
					if ($scope) {
						$scope.$apply(function($scope) {
							$scope.startup = false;
							if (window.$brand) {
								$scope.brand = window.$brand;
							}
						});
					}
				}]);
				$scope.$on('$viewContentLoaded', function() {
					self.updateBreadcrumbs();
					self.updateHeroHeader();
				});

			});
			
			/**
			 * Load the page for the current hash
			 * 
			 * @param {type} $scope
			 * @returns {undefined}
			 */
			function loadHash($scope, disableData)
			{
				var apiPath = sequeldash.apiEndpoint;
				return self.loadPage($scope, sequeldash.apiEndpoint+window.location.hash.substr(1), disableData);
			}
			
			// Some controllers (TODO: move out of here)

			require('./controllers/LoginController.js');
			
			app.controller('TableDetailsController', ['$scope', '$http', function($scope) {
				
				$scope.query = {};
				$scope.database = '';
				$scope.table = {name: '', schema: []};
				loadHash($scope).then(function() {
					return favorites.get();
				}).then(function(favs) {
					var available = true;
					var url = '#/dbs/'+$scope.database.name+'/tables/'+$scope.table.name;
					var name = $scope.database.name+'.'+$scope.table.name;
					
					for (var i = 0, max = favs.length; i < max; ++i) {
						var fav = favs[i];
						if (fav.url == url) {
							available = false;
							break;
						}
					}
					
					var $globalScope = $('html').scope();
					$globalScope.$apply(function($globalScope) {
						$globalScope.favoriteCandidate = {
							available: available,
							name: name,
							url: url
						};
					});
				});
			}]);
		
			app.controller('DatabaseDetailsController', ['$scope', '$http', function($scope) {
				$scope.database = {name: '', tables: []};
				loadHash($scope).then(function() {
					return favorites.get();
				}).then(function(favs) {
					
					var available = true;
					var url = '#/dbs/'+$scope.database.name;
					var name = $scope.database.name;
					
					for (var i = 0, max = favs.length; i < max; ++i) {
						var fav = favs[i];
						if (fav.url == url) {
							available = false;
							break;
						}
					}
					
					var $globalScope = $('html').scope();
					$globalScope.$apply(function($globalScope) {
						$globalScope.favoriteCandidate = {
							available: available,
							name: name,
							url: url
						};
					});
				});
			}]);
			app.controller('StaticController', ['$scope', '$http', function($scope) {
				$(document).scope().favoriteCandidate = {available: false};
				loadHash($scope, true);
			}]);
			app.controller('DynamicController', ['$scope', '$http', function($scope) {
				$(document).scope().favoriteCandidate = {available: false};
				loadHash($scope);
			}]);
			app.controller('QueryController', ['$scope', '$http', function($scope) {
				$(document).scope().favoriteCandidate = {available: false};
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

			angular.bootstrap(document, ['sequeldash']);
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
		
		initFullscreen: function() {
			updateFullscreen();
				
			$(document).on('mozfullscreenchange', function() {
				updateFullscreen();
			});
			
			$(document).on('webkitfullscreenchange', function() {
				console.log('webkit fullscreen change');
				updateFullscreen();
			});
			
			$(document).on('msfullscreenchange', function() {
				updateFullscreen();
			});
			
			$(document).on('fullscreenchange', function() {
				console.log('standard fullscreen change');
				updateFullscreen();
			});
		},
		
		/**
		 * Initialize general app behaviors
		 */
		initBehaviors: function() {
			// Install custom behaviors

			this.initFullscreen();
			
			$('body').on('click', '.addFavorite', function() {
				var name = $(this).attr('data-name');
				var url = $(this).attr('data-url');
				
				var $scope = $(document).scope();
				
				if ($scope) {
					$scope.$apply(function($scope) {
						if ($scope.favoriteCandidate)
							$scope.favoriteCandidate.available = false;
					});
					favorites.add(url, name);
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

			if (!hasFullscreen()) {
				$('html').addClass('no-fullscreen');
			}

			$('body').on('click', '.go-fullscreen', function(e) {
				
				if (isFullscreen()) {
					exitFullscreen();
				} else {
					var container = $('core-scroll-header-panel').get(0);
					if (!hasFullscreen()) {
						alert('No fullscreen mode available');
						return false;
					}

					requestFullscreen(document.body);
				}
				return false;
			});
			
			$('body').on('click', '.go-preferences', function(e) {
				var prefs = $('#dialog-prefs').get(0);
				prefs.opened = true;
				return false;
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

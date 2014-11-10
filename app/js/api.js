/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 * 
 * Defines the SequelDash Javascript backend access API
 */

var queryGenerator = require('./queryGenerator.js');
window.queryGenerator = queryGenerator;

/**
 * Resolve a promise and print to console.
 * @param {Promise} promise
 */
window.console.resolve = function(promise) {
	var resolved = {};
	promise.then(function(r) {
		console.log('Promise resolved: ');
		console.log(r);
		resolved.value = r;
	}).catch(function(e) {
		console.log('Promise rejected: ');
		console.log(e);
		resolved.error = r;
	});
	
	return resolved;
};

Object.setPath = function(obj, path, value, createAll) {
	var current = obj;
	var parts = path.split(/\./);
	for (var i = 0, max = parts.length; i < max - 1; ++i) {
		var field = parts[i];
		
		if (!current[field] && createAll)
			current[field] = {};
		
		current = current[field];	
		if (!current)
			return false;
	}
	
	current[parts[parts.length-1]] = value;
	return true;
};

Object.getPath = function(obj, path, defaultValue) {
	var current = obj;
	var parts = path.split(/\./);
	for (var i = 0, max = parts.length; i < max - 1; ++i) {
		var field = parts[i];
		current = current[field];	
		if (!current)
			return defaultValue;
	}
	
	return current[parts[parts.length-1]];
}

var scrollbarWidth = -1;
/**
 * Retrieve the width of the scrollbar UI element in this user agent.
 * @return int The width of the scrollbar, in pixels
 */
window.getScrollbarWidth = function() {
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
};

/**
 * Retrieve the base path for the application
 * @returns string
 */
window.basePath = function() {
	var basePath = $('html').attr('data-base-path');
	return basePath;
};
	

/**
 * SequelDash API
 * @type type
 */
var api = {
	persistence: require('./persistence.js'),
	settings: require('./settings.js'),
	recents: require('./recents.js'),
	favorites: require('./favorites.js'),
	queryGenerator: queryGenerator,
	
	init: function() {
		this.fullscreen.init();
	},
	
	login: function(username, password) {
		return new Promise(function(resolve, reject) {
			$.post(sequeldash.apiEndpoint+'/login', {
				username: username,
				password: password
			}, function(r) {
				if (r.error) {
					reject(r);
					return;
				}
				
				resolve(r);
				
			}, 'json');
		});
	},
	
	logout: function() {
		return new Promise(function(resolve, reject) {
			$.post(sequeldash.apiEndpoint+'/logout', {
				// Nothing to send
			}, function(r) {
				if (r.error) {
					reject(r);
					return;
				}
				
				resolve(r);
				
			}, 'json');
		});
	},
	
	db: function(name) {
		this.query = function(sql, params)
		{
			return new Promise(function(resolve, reject) {
				$.post(sequeldash.apiEndpoint+'/dbs/'+name+'/query', {
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
	},
	
	fullscreen: {
		init: function() {
			this.update();
			
			var self = this;
			
			$(document).on('mozfullscreenchange', function() {
				self.update();
			});
			
			$(document).on('webkitfullscreenchange', function() {
				console.log('webkit fullscreen change');
				self.update();
			});
			
			$(document).on('msfullscreenchange', function() {
				self.update();
			});
			
			$(document).on('fullscreenchange', function() {
				console.log('standard fullscreen change');
				self.update();
			});			
		},

		/**
		 * Exit fullscreen.
		 */
		exit: function() {
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
		},

		/**
		 * Request fullscreen mode.
		 * @param {DOMElement} elem Element which is going fullscreen
		 */
		request: function(elem) {
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
		},

		/**
		 * True if we have fullscreen support.
		 * @returns {Boolean}
		 */
		supported: function() {
			var elem = document.body;

			if (elem.requestFullscreen || 
				elem.msRequestFullscreen || 
				elem.mozRequestFullScreen || 
				elem.webkitRequestFullscreen) {

				return true;
			}

			return false;
		},

		/**
		 * True if we are fullscreen.
		 * @returns {Boolean}
		 */
		active: function() {
			if (document.fullscreenElement || 
				document.mozFullScreenElement ||
				document.webkitFullscreenElement ||
				document.msFullscreenElement) {

				return true;
			}

			return false;
		},

		/**
		 * Update the 'fullscreen' class on <html> based on
		 * the given state (true/false).
		 * 
		 * @param bool value Whether we are in fullscreen or not
		 */
		update: function(value) {
			if (typeof value == 'undefined') {
				value = this.active();
			}

			if (value) {
				$('html').addClass('fullscreen');
			} else {
				$('html').removeClass('fullscreen');
			}
		}
	}
};

window.api = api;
module.exports = api;

api.init();
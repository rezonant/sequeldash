var persistence = require('./persistence.js');

/**
 * Provides an API to manipulate sequeldash's Favorites 
 * @type api.recents
 */
module.exports = {
	init: function()
	{
		var self = this;
		setTimeout(function() {
			self.get().then(function(endpoints) {
				for (var i = 0, max = endpoints.length; i < max; ++i) {
					var endpoint = endpoints[i];
					self.getSession(endpoint.url);	
				}
			});
		}, 100);
	},


	__sessions: {},

	getSession: function(url)
	{
		if (this.__sessions[url])
			return this.__sessions[url];

		// Start a new session

		var session = {
			url: url,
			status: 'pending',
			errorMessage: ''
		};

		this.__sessions[url] = session;

		var updateStatusUI = function() {
			var $scope = $(document).scope();
			console.log(session);
			if ($scope) {
				if (!$scope.endpointSessions)
					$scope.endpointSessions = {};

				$scope.endpointSessions[url] = {
					connected: session.status == 'connected',
					disconnected: session.status == 'disconnected',
					pending: session.status == 'pending',
					status: session.status
				};
			}
		};

		console.log('connecting to endpoint '+url);
		$.post(url+"/endpoint/status", {

		}, function(r) {
			if (r.error) {
				session.status = 'error';
				session.errorMessage = r.message;
				updateStatusUI();
				return;
			}

			session.status = 'connected';
			session.errorMessage = '';
			updateStatusUI();
		}, 'json').error(function(e) {
			session.status = 'disconnected';
			session.errorMessage = "Failed to connect";
			updateStatusUI();
		});

		return session;
	},

	/**
	 * Get all endpoints
	 * 
	 * @returns {Promise}
	 */
	get: function()
	{
		return new Promise(function(resolve, reject) {
			var data = persistence.data().then(function(data) {
				if (!data.endpoints)
					resolve([]);

				resolve(data.endpoints);
			}).catch(function(e) {
				reject(e);
			});
		});
	},

	/**
	 * Clear all favorites
	 * 
	 * @returns {Promise}
	 */
	clear: function()
	{
		return persistence.data().then(function(data) {
			data.endpoints = [];
			persistence.save(data);
			return data.endpoints;
		});
	},
	
	/**
	 * Add an endpoint
	 * 
	 * @param string url
	 * @param string name
	 * @returns {Promise}
	 */
	add: function(url, name)
	{
		var self = this;
		return this.remove(url).then(function() {
			return persistence.data();
		}).then(function(data) {
			
			if (!data.endpoints)
				data.endpoints = [];

			data.endpoints.push({
				name: name,
				url: url
			});
			
			console.log('finished adding endpoint.');
			
			persistence.save(data);
			$(document).scope().$apply();

			return self.getSession(url);
		});
	},
	
	/**
	 * Remove a recent item
	 * 
	 * @param string url
	 * @returns {Promise}
	 */
	remove: function(url)
	{
		return persistence.data().then(function(data) {
			if (!data.endpoints)
				data.endpoints = [];
			var endpoints = [];

			for (var i = 0, max = data.endpoints.length; i < max; ++i) {
				var endpoint = data.endpoints[i];

				if (endpoint.url == url)
					continue;

				endpoints.push(endpoint);
			}

			data.endpoints = endpoints;
			persistence.save(data);
			
			return {
				error: '',
				message: 'Success'
			};
		});
	}
};

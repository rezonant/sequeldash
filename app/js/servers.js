var persistence = require('./persistence.js');

/**
 * Provides an API to manipulate sequeldash's Favorites 
 * @type api.recents
 */
module.exports = {
	/**
	 * Get all servers
	 * 
	 * @returns {Promise}
	 */
	get: function()
	{
		return new Promise(function(resolve, reject) {
			var data = persistence.data().then(function(data) {
				if (!data.servers)
					resolve([]);

				resolve(data.servers);
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
			data.servers = [];
			persistence.save(data);
			return data.servers;
		});
	},
	
	/**
	 * Add a recent item
	 * 
	 * @param string url
	 * @param string name
	 * @returns {Promise}
	 */
	add: function(url, name)
	{
		return persistence.data().then(function(data) {
			
			if (!data.servers)
				data.servers = [];

			data.servers.push({
				name: name,
				url: url
			});
			
			console.log('finished adding favorite.');
			
			persistence.save(data);
			return data.servers;
		});
	},
	
	/**
	 * Remove a recent item
	 * 
	 * @param string url
	 * @returns {Promise}
	 */
	remove: function(id)
	{
		return persistence.data().then(function(data) {
			if (!data.servers)
				data.servers = [];
			var servers = [];

			for (var i = 0, max = data.servers.length; i < max; ++i) {
				var server = data.servers[i];

				if (server.id == id)
					continue;

				servers.push(server);
			}

			data.servers = servers;
			persistence.save(data);
			
			return {
				error: '',
				message: 'Success'
			};
		});
	}
};

var persistence = require('./persistence.js');

/**
 * Provides an API to manipulate sequeldash's Recents 
 * @type api.recents
 */
module.exports = {
	
	/**
	 * Get all recents.
	 * 
	 * @returns {Promise}
	 */
	get: function()
	{
		return new Promise(function(resolve, reject) {
			var data = persistence.data().then(function(data) {
				if (!data.recents)
					resolve([]);

				resolve(data.recents);
			}).catch(function(e) {
				reject(e);
			});
		});
	},
	
	/**
	 * Clear all recents.
	 * 
	 * @returns {Promise} Resolved upon completion
	 */
	clear: function()
	{
		return persistence.data.then(function(data) {
			data.recents = [];
			persistence.save(data);
			return data.recents;
		});
	},
	
	/**
	 * Add an item to the recents
	 * 
	 * @param string url The URL of the favorite item
	 * @param string name The name of the favorite item
	 * @returns {Promise}
	 */
	add: function(url, name)
	{
		return persistence.data().then(function(data) {
			if (!data.recents)
				data.recents = [];

			data.recents.push({
				name: name,
				url: url
			});

			persistence.save(data);
			return {
				message: 'Success'
			};
		});
	},
	
	/**
	 * Remove an item from the recents
	 * 
	 * @param string url The URL to remove
	 * @returns {Promise}
	 */
	remove: function(url)
	{
		return persistence.data().then(function(data) {
			if (!data.recents)
				data.recents = [];
			var recents = [];

			for (var i = 0, max = data.recents.length; i < max; ++i) {
				var recent = data.recents[i];

				if (recent.url == url)
					continue;

				recents.push(recent);
			}

			data.recents = recents;
			persistence.save(data);
			return {
				message: 'Success'
			};
		});
	}
};
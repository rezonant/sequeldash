var persistence = require('./persistence.js');

/**
 * Provides an API to manipulate sequeldash's Favorites 
 * @type api.recents
 */
module.exports = {
	/**
	 * Get all favorites
	 * 
	 * @returns {Promise}
	 */
	get: function()
	{
		return new Promise(function(resolve, reject) {
			var data = persistence.data().then(function(data) {
				if (!data.favorites)
					resolve([]);

				resolve(data.favorites);
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
			data.favorites = [];
			persistence.save(data);
			return data.favorites;
		});
	},
	
	isFavorited: function(url)
	{
		return this.get().then(function(favs) {
			for (var i = 0, max = favs.length; i < max; ++i) {
				var fav = favs[i];
				
				if (fav.url == url) {
					return true;
				}
			}
			
			return false;
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
		console.log('adding favorite "'+name+'" with url: '+url);
		return this.isFavorited(url).then(function(favorited) {
			if (favorited) {
				console.log('already favorited "'+name+'" with url: '+url);
				console.log('skipping.');
				return;
			}
			
			return persistence.data();
		}).then(function(data) {
			
			if (!data.favorites)
				data.favorites = [];

			data.favorites.push({
				name: name,
				url: url
			});
			
			console.log('finished adding favorite.');
			
			persistence.save(data);
			return data.favorites;
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
			if (!data.favorites)
				data.favorites = [];
			var favs = [];

			for (var i = 0, max = data.favorites.length; i < max; ++i) {
				var fav = data.favorites[i];

				if (fav.url == url)
					continue;

				favs.push(fav);
			}

			data.favorites = favs;
			persistence.save(data);
			
			return {
				error: '',
				message: 'Success'
			};
		});
	}
};
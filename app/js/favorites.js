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
		return this.isFavorited(url).then(function(favorited) {
			if (favorited) {
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
	
	setNoCandidate: function() {
		if (!$(document).scope())
			return;
		$(document).scope().favoriteCandidate = {available: false};
	},
	
	/**
	 * Set the current favorite candidate (for "Add Favorite" UI)
	 * @returns {undefined}
	 */
	setCandidate: function(name, url)
	{
		return this.get().then(function(favs) {
			var available = true;
			for (var i = 0, max = favs.length; i < max; ++i) {
				var fav = favs[i];
				if (fav.url == url) {
					available = false;
					break;
				}
			}
			
			try {
				var $globalScope = $('html').scope();
				if ($globalScope) {
					$globalScope.$apply(function($globalScope) {
						$globalScope.favoriteCandidate = {
							available: available,
							name: name,
							url: url
						};
					});	
				}
			} catch (e) {
				alert('Error!');
				console.error('Error!');
				console.log(e);
			}
			
			return true;
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
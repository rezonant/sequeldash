/**
 * Persistence module
 * 
 * (C) 2014 sequeldash
 */

module.exports = {
	plugin: null,
	__data: null,
	__watchers: [],
	
	watch: function(callback) {
		this.__watchers.push(callback);
	},
	
	_fireWatch: function(data) {
		for (var i = 0, max = this.__watchers.length; i < max; ++i) {
			var watcher = this.__watchers[i];
			watcher(data);
		}
	},
	
	/**
	 * Save the data onto the underlying storage mechanism.
	 * Defaults to localStorage unless plugin is defined.
	 * 
	 * @param object data
	 * @return bool Whether successful
	 */
	save: function(data)
	{
		var self = this;
		
		if (!data)
			throw "You must pass the persisted data object";
		
		(function() {
			if (this.plugin) {
				return this.plugin.persistData(data);
			} else {
				return new Promise(function(resolve, reject) {
					window.localStorage.sequeldash = JSON.stringify(data);
					resolve();
				});
			}
		})()
		.then(function() {
			self._fireWatch(data);
			return {error: '', message: 'Success'};
		})
		.catch(function(e) {
			alert('Error occurred while persisting data.');
			console.log('Error occurred while persisting data.');
			console.log(e);
		});
	},
	
	/**
	 * Retrieve the global persisted data. You can modify the object and that
	 * will be visible to all callers immediately, and persisted after 
	 * next save().
	 */
	data: function()
	{
		if (this.plugin)
			return this.plugin.readData();
		
		var self = this;
		return new Promise(function(resolve, reject) {
			if (self.__data)
				resolve(self.__data);

			if (!window.localStorage) {
				console.log('Warning: No support/polyfill for localStorage. Filling with object.');
				window.localStorage = {};
			}
			
			if (!window.localStorage.sequeldash) {
				window.localStorage.sequeldash = "{}";
			}
			
			try {
				self.__data = JSON.parse(window.localStorage.sequeldash);
				
				if (self.__data == null) {
					window.localStorage.sequeldash = "{}";
					self.__data = {};
				}
				
			} catch (e) {
				self.__data = null;
				
				console.log('Failed to parse localStorage.sequeldash: ');
				console.log(window.localStorage.sequeldash);
				reject(e);
			}

			if (!self.__data)
				self.__data = {};

			resolve(self.__data);
		});
	}
};
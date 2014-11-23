var persistence = require('./persistence.js');

/**
 * Provides the settings API for the rest of the application.
 * Persists to localStorage.sequeldash.settings by default.
 * Accepts a plugin which can reimplement all behaviors.
 * 
 * @type type
 */
module.exports = {
	plugin: null,
	
	getAll: function()
	{
		if (this.plugin)
			return this.plugin.getAll();
		
		return persistence.data().then(function(data) {
			return data.settings;
		});
	},

	getDefault: function(name) {
		return '';
	},
	
	get: function(name)
	{
		if (this.plugin)
			return this.plugin.get(name);
		
		var self = this;
		return persistence.data().then(function(data) {
			if (data.settings[name])
				return data.settings[name];
			return self.getDefault(name);
		});
	},
	
	set: function(name, value)
	{
		if (this.plugin)
			return this.plugin.set(name, value);
		
		return persistence.data().then(function(data) {
			data.settings[name] = value;
			return true;
		});
	},
};

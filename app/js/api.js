
/**
 * Defines the SequelDash Javascript backend access API
 */
var api = {
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
	}
};

window.api = api;
module.exports = api;

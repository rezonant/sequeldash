
var api = {
	db: function(name) {
		this.query = function(sql, params)
		{
			return new Promise(function(resolve, reject) {
				$.post('../api.v1/dbs/'+name+'/query', {
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

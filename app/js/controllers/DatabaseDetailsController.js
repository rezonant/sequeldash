/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

var api = require('../api.js');

angular
	.module('sequeldash')
	.controller('DatabaseDetailsController', ['$scope', '$http', function($scope) {
		$scope.database = {name: '', tables: []};
		api.app.loadHash($scope).then(function() {
			var url = '#/dbs/'+$scope.database.name;
			var name = $scope.database.name;
			favorites.setCandidate(name, url);
			recents.add(url, name);
		}).catch(function(e) {
			console.log('Caught exception:');
			console.log(e);
			throw e;
		});
	}]);
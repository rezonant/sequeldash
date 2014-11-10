/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

var api = require('../api.js');

angular
	.module('sequeldash')
	.controller('TableDetailsController', ['$scope', '$http', function($scope) {
		$scope.query = {};
		$scope.database = '';
		$scope.table = {name: '', schema: []};
		
		api.app.loadHash($scope).then(function() {
			var url = '#/dbs/'+$scope.database.name+'/tables/'+$scope.table.name;
			var name = $scope.database.name+'.'+$scope.table.name;
			api.favorites.setCandidate(name, url);
			api.recents.add(url, name);
		});
	}]);


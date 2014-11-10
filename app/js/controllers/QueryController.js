/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

angular.module('sequeldash')
	.controller('QueryController', ['$scope', '$http', function($scope) {
		api.favorites.setNoCandidate();
		$scope.query = {};
		$scope.database = '';
		$scope.table = '';
		self.loadHash($scope);
	}]);
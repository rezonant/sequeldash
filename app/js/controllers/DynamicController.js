/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

var api = require('../api.js');
angular.module('sequeldash')
	.controller('DynamicController', ['$scope', '$http', function($scope) {
		api.favorites.setNoCandidate();
		api.app.loadHash($scope);
	}]);
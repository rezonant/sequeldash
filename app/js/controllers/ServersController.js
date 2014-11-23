/**
 * SEQUELDASH (C) 2014
 * MIT License, see LICENSE.txt for details
 */

var api = require('../api.js');

angular
	.module('sequeldash')
	.controller('ServersController', ['$scope', '$http', function($scope) {
		api.favorites.setNoCandidate();
		$scope.servers = [
			{
				name: 'Localhost',
				id: 'localhost',
				hostname: 'aether.tirrin.com',
				endpoint: '/sequeldash/api.v2'
			},
			{
				name: 'Development Server',
				id: 'dev1',
				hostname: 'dev.sequeldash.org',
				endpoint: 'dev.sequeldash.org/sql',
				syncSource: 'http://sequeldash.org/'
			},
			{
				name: 'Production 1',
				id: 'prod1',
				hostname: 'db1.sequeldash.org',
				endpoint: 'dev.sequeldash.org/sql',
				syncSource: 'http://sequeldash.org/'
			},
			{
				name: 'Production 2',
				id: 'prod2',
				hostname: 'db2.sequeldash.org',
				endpoint: 'web1.sequeldash.org',
				syncSource: 'http://sequeldash.org/'
			}
		];
	}]);

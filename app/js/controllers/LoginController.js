
angular
	.module('sequeldash')
	.controller('LoginController', 
		['$scope', '$routeParams', 
		function($scope, $routeParams) {
			
			$scope.submitForm = function() {
				api .login($scope.username, $scope.password)
					.then(function(r) {
						console.log('Successful login');
						console.log(r);
						window.location.hash = '#'+r.url;
					}) 
					.catch(function(r) {

						console.log('Failed login');
						console.log(r);
						
						alert('Error: '+r.message);
					});
			};
		}]);
$(document).ready(function() {

	// Make sure we have a state
	if (!window.$state) {
		console.log('Error: No state provided.');
		alert('An application error has occurred: No state provided');
		return;
	}

	// Apply it
	var $scope = $('html').scope();
	for (var key in $state)
		$scope[key] = $state[key];
	
	$scope.startup = false;
	$scope.$apply();
});


window.user = {
	navigates: function(hash) {
	   return new Promise(function(resolve, reject) {
			window.location.hash = '#'+hash;
			
			
			var finished;
			finished = function() {
				resolve();
				document.removeEventListener(finished);
			};

			document.addEventListener('page-ready', finished);
		});
	},

	clicks: function(selector) {
		$(selector).click();
	},

	changes: function(selector, value) {
		$(selector).prop('value', value);
	}
}

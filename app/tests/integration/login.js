/**
 * Test a login interaction
 */
document.addEventListener('polymer-ready', function() {

	user
		.navigates('/login')
		.then(function() {
			user.changes('#username', 'test');
			user.changes('#password', 'pwd4test');
			user.clicks('#login');
		});

	window.location.hash = '#/login';
});


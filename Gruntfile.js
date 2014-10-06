module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
	css: {
		src: [
			'components/prism/themes/prism.css',
			'components/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css'
		],

		dest: 'app/css/platform.css'
	}
    },

    browserify: {
	options: {
		browserifyOptions: {
			debug: true
		}
	},

	app: {
		src: [
			'js/entry.js'
		],

		dest: 'app/js/app.js'
	}
    },
 
    watch: {
    	browserify: {
		files: [
			'Gruntfile.js',
			'js/**/*.js'
		],
		tasks: ['browserify', 'uglify'],
		options: {
			reload: true,
			
		}
	}
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
	compress: false,
	mangle: false,
	beautify: false
      },
      platform: {
        src: [
		'js/html5shiv.js',
		'js/promise-1.0.0.min.js',
		'js/respond.min.js',
		'components/jquery/dist/jquery.js',
		'js/jquery.animate-colors.min.js',
		'components/angular/angular.js',
		'components/moment/moment.js',
		'components/bootstrap/dist/js/bootstrap.js',
		'components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
		'components/prism/prism.js',
		'components/prism/components/prism-sql.js',
	],
        dest: 'app/js/platform.min.js'
      },
      app: {
	src: [
		'app/js/app.js'
	],
	dest: 'app/js/app.min.js'
      },
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Default task(s).
  grunt.registerTask('default', ['browserify', 'uglify', 'concat']);

};

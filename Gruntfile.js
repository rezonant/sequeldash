module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    chmod: {
	options: {

	},

	readable: {
		src: [
			'app/js/*.js', 
			'app/js/ace/*.js',
			'app/css/*.css',
		],
		options: {
			mode: '644'
		}
	}
    },

    concat: {
	platformCss: {
		src: [
			'components/prism/themes/prism.css',
			'components/bootstrap/dist/css/bootstrap.css',
			'components/bootstrap/dist/css/bootstrap-theme.css',
			'components/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
		],

		dest: 'app/build/css/platform.css'
	},

	appCss: {
		src: [
			'app/css/style.css'
		],

		dest: 'app/build/css/app.css'
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

		dest: 'app/build/js/app.js'
	}
    },

    shell: {
        perms: {
		command: 'chmod go-w,a+rX app components -Rf'
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
		'components/platform/platform.js',
		'components/jquery/dist/jquery.js',
		'js/jquery.animate-colors.min.js',
		'js/jquery.rezonant.js',
		'components/angular/angular.js',
		'components/moment/moment.js',
		'components/bootstrap/dist/js/bootstrap.js',
		'components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
		'components/prism/prism.js',
		'components/prism/components/prism-sql.js',
	],
        dest: 'app/build/js/platform.min.js'
      },
      app: {
	src: [
		'app/build/js/app.js'
	],
	dest: 'app/build/js/app.min.js'
      },
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-chmod');
  grunt.loadNpmTasks('grunt-shell');

  // Default task(s).
  grunt.registerTask('default', ['browserify', 'uglify', 'concat', 'shell']);

};

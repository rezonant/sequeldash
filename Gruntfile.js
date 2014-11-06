module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

	vulcanize: {
		default: {
			options: {
				inline: true
			},

			files: {
				'app/index.html': 'app/app.html'
			}
		}
	},

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
				'app/build/components/prism/themes/prism.css',
				'app/build/components/bootstrap/dist/css/bootstrap.css',
				'app/build/components/bootstrap/dist/css/bootstrap-theme.css',
				'app/build/components/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
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
			'app/js/entry.js'
		],

		dest: 'app/build/js/app.js'
	}
    },

    shell: {
        perms: {
		command: 'chmod go-w,a+rX app -Rf'
	}
    },
 
    watch: {
    	browserify: {
		files: [
			'Gruntfile.js',
			'app/js/**/*.js',
			'app/elements/*.html',
			'app/html/**/*.html',
			'app/css/**/*.css',
			'app/app.html'
		],
		tasks: ['browserify', 'uglify', 'concat', 'shell', 'vulcanize'],
		options: {
			reload: true
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
		'app/js/html5shiv.js',
		'app/js/promise-1.0.0.min.js',
		'app/js/respond.min.js', 
		'app/build/components/platform/platform.js',
		'app/build/components/jquery/dist/jquery.js',
		'app/js/jquery.animate-colors.min.js',
		'app/js/jquery.rezonant.js',
		'app/build/components/angular/angular.js',
		'app/build/components/angular-route/angular-route.js',
		'app/build/components/moment/moment.js',
		'app/build/components/bootstrap/dist/js/bootstrap.js',
		'app/build/components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
		'app/build/components/prism/prism.js',
		'app/build/components/prism/components/prism-sql.js',
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
  grunt.loadNpmTasks('grunt-vulcanize');

  // Default task(s).
  grunt.registerTask('default', ['browserify', 'uglify', 'concat', 'shell', 'vulcanize']);

};

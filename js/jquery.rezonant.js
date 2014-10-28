        /**
         * This one is awesome. Just jumps into the shadow DOM of the selected element(s) and
         * applies the given selector using querySelectAll. Returns a jQuery object for chaining.
         * Have fun!
         *
         * @param string selector The CSS selector to search within the shadow DOM for
         * @returns jQuery
         */
        jQuery.fn.shadow = function(selector) {
		var element = $(this).get(0);
		if (!element.shadowRoot)
			return null;
                return $(element.shadowRoot.querySelectorAll(selector)); 
        };

        jQuery.fn.mutate = function(type, options, callback) {
                $(this).each(function() {
                        var finalOptions = {};

                        // Variable arguments: mutate(callback)
                        if (typeof type === 'function' && typeof options === 'undefined') {
                                callback = type;
                                type = "all";
                        } else if (typeof options == 'function' && typeof callback === 'undefined') {
                                callback = options;
                                options = null;
                        } else if (typeof type == 'object' && typeof options == 'function') {
                                callback = options;
                                options = type;
                                if (options.type)
                                        type = options.type;
                                else
                                        type = 'all';
                        } else if (typeof type == 'string' && typeof options == 'function') {
                                callback = options;
                                options = null;
                        }

                        if (options) {
                                for (var key in options)
                                        finalOptions[key] = options[key];
                        }

                        // Modes

                        if (type == "all") {
                                finalOptions.childList = true;
                                finalOptions.subtree = true;
                                finalOptions.attributes = true;
				finalOptions.attributeOldValue = true;
                                finalOptions.characterData = true;
                        } else if (type == "attributes") {
                                finalOptions.attributes = true;
				finalOptions.attributeOldValue = true;
                        } else if (type == "characterData") {
                                finalOptions.characterData = true;
                        } else {
                                throw new "Undefined mutation event type '"+type+"'";
                        }
                        var self = this;
                        var observer = new MutationObserver(function(records, obs) {
                                callback.apply(self, arguments);
                        });
                        observer.observe(this, finalOptions);
                });
        };

        jQuery.fn.hasAttr = function(name) {
                return typeof $(this).attr(name) !== 'undefined';
        };


	jQuery.fn.extractRow = function() {
		var row = $(this).data('resultRow');
		if (row)
			return resultRow;

		row = {};

		if ($(this).data('pkey'))
			row.__primaryKey = $(this).data('pkey');
		if ($(this).data('id'))
			row.__id = $(this).data('id');

		row.__table = $(this).parents('table:first').data('table');
		row.__proposed = {};
		row.__unsaved = $(this).hasClass('unsaved');
		row.getProposed = function() {
			var clone = {};
			for (var name in this.__proposed) {
				if (name.indexOf('__') == 0)
					continue;
				if (typeof this.__proposed[name] == 'function')
					continue;

				clone[name] = this.__proposed[name];
			}

			return clone;

		}

		row.getData = function() {
			var clone = {};
			for (var name in this) {
				if (name.indexOf('__') == 0)
					continue;
				if (typeof this[name] == 'function')
					continue;

				clone[name] = this[name];
			}

			return clone;
		}

		$(this).find('td').each(function() {
			var key = $(this).data('key');
			var value = $(this).data('value');
			var proposedValue = $(this).data('proposedValue');

			if (!key)
				return;

			row[key] = value;
			if (proposedValue)
				row.__proposed[key] = proposedValue;
		});

		return row;
	}


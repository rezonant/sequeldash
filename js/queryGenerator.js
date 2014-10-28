/** Assertions  **/

// Query generation
var queryGenerator = {
	updatePkey: function(table, pkey, id, data)
	{
		var criteria = {};
		criteria[pkey] = id;
		return this.update(table, criteria, data);
	},

	update: function(table, criteria, data)
	{
		var sql = "UPDATE `"+table+"` \nSET \n";
		var parts = [];
		for (var key in data) {
			var value = data[key];
			parts.push('  `'+key+'` = "'+(value+"").replace(/"/g, '""')+'"');
		}

		sql += parts.join(", \n")+" \n";
		sql += "WHERE \n";
		parts = [];
		for (var key in criteria) {
			var value = criteria[key];
			parts.push('  `'+key+'` = "'+(value+"").replace(/"/g, '""')+'"');
		}
		sql += parts.join(" \n  AND ")+" \n";
		return sql;
	},

	select: function(table, selection, criteria, order, page)
	{
		var sql = "SELECT ";

		if (selection) {
			var groomedSelection = [];
			for (var i in selection) {
				var item = selection[i];

				if (item.match(/^[A-Za-z0-9]+$/)) {
					item = '`'+item+'`';
				}

				groomedSelection.push(item);
			}
		
			selection = groomedSelection;
		}

		if (!selection || selection.length == 0)
			sql += '* ';
		else if (selection.length == 1)
			sql += selection[0]+" ";
		else
			sql += "\n  "+selection.join(", \n  ")+" \n";

		if (!table && criteria) {
			throw "Must specify a table if criteria is specified";
		}

		if (table) {
			if (!selection || selection.length <= 1)
				sql += "FROM `"+table+"` \n";
			else
				sql += "FROM\n  `"+table+"` \n";
		}

		if (criteria) {
			sql += "WHERE ";
			var parts = [];
			for (var field in criteria) {
				parts.push('  `'+field+'` = "'+(criteria[field]+"").replace(/"/g, '""')+'"');
			}

			if (parts.length == 1)
				sql += parts[0]+" \n";
			else
				sql += " \n"+parts.join(" AND \n")+" \n";
		}

		if (order) {
			sql += "ORDER BY ";
			var parts = [];
			for (var field in order) {
				parts.push('`'+field+'` '+(order[field].toLowerCase() == "asc" ? "ASC" : "DESC"));
			}
			
			if (parts.length == 1)
				sql += parts[0]+" \n";
			else
				sql += " \n"+parts.join(", \n")+" \n";
		}

		if (page) {
			sql += "LIMIT "+page.limit;

			if (page.offset)
				sql += " OFFSET "+page.offset;	
		}
		return sql.replace(/^\n|\n$/mg, "")+" \n";
	}
};

module.exports = queryGenerator;

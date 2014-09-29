<?php

namespace SequelDash;

require_once dirname(__FILE__).'/View.functions.php';

class View {
	private static $view;

	public static function getCurrentView()
	{
		return self::$view;
	}

	public static function init($view = NULL)
	{
		if ($view) {
			self::$view = $view;		
		}
	}
}

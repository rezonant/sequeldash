<?php

function ngBind($name, $default = '', $view = NULL)
{
	if (!$view)
		$view = \SequelDash\View::getCurrentView();
	$model = $view->viewModel();
	$parts = explode('.', $name);
	$value = $model;
	
	foreach ($parts as $part) {
		if (!isset($value->$part)) {
			$value = null;
			break;
		}

		$value = $value->$part;
	}

	if ($value === NULL) {
		$value = $default;
	}

        return '<span ng-bind="'.$name.'">'.$value.'</span>';
}

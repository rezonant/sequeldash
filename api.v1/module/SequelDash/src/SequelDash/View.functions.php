<?php

function ngBind($name, $default = '', $view = NULL)
{
	if (!$view)
		$view = \SequelDash\View::getCurrentView();
	$model = $view->viewModel()->getCurrent();
	$parts = explode('.', $name);
	$value = $model;

	foreach ($parts as $part) {
		if (is_array($value)) {
			if (!isset($value[$part])) {
				$value = null;
				break;
			}
			$value = $value[$part];
		} else {
			if (!isset($value->$part)) {
				$value = null;
				break;
			}
	
			$value = $value->$part;
		}
	}

	if ($value === NULL) {
		$value = $default;
	}

        return '<span ng-bind="'.$name.'">'.$value.'</span>';
}

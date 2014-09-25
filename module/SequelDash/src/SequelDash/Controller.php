<?php

namespace SequelDash;

use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;

class Controller extends AbstractActionController {
	function model($data = array())
	{
		$data = (object)$data;
		$stateProvider = new StateProvider;
		$stateProvider->prepare($data);
		return new ViewModel($data);
	}
}

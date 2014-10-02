<?php

namespace SequelDash;

use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;

class Controller extends AbstractActionController {
	function model($data = array())
	{
		$data = (object)$data;
		$stateProvider = new StateProvider;
		$data->state = new \stdclass;
		$stateProvider->prepare($data->state);

		if (isset($_REQUEST['ajax'])) {
//			header('Content-Type: application/x-json');
			die(json_encode($data));
		}

		return new ViewModel((array)$data);
	}

	function serviceError($message, $additional = array())
	{
		$data = (object)array(
			'error' => true,
			'message' => $message
		);

		if ($additional)
			$data += $additional;
		
		header('Content-Type: application/x-json');
		die(json_encode($data));
	}

	function serviceResponse($data)
	{
		$data = (object)$data;

		if (!isset($data->error))
			$data->error = false;
		if (!isset($data->message))
			$data->message = 'Success';
		
		header('Content-Type: application/x-json');
		die(json_encode($data));
	}

	function redirect($url)
	{
		header('Location: '.$this->getRequest()->getBasePath().$url);
		die();
	}
}

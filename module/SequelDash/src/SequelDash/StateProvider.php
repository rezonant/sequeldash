<?php

namespace SequelDash;

class StateProvider {
	public function prepare($data, $controller)
	{
		$data->loggedIn = SessionManager::isLoggedIn();
		$data->username = null;
		$data->service = null;
		$data->basePath = $controller->getRequest()->getBasePath();

		if ($data->loggedIn) {
			if (SessionManager::getCredential())
				$data->username = SessionManager::getCredential()->username;
			$connector = Db\Connector::getConnector(SessionManager::getCredential());
			
			$data->service = $connector->getServiceState();
		}
	}
}

<?php

namespace SequelDash;

class StateProvider {
	public function prepare($data, $request)
	{
		$data->loggedIn = SessionManager::isLoggedIn();
		$data->username = null;
		$data->service = null;
		$data->basePath = $request->getBasePath();

		if ($data->loggedIn) {
			if (SessionManager::getCredential()) 
				$data->username = SessionManager::getCredential()->username;
			$connector = Db\Connector::getConnector(SessionManager::getCredential());
			
			$data->hostname = Db\Connector::getActiveHostname();
			$data->service = $connector->getServiceState();
		}
	}
}

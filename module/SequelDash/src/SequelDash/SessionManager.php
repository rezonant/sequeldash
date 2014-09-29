<?php

namespace SequelDash;
class SessionManager {
	public static function setLoggedIn($loggedIn, $credential)
	{
		$container = new \Zend\Session\Container('auth');
		$container->loggedIn = $loggedIn;
		self::setCredential($credential);
	}

	public static function isLoggedIn()
	{
		$container = new \Zend\Session\Container('auth');
		return isset($container->loggedIn) ? $container->loggedIn : false;
	}

	public static function validate($username, $password)
	{
		$credential = new Credential($username, $password);
		$connector = Db\Connector::getConnectorWithCredentials($credential);
		try {
			if ($connector->connect()) {
				return true;
			}
		} catch (\Exception $e) {
			return $e->getMessage();
		}

		return false;
	}

	public static function getCredential()
	{
		$container = new \Zend\Session\Container('auth');
		if (!isset($container->credential) || !$container->credential)
			return null;
		return $container->credential;
	}

	public static function setCredential(Credential $credential = null)
	{
		$container = new \Zend\Session\Container('auth');
		$container->credential = $credential;
	}
}

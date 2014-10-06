<?php

namespace SequelDash\Db;

class Config {
	public $hostname = 'localhost';
	public $connector = 'mysql';

	public function realizeConnector(Credential $credential = null)
	{
		$class = "\SequelDash\Db\{$this->connector}\{$this->connector}Connector";

		return new $class($credential, $this->hostname);
	}

	/**
	 * @return \SequelDash\Db\Config
	 */
	public static function getPrimary()
	{
		$file = dirname(__FILE__).'/../../../../../config/database.config.php';
		if (is_file($file))
			$data = require $file;
		else
			$data = (object)array();

		$config = new self;

		foreach ($data as $k => $v)
			$config->$k = $v;
		return $config;
	}
}

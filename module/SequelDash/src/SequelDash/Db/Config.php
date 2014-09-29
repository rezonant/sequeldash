<?php

namespace SequelDash\Db;

class Config {
	public $hostname;
	public $connector;

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
		$data = require dirname(__FILE__).'/../../../../../config/database.config.php';
		$config = new self;
		foreach ($data as $k => $v)
			$config->$k = $v;
		return $config;
	}
}

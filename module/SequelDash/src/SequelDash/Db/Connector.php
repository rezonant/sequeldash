<?php

namespace SequelDash\Db;
use SequelDash\Credential;
use SequelDash\SessionManager;

abstract class Connector {
	function __construct(Credential $credential = null, $hostname)
	{
		$this->credential = $credential;
		$this->hostname = $hostname;
	}

	private $hostname;
	private $credential;

	public function getTableFromQuery($db, $query)
	{
		$parser = new \PHPSQL\Parser($query);
		$ir = (object)$parser->parsed;

		if (isset($ir->FROM)) {
			foreach ($ir->FROM as $fromArray) {
				$from = (object)$fromArray;
				if ($from->expr_type == 'table')
					return str_replace('`', '', $from->table);
			}
		}

		return null;
		// The following implementation is very troublesome:

		$adapter = $this->getAdapter();

		$adapter->getDriver()->getConnection()->getResource()->select_db($db);
		$results = $adapter->query('EXPLAIN '.$query, \Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		foreach ($results as $row) {
			if (isset($row['table']))
				return $row['table'];
		}
		return null;
	}

	public function getPrimaryKey($db, $table)
	{
		if (!$table)
			return null;

		$schema = $this->getTableSchema($db, $table);
		foreach ($schema as $field) {
			if ($field->isPrimaryKey)
				return $field->name;
		}

		return null;
	}

	public function getCredential()
	{
		if (!$this->credential)
			return null;

		return clone $this->credential;
	}

	public function getHostname()
	{
		return $this->hostname;
	}

	public abstract function getTableSchema($databaseName, $tableName);
	public abstract function getAdapter();
	public abstract function getServiceState();
	public abstract function getDatabases();
	public abstract function getTables($databaseName);
	
	public function connect()
	{
		return $this->getAdapter()->getDriver()->getConnection()->connect();
	}

	public function isConnected()
	{
		return $this->getAdapter()->getDriver()->getConnection()->isConnected();
	}
	
	public static function getConnector()
	{
		return self::getConnectorWithCredentials(SessionManager::getCredential());
	}

	public static function getConnectorWithCredentials($credential = null)
	{
		$class = self::getActiveConnectorClass();
		$hostname = self::getActiveHostname();
		$connector = new $class($credential, $hostname);
		return $connector;
	}

	public static function getActiveHostname()
	{

		$module = new \SequelDash\Module;
		$config = $module->getConfig();
		$hostname = 'localhost';	

		if (isset($config->db->hostname))
			$hostname = $config->db->hostname;

		return $hostname;
	}

	public static function getActiveConnectorClass()
	{
		$module = new \SequelDash\Module;
		$config = $module->getConfig();
		
		$class = 'SequelDash\Db\MySQL\MySQLConnector';

		if (isset($config->db->connector))
			$class = $config->db->connector;
		
		return $class;
	}
}

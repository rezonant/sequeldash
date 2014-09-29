<?php

namespace SequelDash\Db\MySQL;

class MySQLConnector extends \SequelDash\Db\Connector {
	public function getTableSchema($databaseName, $tableName)
	{
		if (!preg_match('/^[A-Za-z0-9_]+$/', $tableName))
			throw new \Exception('Invalid table name \''.$tableName.'\'');

		$adapter = $this->getAdapter();
		if (!$adapter)
			throw new \Exception("No adapter");
		$adapter->getDriver()->getConnection()->getResource()->select_db($databaseName);
		$results = $adapter->query('DESCRIBE `'.$tableName.'`', \Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		$fields = array();
		foreach ($results as $row) {
			$fields[] = (object)array(
				'name' => $row['Field'],
				'type' => $row['Type'],
				'nullable' => $row['Null'] == 'YES',
				'key' => $row['Key'] == 'PRI' ? 'primary'
					: $row['Key'] == 'MUL' ? 'unique'
					: 'none',
				'default' => $row['Default'],
				'hasDefault' => $row['Default'] !== '' && $row['Default'] !== null,
				'increment' => $row['Extra'] == 'auto_increment',
				'isPrimaryKey' => $row['Key'] == 'PRI',
				'isUnique' => $row['Key'] == 'MUL',
				'collation' => '', // TODO
			);
		}

		return $fields;
	}

	public function getServiceState()
	{
		$adapter = $this->getAdapter();
		$driver = $adapter->getDriver();
		$conn = $driver->getConnection();
		$running = false;
		$status = '';
		$pid = '--';
		$ram = '--';

		if ($conn && $conn->isConnected()) {
			$running = true;

			$prop = new \ReflectionProperty(get_class($conn), 'resource');
			$prop->setAccessible(true);
			$mysqli = $prop->getValue($conn);
			$status = $mysqli->stat;
		}

		if (0) {
		$pid = `cat /var/run/mysqld/mysqld.pid 2>&1`;
		//$pid = `netstat -lnp 2>/dev/null | grep /var/run/mysqld/mysqld.sock | grep '^unix' \
		//        | sed 's/.* LISTENING *//g' | cut -d' ' -f1`;
		die($pid);
		$ram = `top -n 1 -b | grep 1332 | sed 's/^ *//g;s/  */ /g' | cut -d' ' -f6`;
		}

		return (object)array(
			'running' => $running,
			'status' => $status,
			'pid' => $pid,
			'ram' => $ram
		);
	}

	private $adapter = null;
	private $driver = 'Mysqli';

	public function getAdapter()
	{
		$credential = $this->getCredential();
		$configArray = array(
			'driver' => $this->driver,
			'hostname' => $this->getHostname(),
		);

		if ($credential) {
			$configArray += array(
				'username' => $credential->username,
				'password' => $credential->password			 
			);
		}

		if (!$this->adapter) {
			$this->adapter = new \Zend\Db\Adapter\Adapter($configArray);
			@$this->adapter->getDriver()->getConnection()->connect();
		}

		return $this->adapter;
	}

	public function getDatabases()
	{
		$adapter = $this->getAdapter();

		if (!$adapter)
			throw new \Exception("Failed to connect to server");
		$databases = array();
		$results = $adapter->query('SHOW DATABASES', \Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		foreach ($results as $row) {
			$databases[] = $row['Database'];
		}

		return $databases;
	}

        public function getTables($databaseName)
	{
		$adapter = $this->getAdapter();

		if (!$adapter)
			throw new \Exception("Failed to connect to server");

		$tables = array();
		$results = $adapter->query('SHOW TABLES FROM `'.$databaseName.'`', 
						\Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);

		foreach ($results as $row) {
			$values = array_values((array)$row);
			$tables[] = $values[0];
		}
		return $tables;
	}


}

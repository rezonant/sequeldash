<?php

namespace SequelDashTest\Db\MySQL;

use SequelDashTest\Bootstrap;
use Zend\Mvc\Router\Http\TreeRouteStack as HttpRouter;
use Application\Controller\IndexController;
use Zend\Http\Request;
use Zend\Http\Response;
use Zend\Mvc\MvcEvent;
use Zend\Mvc\Router\RouteMatch;
use PHPUnit_Framework_TestCase;
use SequelDash\Db\MySQL\MySQLConnector;
use SequelDash\Credential;

class MySQLConnectorTest extends \PHPUnit_Framework_TestCase
{
	protected $connector;
	protected $testDbName = "sequeldash_test";
	protected $testUserName = "sequeldash_test";
	protected $testPassword = "pwd4sd";
	protected $testServer = "localhost";

	protected function setUp()
	{
		$this->connector = new MySQLConnector(
			new Credential($this->testUserName, $this->testPassword),
			$this->testServer);
	}

	public function testConnection()
	{
		$state = $this->connector->getServiceState();
		$this->assertTrue($state->running);
	}

	public function testGetDatabases()
	{
		$dbs = $this->connector->getDatabases();
		$this->assertTrue(count($dbs) >= 1);
	}

	public function testGetTables()
	{
		$tables = $this->connector->getTables($this->testDbName);
		$this->assertTrue(count($tables) >= 1);
	}
}

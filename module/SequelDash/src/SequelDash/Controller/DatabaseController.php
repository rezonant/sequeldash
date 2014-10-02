<?php
/**
 * Zend Framework (http://framework.zend.com/)
 *
 * @link      http://github.com/zendframework/ZendSkeletonApplication for the canonical source repository
 * @copyright Copyright (c) 2005-2014 Zend Technologies USA Inc. (http://www.zend.com)
 * @license   http://framework.zend.com/license/new-bsd New BSD License
 */

namespace SequelDash\Controller;

use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;
use SequelDash\Controller;
use SequelDash\SessionManager;
use SequelDash\Credential;

class DatabaseController extends Controller
{
    public function tableSchemaAction()
    {
	$error = '';
	$route = $this->getEvent()->getRouteMatch();
	$db = $route->getParam('db', null);
	$table = $route->getParam('table', null);

	$connector = \SequelDash\Db\Connector::getConnector();
	$tableNames = $connector->getTables($db);
	$tables = array();
	$adapter = $connector->getAdapter();
	
	$schema = $connector->getTableSchema($db, $table);

	return $this->model(array(
		'breadcrumbs' => array(
			$this->getRequest()->getBasePath().'/' => \SequelDash\Db\Connector::getActiveHostname(),
			$this->getRequest()->getBasePath().'/dbs/'.$db => $db,
			$this->getRequest()->getBasePath().'/dbs/'.$db.'/tables/'.$table => $table,
			$this->getRequest()->getBasePath().'/dbs/'.$db.'/tables/'.$table.'/schema' => 'Schema'
		),
		'error' => $error,
		'database' => array(
			'name' => $db,
			'tables' => $connector->getTables($db),
		),
		'table' => array(
			'name' => $table,
			'schema' => $schema
		),
	));
	
    }

    public function tableSearchAction()
    {
	$route = $this->getEvent()->getRouteMatch();
	$post = $this->getRequest()->getPost();
    	
	$table = $route->getParam('table', null);
	$db = $route->getParam('db', null);

	$connector = \SequelDash\Db\Connector::getConnector();
	$primaryKey = $connector->getPrimaryKey($db, $table);
	$schema = $connector->getTableSchema($db, $table);

	$bp = $this->getRequest()->getBasePath();

	return $this->model(array(
		'breadcrumbs' => array(
			"$bp/" => \SequelDash\Db\Connector::getActiveHostname(),
			"$bp/dbs/$db" => $db,
			"$bp/dbs/$db/tables/$table" => $table,
			"$bp/dbs/$db/tables/$table/search" => 'Search'
		),

		'database' => array(
			'name' => $db,
		),

		'table' => array(
			'name' => $table,
			'primaryKey' => $primaryKey,
			'schema' => $schema,
		),
	));
    }

    /**
     * Handles a query execution POST event from the user interface.
     * URLs for this action are mapped as /dbs/:db/query
     */
    public function queryAction()
    {
	// This action is both an API call and a view page.
	// Both are accessed via POST request.
	// Considered a service call (execution) when POST ajax=1.
	// Considered a markup page otherwise
	//
	// Both paths need to gather all variables, so pay 
	// attention to the ordering of things
	//
	// TODO: Consider refactoring option processing out
	//       and factoring the rest into separate methods

	$route = $this->getEvent()->getRouteMatch();
	$post = $this->getRequest()->getPost();
	$error = null;

	if (!isset($post->query)) {
		$error = 'Invalid request';
	}

	$db = $route->getParam('db', null);
	$query = $post->query;
	$offset = 0;
	$limit = 30;
	$orderBy = '';
	$orderByDir = 'ASC';
	
	if (isset($post->orderBy))
		$orderBy = $post->orderBy;
	if (isset($post->order))
		$orderByDir = $post->order;

	if (isset($post->offset))
		$offset = $post->offset;
	if (isset($post->limit))
		$limit = $post->limit;
	
	if (!$query)
		$error = 'No query provided';

	// Query, if we need to

	if (!$error) {
		$queryData = $this->executeUserQuery($db, $query, $limit, $offset, $orderBy, $orderByDir);
	} else {	
		$queryData = (object)array(
			'string' => $query,
			'error' => $error,
			'verb' => '',
			'offset' => $offset,
			'limit' => $limit,
			'count' => -1,
			'results' => array(),
		);
	}

	// Pass what we have to the view layer if we are doing the markup phase
	// of the request

	$bp = $this->getRequest()->getBasePath();
	return $this->model(array(
		'breadcrumbs' => array(
			"$bp/" => \SequelDash\Db\Connector::getActiveHostname(),
			"$bp/dbs/$db" => "$db",
		),

		'error' => $error,
		'db' => $db,
		'query' => $queryData,
	));
    }

    private function executeUserQuery($db, $query, $limit = 30, $offset = 0, $orderBy = null, $orderByDir = null)
    {
	// Prepare for query

	$connector = \SequelDash\Db\Connector::getConnector();


	if (!$connector)
		$this->serviceError('Failed to acquire database connector');

	$mainTable = $connector->getTableFromQuery($db, $query);
	$primaryKey = $connector->getPrimaryKey($db, $mainTable);

	$adapter = $connector->getAdapter();
	
	if (!$adapter)
		$this->serviceError('Failed to acquire database adapter');

	// Select the database
	$adapter->getDriver()->getConnection()->getResource()->select_db($db);
	
	// Analyze the query to determine the verb (SELECT, UPDATE, INSERT, etc)

	$analysis = new \SequelDash\Db\QueryAnalyzer($query);
	$count = null;

	// SELECT verbs can be pre-executed with a count query, which can hint the best strategy
	// on how to pull results later on

	if ($analysis->verb == 'SELECT') {
		$count_results = $adapter->query("SELECT COUNT(*) AS ct FROM ( $query ) query", \Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		$count = count($count_results);
		foreach ($count_results as $row) {
			$count = $row->ct;
			break;
		}
	}

	$orderByClause = '';

	if ($orderBy) {
		$orderByClause = " ORDER BY `$orderBy` ".(strtolower($orderByDir) == "asc" ? "ASC" : "DESC")." ";
	}

	$qi = function($name) use ($adapter) { return $adapter->platform->quoteIdentifier($name); };
	$fp = function($name) use ($adapter) { return $adapter->driver->formatParameterName($name); };
	$limitClause = '';
	$params = array();

	if ($limit) {
		$limitClause = " LIMIT {$fp('limit')} OFFSET {$fp('offset')} ";
		$params += array(
			'limit' => $limit, 
			'offset' => $offset,
		);
	}

	// Setup the bounded query
	$boundedQuery = $adapter->query( "$query "
					. $limitClause
					. $orderByClause);
	$results = $boundedQuery->execute($params);

	$results->buffer();
	$rows = array();
	foreach ($results as $row) {
		$finalRow = array();

		foreach ($row as $k => $v) {
			$finalRow[$k] = utf8_encode($v);
		}
		$rows[] = $finalRow;
	}

	$queryData = (object)array(
		'string' => $query,
		'table' => $mainTable,
		'primaryKey' => $primaryKey,
		'verb' => $analysis? $analysis->verb : null,
		'offset' => $offset,
		'limit' => $limit,
		'count' => $count,
		'results' => $rows,
	);
	return $queryData;
    }

    public function tableDetailsAction()
    {
	$error = '';
	$route = $this->getEvent()->getRouteMatch();
	$db = $route->getParam('db', null);
	$table = $route->getParam('table', null);

	$connector = \SequelDash\Db\Connector::getConnector();
	$tableNames = $connector->getTables($db);
	$tables = array();
	$adapter = $connector->getAdapter();
	
	$schema = $connector->getTableSchema($db, $table);

	return $this->model(array(
		'breadcrumbs' => array(
			$this->getRequest()->getBasePath().'/' => \SequelDash\Db\Connector::getActiveHostname(),
			$this->getRequest()->getBasePath().'/dbs/'.$db => $db,
			$this->getRequest()->getBasePath().'/dbs/'.$db.'/tables/'.$table => $table
		),
		'error' => $error,
		'database' => array(
			'name' => $db,
			'tables' => $connector->getTables($db),
		),
		'query' => $this->executeUserQuery($db, 'SELECT * FROM `'.$table.'`'),
		'table' => array(
			'name' => $table,
			'schema' => $schema
		),
	));
		
    }

    public function tablesAction()
    {
	$error = '';
	$route = $this->getEvent()->getRouteMatch();
	$db = $route->getParam('db', null);
	$connector = \SequelDash\Db\Connector::getConnector();
	$tableNames = $connector->getTables($db);
	$tables = array();
	$adapter = $connector->getAdapter();

	$adapter->getDriver()->getConnection()->getResource()->select_db($db);
	
	foreach ($tableNames as $tableName) {
		$rows = 0;
		$size = 0;
		
		$result = $adapter->query('SELECT COUNT(*) ct FROM `'.$tableName.'`',
						\Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		foreach ($result as $row) {
			$rows = $row['ct'];
			break;
		}
	
		$tables[] = (object)array(
			'name' => $tableName,
			'rows' => $rows,
			'size' => $size
		);
	}


	return $this->model(array(
		'breadcrumbs' => array(
			$this->getRequest()->getBasePath().'/' => \SequelDash\Db\Connector::getActiveHostname(),
			$this->getRequest()->getBasePath().'/dbs/'.$db => $db,
			$this->getRequest()->getBasePath().'/dbs/'.$db.'/tables' => 'Tables'
		),
		'error' => $error,
		'database' => array(
			'name' => $db,
			'tables' => $tables
		)
	));
	
    }


    public function detailsAction()
    {
	$error = '';
	$route = $this->getEvent()->getRouteMatch();
	$db = $route->getParam('db', null);
	$connector = \SequelDash\Db\Connector::getConnector();
	$tableNames = $connector->getTables($db);
	$tables = array();
	$adapter = $connector->getAdapter();

	$adapter->getDriver()->getConnection()->getResource()->select_db($db);
	
	foreach ($tableNames as $tableName) {
		$rows = 0;
		$size = 0;
		
		$result = $adapter->query('SELECT COUNT(*) ct FROM `'.$tableName.'`',
						\Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
		foreach ($result as $row) {
			$rows = $row['ct'];
			break;
		}
	
		$tables[] = (object)array(
			'name' => $tableName,
			'rows' => $rows,
			'size' => $size
		);
	}


	return $this->model(array(
		'breadcrumbs' => array(
			$this->getRequest()->getBasePath().'/' => \SequelDash\Db\Connector::getActiveHostname(),
			$this->getRequest()->getBasePath().'/dbs/'.$db => $db
		),
		'error' => $error,
		'database' => array(
			'name' => $db,
			'tables' => $tables
		)
	));
	
    }

    public function indexAction()
    {
	$error = 'Huh';
        return $this->model(array(
		'breadcrumbs' => array(),
		'error' => $error
	));
    }
}

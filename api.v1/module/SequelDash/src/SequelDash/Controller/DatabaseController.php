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
			'#/' => \SequelDash\Db\Connector::getActiveHostname(),
			'#/dbs/'.$db => $db,
			'#/dbs/'.$db.'/tables/'.$table => $table,
			'#/dbs/'.$db.'/tables/'.$table.'/schema' => 'Schema'
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
			"#/" => \SequelDash\Db\Connector::getActiveHostname(),
			"#/dbs/$db" => $db,
			"#/dbs/$db/tables/$table" => $table,
			"#/dbs/$db/tables/$table/search" => 'Search'
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
		if (!SessionManager::isLoggedIn()) {
			return $this->model(array(
				'error' => 'unauthorized',
				'redirectTo' => '#/login'
			));
		}
	
		$route = $this->getEvent()->getRouteMatch();
		$post = $this->getRequest()->getPost();
		$error = '';

		$db = $route->getParam('db', null);
		$query = $post->query;

		// Determine if we have multiple queries
		$token = '::@@SEQUELDASH-QUERY-SPLIT@@::';
		$translated = preg_replace('/(;)(?=(?:[^"]|"[^"]*")*$)/x', $token, $query);
		$translated = preg_replace('/(;)(?=(?:[^\']|\'[^\']*\')*$)/x', $token, $query);
		$rawQueries = explode($token, $translated);
		$queries = array();

		foreach ($rawQueries as $q) {
			if (trim($q, "\n\t ") == "")
				continue;
			$queries[] = $q;
		}

		$allQueries = array();
		$wholeQuery = $query;

		if (count($queries) > 1) {
			// Multiple query mode.
			// Execute all but the last one, and leave all paging etc for that one
			for ($i = 0, $max = count($queries) - 1; $i < $max; ++$i) {
				$allQueries[] = $this->executeUserQuery($db, $queries[$i], 1, 0, null, null);
			}

			$query = $queries[count($queries)-1];
		}

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
		
		$queryData = (object)array(
			'string' => $query,
			'error' => $error,
			'verb' => '',
			'offset' => $offset,
			'limit' => $limit,
			'count' => -1,
			'results' => array(),
		);
		
		if ($query) 
			$queryData = $this->executeUserQuery($db, $query, $limit, $offset, $orderBy, $orderByDir);

		$queryData->string = $wholeQuery;

		// Better not to send this. Its redundant. Sucks though kinda
		$allQueries[] = $queryData;

		// Pass what we have to the view layer if we are doing the markup phase
		// of the request

		$bp = $this->getRequest()->getBasePath();
		return $this->model(array(
			'breadcrumbs' => array(
				"#/" => \SequelDash\Db\Connector::getActiveHostname(),
				"#/dbs/$db" => "$db",
			),

			'error' => $error,
			'db' => $db,
			'database' => $db,
			'query' => $queryData,
			'queries' => $allQueries
		));
	}

	private function executeUserQuery($db, $query, $limit = 30, $offset = 0, $orderBy = null, $orderByDir = null)
	{
		// Prepare for query

		$connector = \SequelDash\Db\Connector::getConnector();


		if (!$connector)
			$this->serviceError('Failed to acquire database connector');


		$adapter = $connector->getAdapter();

		if (!$adapter)
			$this->serviceError('Failed to acquire database adapter');

		// Select the database
		$adapter->getDriver()->getConnection()->getResource()->select_db($db);

		// Analyze the query to determine the verb (SELECT, UPDATE, INSERT, etc)

		$analysis = null;
		$verb = '';
		try {
			$analysis = new \SequelDash\Db\QueryAnalyzer($query);
			$verb = $analysis->verb;
		} catch (\Exception $e) {
			throw $e;
			return (object)array(
				'string' => $query,
				'error' => $e->getMessage(),
				'table' => '',
				'primaryKey' => '',
				'verb' => '',
				'offset' => 0+$offset,
				'limit' => 0+$limit,
				'count' => 0,
				'affected' => 0,
				'generatedValue' => '',
				'results' => array()
			);
		}


		$count = null;
		$execMode = false;
		$mainTable = '';
		$primaryKey = '';
		$qi = function($name) use ($adapter) { return $adapter->platform->quoteIdentifier($name); };
		$affectedRows = 0;
		$rows = null;
		$generatedValue = null;

		// SELECT verbs can be pre-executed with a count query, which can hint the best strategy
		// on how to pull results later on

		if ($verb == 'SELECT') {
			try {
				$mainTable = $connector->getTableFromQuery($db, $query);
				$primaryKey = $connector->getPrimaryKey($db, $mainTable);
			} catch (\Exception $e) {
				throw $e;
				return (object)array(
					'string' => $query,
					'error' => $e->getMessage(),
					'table' => '',
					'primaryKey' => '',
					'verb' => '',
					'offset' => 0+$offset,
					'limit' => 0+$limit,
					'count' => 0,
					'affected' => 0,
					'generatedValue' => '',
					'results' => array()
				);
			}

			$count_results = $adapter->query("SELECT COUNT(*) AS ct FROM ( $query ) query", \Zend\Db\Adapter\Adapter::QUERY_MODE_EXECUTE);
			$count = count($count_results);
			foreach ($count_results as $row) {
				$count = $row->ct;
				break;
			}

			$orderByClause = '';
			if ($orderBy) {
				$orderByClause = " ORDER BY `$orderBy` ".(strtolower($orderByDir) == "asc" ? "ASC" : "DESC")." ";
			}
			$limitClause = '';
			if ($limit) {
				$limitClause = " LIMIT $limit OFFSET $offset";
			}

			$finalQuery = "$query $limitClause$orderByClause";
			$boundedQuery = $adapter->query($finalQuery);
			$results = $boundedQuery->execute(array());

			$generatedValue = $results->getGeneratedValue();
			if ($results->isQueryResult()) {
				$results->buffer();
				$rows = array();
				foreach ($results as $row) {
					$finalRow = array();

					foreach ($row as $k => $v) {
						$finalRow[$k] = utf8_encode($v);
					}

					if (isset($row->{$primaryKey})) 
						$finalRow['__id'] = $row->{$primaryKey};
					else
						$finalRow['__id'] = 0;	
					$rows[] = $finalRow;
				}
				$affectedRows = $results->getAffectedRows();
			}
		} else {
			$results = $adapter->query($query, $adapter::QUERY_MODE_EXECUTE);
			if ($results instanceof \Zend\Db\ResultSet\ResultSet) {
				$rows = array();

				foreach ($results as $row) {
					$finalRow = array();
					foreach ($row as $k => $v) {
						$finalRow[$k] = utf8_encode($v);
					}

					$rows[] = $finalRow;
				}
				$affectedRows = count($rows);
			}
		}

		$schema = array();

		if (count($rows) > 0) {
			$first = $rows[0];
			foreach ($first as $k => $v) {
				$schema[] = $k;
			}
		}

		$queryData = (object)array(
			'string' => $query,
			'error' => '',
			'table' => $mainTable,
			'primaryKey' => $primaryKey,
			'verb' => $analysis? $analysis->verb : null,
			'offset' => 0+$offset,
			'limit' => 0+$limit,
			'count' => 0+$count,
			'affected' => $affectedRows,
			'generatedValue' => $generatedValue,
			'schema' => $schema,
			'results' => $rows,
		);
		return $queryData;
    }

    public function tableDetailsAction()
    {
		$error = '';
		$route = $this->getEvent()->getRouteMatch();
		$post = $this->getRequest()->getPost();
		$db = $route->getParam('db', null);
		$table = $route->getParam('table', null);
		$tables = array();
		$queryObject = null;		
		$query = isset($post->query) ? $post->query 
				: 'SELECT * FROM `'.$table.'`';

		try {
			$connector = \SequelDash\Db\Connector::getConnector();
			$schema = $connector->getTableSchema($db, $table);
			$tables = $connector->getTables($db);
			$queryObject = $this->executeUserQuery($db, $query);
		} catch (\Exception $e) {
			$this->renderException($e);
		}
		
		return $this->model(array(
			'breadcrumbs' => array(
				'poop' => 'poop',
				'#/' => \SequelDash\Db\Connector::getActiveHostname(),
				'#/dbs/'.$db => $db,
				'#/dbs/'.$db.'/tables/'.$table => $table
			),
			'error' => $error,
			'database' => array(
				'name' => $db,
				'tables' => $tables,
			),
			'query' => $queryObject,
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
				'#/' => \SequelDash\Db\Connector::getActiveHostname(),
				'#/dbs/'.$db => $db,
				'#/dbs/'.$db.'/tables' => 'Tables'
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

		try {
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
		} catch (\Exception $e) {
			$this->renderException($e);
		}
		
		return $this->model(array(
			'breadcrumbs' => array(
				'#/' => \SequelDash\Db\Connector::getActiveHostname(),
				'#/dbs/'.$db => $db
			),
			'error' => $error,
			'database' => array(
				'name' => $db,
				'tables' => $tables
			)
		));
    }

	private function renderException($e)
	{
		if (preg_match('/^Access denied; /', $e->getMessage())) {
			die(json_encode(array(
				'error' => true,
				'exception' => true,
				'message' => $e->getMessage(),
				'redirectTo' => '/'
			)));
		}
		
		die(json_encode(array(
			'error' => true,
			'exception' => true,
			'message' => $e->getMessage(),
			'exceptionObject' => $e,
			'exceptionRendered' => (string)$e
		)));
	}
	
    public function indexAction()
    {
		if (!SessionManager::isLoggedIn()) {
			return $this->model(array(
				'error' => 'unauthorized',
				'redirectTo' => '#/login'
			));
		}
		
		$connector = \SequelDash\Db\Connector::getConnector();
		if (!$connector)
			$this->redirect('errors/connectionFailed');

		$dbs = array();
		
		foreach ($connector->getDatabases() as $db) {
			$dbs[] = (object)array(
				'name' => $db,
				'size' => '0 kb',
				'tables' => 233
			);
		}
		
		return $this->model(array(
			'breadcrumbs' => array(
				'#/' => \SequelDash\Db\Connector::getActiveHostname(),
			),
			'layoutHero' => true,
			'layoutDashboard' => true,
			'databases' => $dbs
		));
    }
}

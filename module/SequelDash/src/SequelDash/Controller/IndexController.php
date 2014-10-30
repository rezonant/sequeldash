<?php
/**
 * @copyright Copyright (c) 2014 Sequeldash
 */

namespace SequelDash\Controller;

use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;
use SequelDash\Controller;

class IndexController extends Controller
{
    public function indexAction()
    {
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
				$this->getRequest()->getBasePath().'/' => \SequelDash\Db\Connector::getActiveHostname(),
			),
			'layoutHero' => true,
			'layoutDashboard' => true,
			'databases' => $dbs
		));
    }

    public function loginAction()
    {
		die("hokay");
    }
}

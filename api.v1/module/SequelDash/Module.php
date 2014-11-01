<?php
/**
 * Zend Framework (http://framework.zend.com/)
 *
 * @link      http://github.com/zendframework/ZendSkeletonApplication for the canonical source repository
 * @copyright Copyright (c) 2005-2014 Zend Technologies USA Inc. (http://www.zend.com)
 * @license   http://framework.zend.com/license/new-bsd New BSD License
 */

namespace SequelDash;

use Zend\Mvc\ModuleRouteListener;
use Zend\Mvc\MvcEvent;

class Module
{
    public function onBootstrap(MvcEvent $e)
    {
        $eventManager        = $e->getApplication()->getEventManager();
		$serviceManager	     = $e->getApplication()->getServiceManager();
        $moduleRouteListener = new ModuleRouteListener();
        $moduleRouteListener->attach($eventManager);

		$eventManager->attach(MvcEvent::EVENT_DISPATCH, array($this, 'authPreDispatch'), 1);
		$eventManager->attach(MvcEvent::EVENT_DISPATCH_ERROR, array($this, 'dispatchError'), 1);
    }

    public function dispatchError($event) {
		$this->authPreDispatch($event);
    }

    /**
    * Authenticate user or redirect to log in
    */
    public function authPreDispatch($event) {
    	if (!SessionManager::isLoggedIn()) {
			if ($event->getRouteMatch()) {
				$exceptions = array('login');

				if ($event->getRouteMatch()->getParam('__CONTROLLER__') == "login"
					&& $event->getRouteMatch()->getParam("action") == "index")
					return; // let them through

				$url = $event->getRequest()->getRequestUri();
				$url = substr($url, strlen($event->getRequest()->getBasePath()));

				SessionManager::setReturnUrl($url);

				$data = (object)array();
				$data->error = 'unauthorized';
				$data->redirectTo = '#/login';
				$stateProvider = new StateProvider;
				$data->state = new \stdclass;
				$stateProvider->prepare($data->state, $event->getRequest());

				die(json_encode($data));
			}
		}
    }

    public function bootstrapSession(MvcEvent $e)
    {
		$session = $e->getApplication()
                     ->getServiceManager()
                     ->get('Zend\Session\SessionManager');
        $session->start();
		$container = new Container('initialized');
        if (!isset($container->init)) {
             $session->regenerateId(true);
             $container->init = 1;
        }
    }

    public function getConfig()
    {
        return include __DIR__ . '/config/module.config.php';
    }

    public function getAutoloaderConfig()
    {
        return array(
            'Zend\Loader\StandardAutoloader' => array(
                'namespaces' => array(
                    __NAMESPACE__ => __DIR__ . '/src/' . __NAMESPACE__,
                ),
            ),
        );
    }
}

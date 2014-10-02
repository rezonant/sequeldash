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

class LoginController extends Controller
{
    public function logoutAction()
    {
	SessionManager::setLoggedIn(false);
	$this->redirect('/login');
    }

    public function indexAction()
    {
	if (SessionManager::isLoggedIn())
		$this->redirect('/');
	$error = '';

	$post = $this->getRequest()->getPost();
	if ($post->get('username') && $post->get('password')) {
		$error = 'Unknown error';
		$username = $post->get('username');
		$password = $post->get('password');

		$valid = SessionManager::validate($username, $password);
		if ($valid === true) {
			SessionManager::setLoggedIn(true, new Credential($username, $password));
			$this->redirect('/');
		} else {
			$error = $valid;
		}
	}

        return $this->model(array(
		'breadcrumbs' => array(),
		'layout' => array(
			'showLogo' => false
		),
		'error' => $error
	));
    }
}

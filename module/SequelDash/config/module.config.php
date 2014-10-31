<?php
/**
 * Zend Framework (http://framework.zend.com/)
 *
 * @link      http://github.com/zendframework/ZendSkeletonApplication for the canonical source repository
 * @copyright Copyright (c) 2005-2014 Zend Technologies USA Inc. (http://www.zend.com)
 * @license   http://framework.zend.com/license/new-bsd New BSD License
 */

return array(
    'router' => array(
        'routes' => array(
            // The following is a route to simplify getting started creating
            // new controllers and actions without needing to create a new
            // module. Simply drop new controllers in, and you can access them
            // using the path /application/:controller/:action
            'application' => array(
                'type'    => 'Zend\Mvc\Router\Http\Segment',
                'options' => array(
                    'route'    => '/:controller[/:action]',
                    'constraints' => array(
                          'controller' => '[a-zA-Z][a-zA-Z0-9_-]*',
                          'action'     => '[a-zA-Z][a-zA-Z0-9_-]*',
                    ),
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
                        'controller'    => 'Index',
                        'action'        => 'index',
                    ),
                ),
            ),

            'home' => array(
                'type' => 'Zend\Mvc\Router\Http\Literal',
                'options' => array(
                    'route'    => '/',
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
						'controller'    => 'Index',
                        'action'        => 'index',
                    ),
                ),
            ),

            'logout' => array(
                'type' => 'Zend\Mvc\Router\Http\Literal',
                'options' => array(
                    'route'    => '/logout',
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
						'controller'    => 'Login',
                        'action'        => 'logout',
                    ),
                ),
            ),

			'databases' => array(
					'type' => 'Zend\Mvc\Router\Http\Segment',
					'options' => array(
						'route'    => '/dbs[/]',
						'defaults' => array(
							'__NAMESPACE__' => 'SequelDash\Controller',
							'controller'    => 'Database',
							'action'        => 'index',
							'db'		=> 'foo'
						),
					),

			),


            'database_details' => array(
                'type' => 'Zend\Mvc\Router\Http\Segment',
                'options' => array(
                    'route'    => '/dbs/:db',
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
						'controller'    => 'Database',
                        'action'        => 'details',
						'db'			=> 'foo'
                    ),
                ),
            ),
			
            'table_details' => array(
                'type' => 'Zend\Mvc\Router\Http\Segment',
                'options' => array(
                    'route'    => '/dbs/:db/tables/:table',
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
						'controller'    => 'Database',
                        'action'        => 'tableDetails',
						'db'		=> 'foo'
                    ),
                ),
            ),

            'query' => array(
                'type' => 'Zend\Mvc\Router\Http\Segment',
                'options' => array(
                    'route'    => '/dbs/:db/query',
                    'defaults' => array(
                        '__NAMESPACE__' => 'SequelDash\Controller',
						'controller'    => 'Database',
                        'action'        => 'query',
						'db'		=> 'foo'
                    ),
                ),
            ),


        ),
    ),
    'service_manager' => array(
        'abstract_factories' => array(
            'Zend\Cache\Service\StorageCacheAbstractServiceFactory',
            'Zend\Log\LoggerAbstractServiceFactory',
        ),
        'aliases' => array(
            'translator' => 'MvcTranslator',
        ),
    ),
    'translator' => array(
        'locale' => 'en_US',
        'translation_file_patterns' => array(
            array(
                'type'     => 'gettext',
                'base_dir' => __DIR__ . '/../language',
                'pattern'  => '%s.mo',
            ),
        ),
    ),
    'controllers' => array(
        'invokables' => array(
            'SequelDash\Controller\Index' => 'SequelDash\Controller\IndexController',
            'SequelDash\Controller\Login' => 'SequelDash\Controller\LoginController',
            'SequelDash\Controller\Database' => 'SequelDash\Controller\DatabaseController',
            'SequelDash\Controller\About' => 'SequelDash\Controller\AboutController'
        ),
    ),
    'view_manager' => array(
        'display_not_found_reason' => true,
        'display_exceptions'       => true,
        'doctype'                  => 'HTML5',
        'not_found_template'       => 'error/404',
        'exception_template'       => 'error/index',
        'template_map' => array(
            'layout/layout'           => __DIR__ . '/../view/layout/layout.phtml',
            'application/index/index' => __DIR__ . '/../view/application/index/index.phtml',
            'error/404'               => __DIR__ . '/../view/error/404.phtml',
            'error/index'             => __DIR__ . '/../view/error/index.phtml',
        ),
        'template_path_stack' => array(
            __DIR__ . '/../view',
        ),
    ),
    // Placeholder for console routes
    'console' => array(
        'router' => array(
            'routes' => array(
            ),
        ),
    ),
);

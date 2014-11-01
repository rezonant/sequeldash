<?php
/**
 * This makes our life easier when dealing with paths. Everything is relative
 * to the application root now.
 */
chdir(dirname(__DIR__));

// Decline static file requests back to the PHP built-in webserver
if (php_sapi_name() === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

// Setup autoloading
require 'init_autoloader.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

$config = require 'config/application.config.php';
$timezone = 'America/New_York';

if (isset($config->timezone))
	$timezone = $config->timezone;

date_default_timezone_set($timezone);

fresh(new \SequelDash\Api())->process($config);

sequeldash
==========

> Please Note: This is an incomplete alpha version. Development is ongoing. New features are coming very soon!

Sequeldash is a modern, thoughtfully-designed SQL administration tool written in PHP, similar to phpMyAdmin or Adminer.
While being built with the latest web technologies, Sequeldash is built to gracefully degrade for use on
older or less capable browsers.

It was born out of my frustrations with the existing tools- particularly phpMyAdmin which, while very reliable,
is far from a well-designed tool. Furthermore, while PMA is very useful for simple one-time SQL administration, it 
pales when faced with more difficult and dangerous SQL operations.

For example, SequelDash has inline editing, but changes made inline are never immediately saved to the database. Instead 
changes are "staged", allowing the user to save changes when they are ready-- and not a moment sooner.

For now, only MySQL is supported, but the tool is being built to support multiple DBMSes eventually.

Installation Prerequisites
===================
In order to properly run a copy of sequeldash you will need to have the following server-side software installed:

  * Apache
  * PHP
  * MySQL

> Note: MySQL may alternatively be installed on a separate server. You may configure the server to connect from within config/database.config.php.

Build Prerequisites
==========

In order to build sequeldash, you must first install nodejs, npm, bower and grunt
NodeJS and npm installation instructions are outside the scope of this document. For instructions specific to your platform, see http://npmjs.org/.

Once node and npm are installed:

    $ npm install -g bower
    $ npm install -g grunt-cli

Building
========

To build sequeldash:

    user@host sequeldash$ ./prepare.sh
    user@host sequeldash$ grunt
    user@host sequeldash$ chmod a+r app -R

Running
=======

Once you have a fully built copy, you can then simply visit the web root in your browser. The application may be installed in any subdirectory. You also may optionally install sequeldash with the 'app' subdirectory as the web root for your server. This mode of operation is not well tested. Please submit a bug report if you experience issues with this configuration.

You will then need to log in with valid MySQL server credentials.

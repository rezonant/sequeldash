#!/bin/bash

app_name="SequelDash"
if ! which npm &>/dev/null; then
	echo "You must install NPM to continue. Consult your operating system guidelines or visit http://npmjs.org/."
	exit 1
fi

bad=0

if ! which bower &>/dev/null; then
	echo "Bower not found. Install with:"
	echo "  npm install -g bower"
	bad=1
fi

if ! which grunt &>/dev/null; then
	echo "Grunt not found. Install with:"
	echo "  npm install -g grunt-cli"
	bad=1
fi

if [ "$bad" = 1 ]; then
	exit 1
fi

echo
echo "Installing server-side packages (composer)..."
echo

php composer.phar install

echo
echo "Installing local dependencies (tools)..."
echo
npm install

echo
echo "Installing client side components..."
echo
bower install

echo
echo "Setting permissions..."
echo
chmod a+rX . -R

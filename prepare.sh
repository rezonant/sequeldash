#!/bin/bash

app_name="SequelDash"
npm_global_deps="bower grunt-cli"

if ! which npm &>/dev/null; then
	echo "You must install NPM to continue. Consult your operating system guidelines or visit http://npm.org/."
	exit 1
fi

echo
echo "Installing global dependencies (tools)..."
echo "  $npm_global_deps"
echo

for item in $npm_global_deps; do
	sudo npm install -g "$item"
	if [ "$?" != 0 ]; then
		echo
		echo "Failed to install global dependency '$item'"
		exit 1
	fi
done

echo
echo "Installing local dependencies (tools)..."
echo
npm install

echo
echo "Installing client side components..."
echo
bower install

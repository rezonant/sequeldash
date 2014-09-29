<?php

namespace SequelDash;

class Credential {
	public function __construct($username, $password)
	{
		$this->username = $username;
		$this->password = $password;
	}

	public $username;
	public $password;
}

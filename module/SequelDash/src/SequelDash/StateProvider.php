<?php

namespace SequelDash;

class StateProvider {
	public function prepare($data)
	{
		$data->loggedIn = true;
	}
}

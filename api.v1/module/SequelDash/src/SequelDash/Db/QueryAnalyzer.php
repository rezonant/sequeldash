<?php

namespace SequelDash\Db;

class QueryAnalyzer {
	public function __construct($query)
	{
		$this->originalQuery = $query;
		$this->query = $query;
		$this->query = trim($this->query, "\n\t ");
		$this->query = preg_replace('/-- .*$/m', '', $this->query);
		$parts = explode(' ', $this->query);

		$this->verb = strtoupper($parts[0]);
	}

	public $originalQuery;
	public $query;
	public $verb;

}

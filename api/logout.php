<?php
// api/logout.php
require_once 'config.php';

session_start();
session_destroy();
jsonResponse(['success' => true]);
?>
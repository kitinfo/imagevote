<?php

$out = Output::getInstance();
$controller = new Controller();

main();

/**
 * main function
 */
function main() {
    global $out;

    $http_raw = file_get_contents("php://input");

    if (isset($_GET["stats"])) {
            stats($_GET["stats"]);
    }
    if (isset($_GET["get"])) {
            get($_GET["get"]);
    }
    if (isset($_GET["random"])) {
	getRandom();
    }
    
    if (isset($_GET["answers"])) {
	getAnswers();
    }

    if (isset($http_raw) && !empty($http_raw)) {

        $obj = json_decode($http_raw, true);

        if (isset($_GET["vote"])) {
		vote($obj);
        }
        
    }

    $out->write();
}



function vote($obj) {
    
    global $controller, $out;
    
    if ($obj["image"] != null || $obj["reply"] != null) {
	$out->addStatus("replies", "image or reply not set!");
    }
    
    
    $sql = "INSERT INTO replies (image, reply) VALUES (:image, :reply)";
    
    
    $stm = $controller->exec($sql, array(
	":image" => $obj["image"],
	":reply" => $obj["reply"]
    ));
    
    if ($stm !== false) {
	$out->addStatus("replies", $stm->errorInfo());
	$stm->closeCursor();
    }
}

function getAnswers() {
    global $controller, $out;
    
    $sql = "SELECT * FROM answers";
    
    $stm = $controller->exec($sql, array());
    
    if ($stm !== false) {
	$out->addStatus("answers", $stm->errorInfo());
	$out->add("answer", $stm->fetchall(PDO::FETCH_ASSOC));
	$stm->closeCursor();
    }
}

function stats($obj) {
    
    global $controller, $out;
    
    $sql = "SELECT images.id AS id, url, reply FROM images JOIN replies ON (replies.image = images.id) GROUP BY images.id";
    
    $stm = $controller->exec($sql, array());
    
    if ($stm !== false) {
	
	
	$input = $stm->fetchall(PDO::FETCH_ASSOC);
	
	$output = array();
	
	foreach($input as $e) {
	    
	    $e["stats"] = getSum($e["id"]);
	   
	    $output[] = $e;
	}
	getAnswers();
		
	$out->addStatus("stats", $stm->errorInfo());
	$out->add("stats", $output);
	
	$stm->closeCursor();
    }
}

function getSum($id) {
    
    global $controller, $out;
    
    $sql = "SELECT image, reply, COUNT(id) AS votes FROM replies WHERE image = :id GROUP BY reply, image ORDER BY image";
    
    $stm = $controller->exec($sql, array(
	":id" => $id
    ));
    
    $output = array();
    if ($stm !== false) {	

	$out->addStatus("sum", $stm->errorInfo());
	$output = $stm->fetchall(PDO::FETCH_ASSOC);
	
	$stm->closeCursor();
    }

    return $output;
}

function get($obj) {
    
    global $controller, $out;
    
    $sql = "SELECT * FROM images";
    $args = array();
    
    if (!empty($obj)) {
	$sql .= " WHERE id = :id";
	$args = array(
	  ":id" => $obj  
	);
    }
    
    $stm = $controller->exec($sql, $args);
    
    if ($stm !== false) {
	$out->addStatus("get", $stm->errorInfo());
	
	$out->add("get", $stm->fetchall(PDO::FETCH_ASSOC));
	
	$stm->closeCursor();
    }
}

function getRandom() {
    global $controller, $out;
    
    $sql = "SELECT * FROM images ORDER BY RANDOM() LIMIT 1";
    
    $stm = $controller->exec($sql, array());
    
    if ($stm !== false) {
	$out->addStatus("get", $stm->errorInfo());
	
	$out->add("get", $stm->fetchall(PDO::FETCH_ASSOC));
	
	$stm->closeCursor();
    }
}




/**
 * output functions
 */
class Output {

    private static $instance;
    public $retVal;

    /**
     * constructor
     */
    private function __construct() {
        $this->retVal['status']["db"] = "ok";
    }

    /**
     * Returns the output instance or creates it.
     * @return Output output instance
     */
    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Adds data for use to output.
     * @param type $table
     * @param type $output
     */
    public function add($table, $output) {
        $this->retVal[$table] = $output;
    }

    /**
     * Adds an status for output
     * @param type $table status table
     * @param type $output message (use an array with 3 entries ("id", <code>, <message>))
     */
    public function addStatus($table, $output) {

        if ($output[1]) {
            $this->retVal["status"]["debug"][] = $output;
            $this->retVal["status"]["db"] = "failed";
        }

        $this->retVal['status'][$table] = $output;
    }

    /**
     * Generates the output for the browser. General you call this only once.
     */
    public function write() {

        header("Content-Type: application/json");
        header("Access-Control-Allow-Origin: *");
        # Rückmeldung senden
        if (isset($_GET["callback"]) && !empty($_GET["callback"])) {
            $callback = $_GET["callback"];
            echo $callback . "('" . json_encode($this->retVal, JSON_NUMERIC_CHECK) . "')";
        } else {
            echo json_encode($this->retVal, JSON_NUMERIC_CHECK);
        }
    }

}

/**
 * controller functions
 */
class Controller {

    private $db;

    /**
     * controller constructor (opens the database)
     */
    public function __construct() {

        try {
            $this->db = new PDO("sqlite:imagevote.db3");
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
        } catch (PDOException $ex) {
            $retVal["status"]["db"] = $ex->getMessage();
            die(json_encode($retVal));
        }
    }

    /**
     * Checks the secret for admin stuff.
     * @param type $secret secret
     * @return boolean true if same as in database.
     */
    public function checkSecret($secret) {
        $sql = "SELECT * FROM system WHERE key = 'secret'";

        $stm = $this->exec($sql, array());

        $secretTable = $stm->fetch();
        $stm->closeCursor();
        if ($secretTable["value"] == $secret) {
            Output::getInstance()->addStatus("access", array("0", null, "granted"));
            return true;
        }
        Output::getInstance()->addStatus("access", array("99997", 97, "denied"));
        return false;
    }

    /**
     * Helper function for executing. Builds a prepared statement.
     * @param type $sql sql command.
     * @return type prepared statement which you can execute with execute()
     */
    private function prepare($sql) {

        $db = $this->getDB();

        try {
            $stm = $db->prepare($sql);
            if ($db->errorInfo()[1] != null) {
                $retVal["status"]["db"] = $db->errorInfo();
                die(json_encode($retVal));
            }
            return $stm;
        } catch (Exception $ex) {
            $retVal["status"]["db"] = $ex->getMessage();
            die(json_encode($retVal));
        }
    }

    /**
     * Helper function for executing the prepared statement.
     * @param type $stm prepared statement (@see prepare())
     * @param type $args argumens for the statement
     * @return type cursor
     */
    private function execute($stm, $args) {
        try {
            $stm->execute($args);
            return $stm;
        } catch (Exception $ex) {
            $retVal["status"]["db"] = $ex->getMessage();
            die(json_encode($retVal));
        }
    }

    /**
     * exec an action on the database
     * @param type $sql sql command
     * @param type $args arguments for the command
     * @return type database cursor (don't forget to close after doing ýour stuff)
     */
    public function exec($sql, $args) {
        $stm = $this->prepare($sql);
        return $this->execute($stm, $args);
    }

    /**
     * Adds the user to database.
     * @param type $name name of the user
     */
    public function addUser($name) {

        $sql = "INSERT INTO users(name) VALUES(:name)";

        $stm = $this->exec($sql, array(
            ":name" => $name
        ));

        $out = Output::getInstance();


        $out->addStatus("user", $stm->errorInfo());
        $out->add("user", $this->getDB()->lastInsertId());

        $stm->closeCursor();
    }

    /**
     * Returns the user with the given id
     * @param type $id id of the user
     */
    public function getUser($id) {

        $sql = "SELECT * FROM users WHERE name = :id";

        $stm = $this->prepare($sql);
        $stm = $this->execute($stm, array(
            ":id" => $id
        ));

        $output = Output::getInstance();

        $output->addStatus("users", $stm->errorInfo());
        $output->add("users", $stm->fetchAll(PDO::FETCH_ASSOC));

        $stm->closeCursor();
    }

    /**
     * Returns the database object
     * @return PDO database
     */
    public function getDB() {

        return $this->db;
    }

}
?>

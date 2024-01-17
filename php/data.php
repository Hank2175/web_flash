<?php
	function getDIRandFILE($fileName){
		$ftp_server = "10.88.25.179";
		$ftp_user = "readonly2";
		$ftp_pass = "g7g2mc";

		//connect
		$conn = ftp_connect($ftp_server);
		$ftp_login = ftp_login($conn, $ftp_user, $ftp_pass);
		
		$mode = ftp_pasv($conn ,TRUE);
		
		//login ok???
		if(!$conn || $login || !$mode) {
			die("FTP connection has failed!");
		}
		//echo "<b/>login ok.";
		$file_list = ftp_mlsd($conn, $fileName);
		$file_list = json_encode($file_list);
		echo $file_list;
		foreach($file_list as $file){
			//echo "<hr>$file<br>";
			//$list = ftp_nlist($conn, $file);
			//foreach($list as $file1){
			//	echo "$file1<br>";
			//}
		}
		
	}
	//var_dump($_POST['action']);
	getDIRandFILE($_POST['action']);//./Project_Release
	//getDIRandFILE("./Project_Release");
?>

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
		ftp_close($conn);
	}

	function downloadFile($fileName){
		$ftp_server = "10.88.25.179";
		$ftp_user = "readonly2";
		$ftp_pass = "g7g2mc";
		$server_loc = "ftp://readonly2:g7g2mc@10.88.25.179/$fileName";
		$output = null;
		$retval = null;
		exec("wget -P ".getcwd()."/../image_buffer $server_loc", $output, $retval);
		exec("chmod 777 ".getcwd()."/../image_buffer/*.*");
		//echo getcwd();
		//echo "wget -P ".getcwd()."/../image_buffer $server_loc";
		echo "return with output $retval and output:\n$output";
	}

	//var_dump($_POST['action']);
	if(isset($_POST['action'])){
		getDIRandFILE($_POST['action']);
	}
	//getDIRandFILE("./Project_Release");
	if(isset($_POST['downLoad'])){
		downloadFile($_POST['downLoad']);
	}
?>

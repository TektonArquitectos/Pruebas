<?php
if( ! empty( $_POST['email'] ) ) {

	// Enable / Disable SMTP
	$enable_smtp = 'no'; // yes OR no

	// Email Receiver Address
	$receiver_email = 'alberto.butron@gmail.com';

	// Email Receiver Name for SMTP Email
	$receiver_name 	= 'Alberto';

	// Email Subject
	$subject = 'Nuevo contacto desde Sipachuca.com';
	if( ! empty( $_POST['asunto'] ) ) {
		$subject = 'Sipachuca.com: ' . trim( str_replace( array( "\r", "\n" ), ' ', substr( $_POST['asunto'], 0, 150 ) ) );
	}

	// Formato del correo: 'html' (tabla) o 'text'
	$template = 'html';

	// Google reCaptcha secret Key (clave secreta: NUNCA la publique en HTML ni en JavaScript)
	$grecaptcha_secret_key = '6Lc9ppAqAAAAAN5Z_ZnGAhANf51uZkPtG0ti4RZJ';

	$from 	= trim( $_POST['email'] );
	$from 	= str_replace( array( "\r", "\n", '%0a', '%0d' ), '', $from );   // evita inyeccion de encabezados
	$name 	= isset( $_POST['name'] ) ? str_replace( array( "\r", "\n" ), ' ', $_POST['name'] ) : '';

	// reCAPTCHA es OBLIGATORIO: sin token no se envia nada
	$token = isset( $_POST['g-recaptcha-response'] ) ? $_POST['g-recaptcha-response'] : '';
	if( $token === '' ) {
		echo '{ "alert": "alert-danger", "message": "Marque la casilla \u201cNo soy un robot\u201d e intente de nuevo." }';
		die;
	}

	$post_data = http_build_query( array(
		'secret'   => $grecaptcha_secret_key,
		'response' => $token,
		'remoteip' => isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : ''
	) );
	$response = false;
	if( function_exists( 'curl_init' ) ) {
		$ch = curl_init();
		curl_setopt( $ch, CURLOPT_URL, 'https://www.google.com/recaptcha/api/siteverify' );
		curl_setopt( $ch, CURLOPT_POST, 1 );
		curl_setopt( $ch, CURLOPT_POSTFIELDS, $post_data );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 10 );
		$response = curl_exec( $ch );
		curl_close( $ch );
	}
	if( $response === false && ini_get( 'allow_url_fopen' ) ) {   // respaldo si el servidor no tiene cURL
		$ctx = stream_context_create( array( 'http' => array( 'method' => 'POST', 'header' => "Content-type: application/x-www-form-urlencoded\r\n", 'content' => $post_data, 'timeout' => 10 ) ) );
		$response = @file_get_contents( 'https://www.google.com/recaptcha/api/siteverify', false, $ctx );
	}
	$arrResponse = json_decode( $response, true );
	if( ! ( is_array( $arrResponse ) && ! empty( $arrResponse['success'] ) ) ) {
		echo '{ "alert": "alert-danger", "message": "No se pudo verificar reCAPTCHA. Marque la casilla e intente de nuevo, o escr\u00edbanos por WhatsApp." }';
		die;
	}

	if( $_SERVER['REQUEST_METHOD'] == 'POST' ) {

		$prefix		= !empty( $_POST['prefix'] ) ? $_POST['prefix'] : '';
		$submits	= $_POST;
		$botpassed	= false;

		$fields = array();
		foreach( $submits as $name => $value ) {
			if( empty( $value ) || $name === 'g-recaptcha-response' ) {
				continue;
			}

			$name = str_replace( $prefix , '', $name );
			$name = function_exists('mb_convert_case') ? mb_convert_case( $name, MB_CASE_TITLE, "UTF-8" ) : ucwords($name);

			if( is_array( $value ) ) {
				$value = implode( ', ', $value );
			}

			$fields[$name] = nl2br( filter_var( $value, FILTER_SANITIZE_SPECIAL_CHARS ) );
		}

		$response = array();
		foreach( $fields as $fieldname => $fieldvalue ) {
			if( $template == 'text' ) {
				$response[] = $fieldname . ': ' . $fieldvalue;
			} else {
				$fieldname = '<tr>
									<td align="right" valign="top" style="border-top:1px solid #dfdfdf; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#000; padding:7px 5px 7px 0;">' . $fieldname . ': </td>';
				$fieldvalue = '<td align="left" valign="top" style="border-top:1px solid #dfdfdf; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#000; padding:7px 0 7px 5px;">' . $fieldvalue . '</td>
								</tr>';
				$response[] = $fieldname . $fieldvalue;
			}
		}

		$message = '<html>
			<head>
				<title>HTML email</title>
			</head>
			<body>
				<table width="50%" border="0" align="center" cellpadding="0" cellspacing="0">
				<tr>
				<td colspan="2" align="center" valign="top"><img style="margin-top: 15px;" src="http://www.yourdomain.com/images/logo-email.png" ></td>
				</tr>
				<tr>
				<td width="50%" align="right">&nbsp;</td>
				<td align="left">&nbsp;</td>
				</tr>
				' . implode( '', $response ) . '
				</table>
			</body>
			</html>';
		if( $enable_smtp == 'no' ) { // Simple Email

			// Always set content-type when sending HTML email
			$headers = "MIME-Version: 1.0" . "\r\n";
			$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
			// More headers
			$dominio = preg_replace( '/^www\./', '', isset( $_SERVER['SERVER_NAME'] ) ? $_SERVER['SERVER_NAME'] : 'sipachuca.com' );
			$headers .= 'From: Sipachuca.com <no-responder@' . $dominio . '>' . "\r\n";
			$reply_name = isset( $fields['Name'] ) ? trim( strip_tags( $fields['Name'] ) ) : '';
			$headers .= 'Reply-To: ' . $reply_name . ' <' . $from . '>' . "\r\n";
			$subject_mime = function_exists( 'mb_encode_mimeheader' ) ? '=?UTF-8?B?' . base64_encode( $subject ) . '?=' : $subject;
			if( mail( $receiver_email, $subject_mime, $message, $headers ) ) {

				// Redirect to success page
				$redirect_page_url = ! empty( $_POST['redirect'] ) ? $_POST['redirect'] : '';
				if( ! empty( $redirect_page_url ) ) {
					header( "Location: " . $redirect_page_url );
					exit();
				}

			   	//Success Message
			  	echo '{ "alert": "alert alert-success alert-dismissable", "message": "Gracias, su mensaje se envi\u00f3 correctamente." }';
			} else {
				//Fail Message
			  	echo '{ "alert": "alert alert-danger alert-dismissable", "message": "No se pudo enviar su mensaje. Intente de nuevo o escr\u00edbanos por WhatsApp." }';
			}
			
		} else { // SMTP
			// Email Receiver Addresses
			$toemailaddresses = array();
			$toemailaddresses[] = array(
				'email' => $receiver_email, // Your Email Address
				'name' 	=> $receiver_name // Your Name
			);

			require 'phpmailer/Exception.php';
			require 'phpmailer/PHPMailer.php';
			require 'phpmailer/SMTP.php';

			$mail = new PHPMailer\PHPMailer\PHPMailer();

			$mail->isSMTP();
			$mail->Host     = 'YOUR_SMTP_HOST'; // Your SMTP Host
			$mail->SMTPAuth = true;
			$mail->Username = 'YOUR_SMTP_USERNAME'; // Your Username
			$mail->Password = 'YOUR_SMTP_PASSWORD'; // Your Password
			$mail->SMTPSecure = 'ssl'; // Your Secure Connection
			$mail->Port     = 465; // Your Port
			$mail->setFrom( $fields['Email'], $fields['Name'] );
			
			foreach( $toemailaddresses as $toemailaddress ) {
				$mail->AddAddress( $toemailaddress['email'], $toemailaddress['name'] );
			}

			$mail->Subject = $subject;
			$mail->isHTML( true );

			$mail->Body = $message;

			if( $mail->send() ) {
				
				// Redirect to success page
				$redirect_page_url = ! empty( $_POST['redirect'] ) ? $_POST['redirect'] : '';
				if( ! empty( $redirect_page_url ) ) {
					header( "Location: " . $redirect_page_url );
					exit();
				}

			   	//Success Message
			  	echo '{ "alert": "alert alert-success alert-dismissable", "message": "Gracias, su mensaje se envi\u00f3 correctamente." }';
			} else {
				//Fail Message
			  	echo '{ "alert": "alert alert-danger alert-dismissable", "message": "No se pudo enviar su mensaje. Intente de nuevo o escr\u00edbanos por WhatsApp." }';
			}
		}
	}
} else {
	//Empty Email Message
	echo '{ "alert": "alert alert-danger alert-dismissable", "message": "Por favor escriba su correo electr\u00f3nico." }';
}
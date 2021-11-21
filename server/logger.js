/*
	The logging system will be here.
	Not yet implemented, only if time constrains will allow it.
 */

/**
 * Logging information will be done using this function.
 * @param status	<string> 	Type of log (error, warning, etc).
 * @param message	<string>	The message itself.
 * @param toPrint	<boolean>	If true, will also print the status and message to the server console.
 * @return void.
 */
function logIt(status, message, toPrint) {
	// TODO: implement a simple logging system.


	if(toPrint)
		console.log(`'${status}' :: ${message}`);
}

module.exports.logIt = logIt;
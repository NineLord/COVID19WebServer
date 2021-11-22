/*
	The logging system will be here.
	Not yet implemented, only if time constrains will allow it.

	If implemented:
	*	Need to to have the list of status here exported.
	* The optional error messages should also be here and exported
		(so all the messages will be written the same way).
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

/**
 * This class will be used when throwing an error
 * and wishing for it to be logged when it's being caught.
 */
class LogInfo extends Error {
	#status;
	#toPrint;

	constructor(status, message, toPrint) {
		super(message);
		this.#status = status;
		this.#toPrint = toPrint;
	}

	get status() {
		return this.#status;
	}

	get toPrint() {
		return this.#toPrint;
	}
}

/**
 * When an error is being thrown,
 * this handler will check if its LogInfo,
 * otherwise assume its a string.
 * @param error <LogInfo | string> error to be logged.
 */
function handleLogInfo(error) {
	if (error instanceof LogInfo)
		logIt(error.status, error.message, error.toPrint);
	else
		logIt('error', error, true);
}

module.exports = {
	logIt: logIt,
	LogInfo: LogInfo,
	catchLogInfo: handleLogInfo
};
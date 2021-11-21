/*
	Running this file will start the server
*/
const http = require('http');
const params = require('./globalParameters');
const logIt = require('./logger').logIt;
const handlers = require('./handlers');


/**
 * Get the input hostname and port from the command line arguments.
 * If it wasn't given, will print error message and exit the program.
 * @return {{host: string, port: string}} object containing the hostname and port.
 */
function getArgs() {
	if (process.argv.length !== 4) {
		logIt('error', 'Input has to be <hostname> <port>', true);
		process.exit(1);
	}

	return {
		host: process.argv[2],
		port: process.argv[3]
	};
}

let {host ,port} = params.debugFlag ? {host: 'hostname', port: 8080} : getArgs();

// Initialize the server
const server = http.createServer();

server.on('request', handlers.request);
server.on('listening', handlers.listening);

// Start the server
server.listen(port, host);

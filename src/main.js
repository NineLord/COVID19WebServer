/*
	Running this file will start the server
*/

const http = require('http');

const params = require('./globalParameters');
const handlers = require('./handlers');

function getArgs() {
	if (process.argv.length !== 4) {
		console.log('Input has to be <hostname> <port>');
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

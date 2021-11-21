/*
	The implementations of each event listener will be here.
*/

const requestHandler = function (request, response) {
	response.setHeader('Content-Type', 'text/plain');
	response.writeHead(200); // status code
	response.end('Hello from server!\n');
};

const listeningHandler = function() {
	console.log(`Server is running on http://${host}:${port}`);
};

module.exports.request = requestHandler;
module.exports.listening = listeningHandler;
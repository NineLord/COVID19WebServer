/*
	The implementations of each event listener for the server.
*/
const url = require('url');
const userDatabase = require('./UserDatabase');
const covidTempDatabase = require('./CovidTempDatabase');
const covidAPI = require('./covidAPI');
const logger = require('./logger');

/*
// A small summery of our protocol that being supported.
// TODO: move this to README.md

Protocol:
- GET	|	/?protocol=daily&country=<NAME>&date=<DAY>-<MONTH>-<YEAR>
	whereas:
		NAME is string, capital letter.
		DAY is int with 2 digits.
		MONTH is int with 2 digits.
		YEAR is int with 4 digits.
	Returns: non negative int.

- POST | body(JSON):
	{
		"protocol": 'addUser',
		"username": <string>
	}
	Returns: none.

- POST | body(JSON):
	{
		"protocol": 'addCountry',
		"username": <string>,
		"country": <string>
	}
	Returns: none.

- POST | body(JSON):
	{
		"protocol": 'removeCountry',
		"username": <string>,
		"country": <string>
	}
	Returns: none.

- GET | /?protocol=countryList&username=<string>
	Returns: <string[]>.

- GET | /?protocol=numOfDeath&username=<string>&from=<DAY>-<MONTH>-<YEAR>&to=<DAY>-<MONTH>-<YEAR>
	Returns: <pair(string, <pair(string, int)[]>)[]>
	Each country and his number of death each day in range.

- GET | /?protocol=numOfConfirmed&username=<string>&from=<DAY>-<MONTH>-<YEAR>&to=<DAY>-<MONTH>-<YEAR>
	Returns: <pair(string, <pair(string, int)[]>)[]>
	Each country and his number of confirmed each day in range.

- GET | /?protocol=highestDeaths&username=<string>&from=<DAY>-<MONTH>-<YEAR>&to=<DAY>-<MONTH>-<YEAR>
	Returns: <pair(string, string)[]>
	Each date and his country with highest ratio.
	(|death cases| / |population|)

- GET | /?protocol=highestConfirmed&username=<string>&from=<DAY>-<MONTH>-<YEAR>&to=<DAY>-<MONTH>-<YEAR>
	Returns: <pair(string, string)[]>
	Each date and his country with highest ratio.
	(|confirmed cases| / |population|)
*/

/**
 * A function to shorten the code.
 * response to the client according to the given input.
 * @param response		<http.ServerResponse> the client.
 * @param contentType	<string> Content-Type for the header.
 * @param statusCode	<int> Status code.
 * @param options	<object>	If 'message' property is there, it should be <string> that will be sent to the client.
 * 													If 'error' property is there, it should be <string | logger.LogInfo> that will be logged.
 */
function respond(response, contentType, statusCode, options={}) {
	if(options.hasOwnProperty('error'))
		logger.catchLogInfo(options.error);

	response.setHeader('Content-Type', contentType);
	response.writeHead(statusCode);

	if(options.hasOwnProperty('message'))
		response.end(options.message);
	else
		response.end();
}

// Helper functions to convert/check the input.
function urlToArguments(reqUrl) {
	return url.parse(reqUrl, true).query;
}

function isDateValid(date) {
	const reg = /^((([0-2][0-9])|(3[0-1]))-((0[0-9])|(1[0-2]))-([0-9]{4}))$/g;
	return reg.test(date);
}

function isValidDailyArgs(args) {
	return args.country !== undefined && args.date !== undefined && isDateValid(args.date);
}

function getPreviousDayDate(strCurrDate) {
	const currDate = new Date(strCurrDate
		.split('-')
		.reduce((prev, curr) => `${curr}/${prev}`)
	);
	const prevDate = new Date(currDate.valueOf());
	prevDate.setDate(currDate.getDate() - 1);
	return `${('0' + prevDate.getDate()).slice(-2)}-${('0' + (prevDate.getMonth() + 1)).slice(-2)}-${('0' + prevDate.getFullYear()).slice(-4)}`;
}

// The protocol itself, each supported functionality
// of the protocol will have its own function.
function protocolDaily(args, request, response) {
	if(isValidDailyArgs(args)) {
		const country = covidAPI.parseCountry(args.country);
		covidTempDatabase.getInfoAsync('history', {country: country, status: 'confirmed'})
			.then(data => {
				const currDateParsed = covidAPI.parseDate(args.date);
				const prevDateParsed = covidAPI.parseDate(getPreviousDayDate(args.date));
				const currDateConfirmed = data.dates[currDateParsed];
				const prevDateConfirmed = data.dates[prevDateParsed];
				if(currDateConfirmed === undefined)
					return 0;
				if(prevDateConfirmed === undefined)
					return currDateConfirmed;
				return Math.max(0, data.dates[currDateParsed] - data.dates[prevDateParsed]);
			})
			.then(result => respond(response, 'text/plain', 200, {message: result.toString()}))
			.catch(error => respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error}));
	} else
		respond(response, 'text/plain', 400, {message: `Incorrect arguments: ${JSON.stringify(args)}.`, error: `protocolDaily: ${JSON.stringify(args)}`})
}

function protocolCountryList(args, request, response) {
	// TODO
}

function protocolNumOfDeath(args, request, response) {
	// TODO
}

function protocolNumOfConfirmed(args, request, response) {
	// TODO
}

function protocolHighestDeaths(args, request, response) {
	// TODO
}

function protocolHighestConfirmed(args, request, response) {
	// TODO
}

function protocolAddUser(args, request, response) {
	// TODO
}

function protocolAddCountry(args, request, response) {
	// TODO
}

function protocolRemoveCountry(args, request, response) {
	// TODO
}

const supportedProtocols = {
	GET: {
		daily: protocolDaily,
		countryList: protocolCountryList,
		numOfDeath: protocolNumOfDeath,
		numOfConfirmed: protocolNumOfConfirmed,
		highestDeaths: protocolHighestDeaths,
		highestConfirmed: protocolHighestConfirmed
	},
	POST: {
		addUser: protocolAddUser,
		addCountry: protocolAddCountry,
		removeCountry: protocolRemoveCountry
	}
}

// The server's event listeners.
function requestHandler(request, response) {
	const method = supportedProtocols[request.method];
	if(method === undefined) {
		const msg = `Request with unknown http method: ${request.method}`;
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}

	const args = urlToArguments(request.url);
	if(args.protocol === undefined) {
		const msg = 'Request without protocol parameter';
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}

	const protocolFunction = method[args.protocol];
	if(protocolFunction === undefined) {
		const msg = `Request with unknown protocol: ${args.protocol}`;
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}
	protocolFunction(args, request, response);
}

function listeningHandler() {
	logger.logIt('info', `Server is running!`, true);
}

module.exports = {
	request: requestHandler,
	listening: listeningHandler
};

/*
// Test
urlToArguments('/?food=shimi&type=green');
urlToArguments('/');
console.log(urlToArguments('/?protocol=daily&country=Israel&date=15-10-2020'));

isDateValid('shaked 10-10-1000');
isDateValid(' 10-10-1000');
isDateValid('10-10-1000');
isDateValid('10-10-1000 ');
isDateValid('shaked 10-10-1000 01-01-2000');
*/

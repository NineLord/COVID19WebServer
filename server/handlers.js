/*
	The implementations of each event listener for the server.
*/
const url = require('url');
const userDatabase = require('./UserDatabase');
const covidTempDatabase = require('./CovidTempDatabase');
const covidAPI = require('./covidAPI');
const logger = require('./logger');
const params = require('./globalParameters');

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
/* Note:
 * Below we have many helper functions to convert
 * dates from our protocol format to Date class format.
 * We go about it back and forth, which makes it inefficient.
 * However, it helps us to keep the code generic in case in the future
 * our protocol or Date class changes.
 *
 * There could be a more efficient way to do it,
 * but for now, due to the limited time, we will keep it like that.
 * (TODO)
 */
function urlToArguments(reqUrl) {
	return url.parse(reqUrl, true).query;
}

function isDateValid(date) {
	const reg = /^((([0-2][0-9])|(3[0-1]))-((0[0-9])|(1[0-2]))-([0-9]{4}))$/g;
	return reg.test(date);
}

function isValidArgDate(args, propertyName) {
	return args[propertyName] !== undefined && isDateValid(args[propertyName]);
}

function isValidArgCountry(args) {
	return args.country !== undefined;
}

function dateStringToDateClass(strDate) {
	// Assumes isDateValid(strDate) is true.
	return new Date(strDate
		.split('-')
		.reduce((prev, curr) => `${curr}/${prev}`)
	);
}

function dateClassToDateString(classDate) {
	// .slice(-num) to make sure we have num digits.
	const day		= ('0' +  classDate.getDate()				).slice(-2);
	const month	= ('0' + (classDate.getMonth() + 1)	).slice(-2); // +1 since Date.getMonth() counts months from 0 not 1.
	const year	= ('0' +  classDate.getFullYear()		).slice(-4);
	return `${day}-${month}-${year}`;
}

function getPreviousDayDate(strCurrDate) {
	const currDate = dateStringToDateClass(strCurrDate);
	const prevDate = new Date(currDate.valueOf());
	prevDate.setDate(currDate.getDate() - 1);
	return dateClassToDateString(prevDate);
}

/**
 * Given the dates data (of the deaths cases or the confirmed case)
 * and a specific date, will calculate the difference between that day
 * and the previous day.
 * @param datesJson	<JSON>		the dates data that was saved in CovidTempDatabase.
 * @param date			<string>	representing the day according to our protocol format.
 * @return {number}	the difference of cases between the specific date and the previous day.
 */
function calcDeathOrConfirmedAtDate(datesJson, date) {
	const currDateParsed = covidAPI.parseDate(date);
	const currDateConfirmed = datesJson[currDateParsed];
	if(currDateConfirmed === undefined)
		return 0;

	const prevDateParsed = covidAPI.parseDate(getPreviousDayDate(date));
	const prevDateConfirmed = datesJson[prevDateParsed];
	if(prevDateConfirmed === undefined)
		return currDateConfirmed;

	return Math.max(0, datesJson[currDateParsed] - datesJson[prevDateParsed]);
}

function isValidArgUsername(args) {
	return args.username !== undefined;
}

function isDatesInOrder(strFromDate, strToDate) {
	// Assumes (isDateValid(fromDate) && isDateValid(toDate)) is true.
	const fromDate = dateStringToDateClass(strFromDate);
	const toDate = dateStringToDateClass(strToDate);
	return fromDate <= toDate;
}

function isDateNotInFuture(strDate) {
	// Assumes isDateValid(strDate) is true.
	const pastDate = dateStringToDateClass(strDate);
	const todayDate = new Date();
	return pastDate <= todayDate;
}

function isDateToday(strDate) {
	const today = new Date();
	return dateClassToDateString(today) === strDate;
}

function isValidArgFromToDate(args) {
	const fistDatePropertyName = 'from';
	const secondDatePropertyName = 'to';
	return (
		isValidArgDate(args, fistDatePropertyName)			&&
		isValidArgDate(args, secondDatePropertyName)		&&
		isDateNotInFuture(args[secondDatePropertyName])	&&
		isDatesInOrder(args[fistDatePropertyName], args[secondDatePropertyName])	&&
	 !isDateToday(args[secondDatePropertyName]) /* TODO:
	 		In the future this line will be removed as its ok to about a range from the past TIL today.
	 		However, covid19-API does not include today's data when querying route 'history',
	 		thus creating a complication, needing to query twice each country and we need to merge the data together.
	 		calcDeathOrConfirmedAtDate() does not support this merge as of yet.

	 		This change will be done in the future for the lake of time.
	 */
	);
}

// The protocol itself, each supported functionality
// of the protocol will have its own function.
function protocolDaily(args, response) {
	if(isValidArgCountry(args) && isValidArgDate(args, 'date')) {
		const country = covidAPI.parseCountry(args.country);
		covidTempDatabase.getInfoAsync('history', {country: country, status: 'confirmed'})
			.then(data => calcDeathOrConfirmedAtDate(data.dates, args.date))
			.then(result => respond(response, 'text/plain', 200, {message: result.toString()}))
			.catch(error => {
				if(error instanceof logger.LogInfo && error.status === 'args not found')
					respond(response, 'text/plain', 404, {message: 'Invalid country name', error: error});
				else
					respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
			});
	} else
		respond(response, 'text/plain', 400, {message: `Incorrect arguments: ${JSON.stringify(args)}.`, error: `protocolDaily: ${JSON.stringify(args)}`});
}

function protocolCountryList(args, response) {
	if(isValidArgUsername(args)) {
		userDatabase.getCountriesString(args.username)
			.then(countriesString => respond(response, 'application/json', 200, {message: countriesString}))
			.catch(error => {
				if(error instanceof logger.LogInfo && error.status === 'user not found')
					respond(response, 'text/plain', 404, {message: 'User not found', error: error});
				else
					respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
			});
	} else
		respond(response, 'text/plain', 400, {message: `Incorrect arguments: ${JSON.stringify(args)}.`, error: `protocolCountryList: ${JSON.stringify(args)}`});
}

function protocolNumOfStatusCurry(status) {
	if(!covidAPI.isValidStatus(status)) {
		logger.logIt('error', `Wrong status in protocolNumOfStatusCurry() at start up: ${status}`, true);
		process.exit(1);
	}

	return (args, response) => {
		if (isValidArgUsername(args) && isValidArgFromToDate(args)) {
			userDatabase.getCountries(args.username)
				.then(countriesIter => covidTempDatabase.getInfoForListAsync(countriesIter, 'history', {status: status}))
				.then(countiesData => {
					const result = {};

					const dateFrom = dateStringToDateClass(args.from);
					const dateTo = dateStringToDateClass(args.to);
					for (const currDate = new Date(dateFrom.valueOf()); currDate <= dateTo; currDate.setDate(currDate.getDate() + 1)) {
						const strCurrDate = dateClassToDateString(currDate);
						for (const data of countiesData) {
							// TODO: make it more efficient, calcDeathOrConfirmedAtDate does calculations twice.
							if (result.hasOwnProperty(data.country))
								result[data.country][strCurrDate] = calcDeathOrConfirmedAtDate(data.dates, strCurrDate);
							else
								result[data.country] = {[strCurrDate]: calcDeathOrConfirmedAtDate(data.dates, strCurrDate)};
						}
					}
					return result;
				})
				.then(result => respond(response, 'application/json', 200, {message: JSON.stringify(result)}))
				.catch(error => {
					if (error instanceof logger.LogInfo) {
						if (error.status === 'user not found')
							respond(response, 'text/plain', 404, {message: 'User not found', error: error});
						else if (error.status === 'args not found')
							respond(response, 'text/plain', 404, {message: 'Country not found', error: error});
						else
							respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
					} else
						respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
				});
		} else
			respond(response, 'text/plain', 400, {
				message: `Incorrect arguments: ${JSON.stringify(args)}.`,
				error: `protocolNumOfDeath: ${JSON.stringify(args)}`
			});
	};
}

function protocolHighestStatusCurry(status) {
	if (!covidAPI.isValidStatus(status)) {
		logger.logIt('error', `Wrong status in protocolHighestStatusCurry() at start up: ${status}`, true);
		process.exit(1);
	}

	return (args, response) => {
		if (isValidArgUsername(args) && isValidArgFromToDate(args)) {
			userDatabase.getCountries(args.username)
				.then(countriesIter => covidTempDatabase.getInfoForListAsync(countriesIter, 'history', {status: status}))
				.then(countiesData => {
					const result = {};

					const dateFrom = dateStringToDateClass(args.from);
					const dateTo = dateStringToDateClass(args.to);
					for (const currDate = new Date(dateFrom.valueOf()); currDate <= dateTo; currDate.setDate(currDate.getDate() + 1)) {
						const strCurrDate = dateClassToDateString(currDate);
						const strCovidCurrDate = covidAPI.parseDate(strCurrDate);
						let maxRatio = 0;
						for (const data of countiesData) {
							const currRatio = (data.dates[strCovidCurrDate] / data.population);
							if(maxRatio < currRatio) {
								maxRatio = currRatio;
								result[strCurrDate] = data.country;
							}
						}
					}
					return result;
				})
				.then(result => respond(response, 'application/json', 200, {message: JSON.stringify(result)}))
				.catch(error => {
					if (error instanceof logger.LogInfo) {
						if (error.status === 'user not found')
							respond(response, 'text/plain', 404, {message: 'User not found', error: error});
						else if (error.status === 'args not found')
							respond(response, 'text/plain', 404, {message: 'Country not found', error: error});
						else
							respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
					} else
						respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
				});
		} else
			respond(response, 'text/plain', 400, {
				message: `Incorrect arguments: ${JSON.stringify(args)}.`,
				error: `protocolNumOfDeath: ${JSON.stringify(args)}`
			});
	}
}

function protocolAddUser(args, response) {
	if(isValidArgUsername(args)) {
		userDatabase.addUser(args.username)
			.then(wasAdded => respond(response, 'text/plain', wasAdded ? 201 : 208, {}))
			.catch(error => respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error}));
	} else
		respond(response, 'text/plain', 400, {message: `Incorrect arguments: ${JSON.stringify(args)}.`, error: `protocolAddUser: ${JSON.stringify(args)}`});
}

function protocolEditCountryCurry(countryFunc) {
	return (args, response) => {
		if(isValidArgUsername(args) && isValidArgCountry(args)) {
			countryFunc(args.username, args.country)
				.then(wasAdded => respond(response, 'text/plain', wasAdded ? 201 : 208, {}))
				.catch(error => {
					if(error instanceof logger.LogInfo && error.status === 'unregistered user')
						respond(response, 'text/plain', 404, {message: 'User not found', error: error});
					else
						respond(response, 'text/plain', 500, {message: 'Something went wrong with the server.', error: error});
				});
		} else
			respond(response, 'text/plain', 400, {message: `Incorrect arguments: ${JSON.stringify(args)}.`, error: `protocolEditCountryCurry: ${JSON.stringify(args)}`});
	}
}

// A static object that contain the callback for each protocol.
const supportedProtocols = {
	GET: { // All the functions must have signature: (args, response) => void
		daily: protocolDaily,
		countryList: protocolCountryList,
		numOfDeath: protocolNumOfStatusCurry('deaths'),
		numOfConfirmed: protocolNumOfStatusCurry('confirmed'),
		highestDeaths: protocolHighestStatusCurry('deaths'),
		highestConfirmed: protocolHighestStatusCurry('confirmed')
	},
	POST: { // All the functions must have signature: (args, response) => void
		addUser: protocolAddUser,
		addCountry: protocolEditCountryCurry(userDatabase.addCountry.bind(userDatabase)),
		removeCountry: protocolEditCountryCurry(userDatabase.deleteCountry.bind(userDatabase))
	}
}

function getRequestHandler(request, response, getMethods) {
	const args = urlToArguments(request.url);
	if(args.protocol === undefined) {
		const msg = 'Request without protocol parameter';
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}

	const protocolFunction = getMethods[args.protocol];
	if(protocolFunction === undefined) {
		const msg = `Request with unknown protocol: ${args.protocol}`;
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}

	protocolFunction(args, response);
}

function postRequestHandler(request, response, postMethods) {
	if(request.headers['content-type'] !== 'application/json') {
		const msg = 'POST request content-type has to be application/json';
		respond(response, 'text/plain', 400, {message: msg, error: msg});
		return;
	}

	let body = '';

	request.on('data', chunk => {
		body += chunk;
		if (body.length > params.maxRequestBodySize)
			request.destroy(new logger.LogInfo('error', 'client sent more data than params.maxRequestBodySize', true));
	});

	request.on('error', error => respond(response, 'text/plain', 413, {message: `Request body has more data than the server allowing to accept`, error: error}));

	request.on('end', () => {
		const jsonData = JSON.parse(body);

		const protocolName = jsonData['protocol'];
		if(protocolName === undefined) {
			const msg = 'Request without protocol parameter';
			respond(response, 'text/plain', 400, {message: msg, error: msg});
			return;
		}

		const protocolFunction = postMethods[protocolName];
		if(protocolFunction === undefined) {
			const msg = `Request with unknown protocol: ${protocolName}`;
			respond(response, 'text/plain', 400, {message: msg, error: msg});
			return;
		}

		protocolFunction(jsonData, response);
	});
}

// The server's event listeners.
function requestHandler(request, response) {
	// TODO: check the path, so we answer according to the path
	const method = supportedProtocols[request.method];

	switch (request.method) {
		case 'GET':
			getRequestHandler(request, response, method);
			break;
		case 'POST':
			postRequestHandler(request, response, method);
			break;
		default: {
			const msg = `Request with unknown http method: ${request.method}`;
			respond(response, 'text/plain', 400, {message: msg, error: msg});
		}
	}
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

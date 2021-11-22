/*
	This file contains any functionality of getting information from covid-19 API.
	Only CovidTempDatabase.js should be using this module.
*/
const https = require('https');
const params = require('./globalParameters');


const optionsForHttpsGet = {
	hostname: params.covidAPIurl,
	port: params.covidAPIport,
	path: null // Note: even though this is const, 'path' can still be changed.
};

/**
 * Preforms query to the covid-19 API.
 * @param route			<string>	Type of route ('cases', 'history', etc).
 * @param options		<object>	If route is 'cases' it should have 'country' property.
 * 														If route is 'history' it should have 'country' and 'status' property.
 * @return {Promise}	a promise that will check if the input is valid, if so, will send https GET to covid19-API.
 * 										which returns the API's output as JSON.
 */
function query(route, options) {
	return new Promise((resolve, reject) => {
		optionsForHttpsGet.path = params.covidAPIroutesPrefix + `/${route}`;

		// Checking for current input
		switch (route) {
			case 'cases':
				if(!options.hasOwnProperty('country'))
					reject("Route 'cases' requires 'country' as property in 'options'");
				// Technically covid's API does support not adding country, but our protocol does require it.
				optionsForHttpsGet.path += `?country=${options.country}`;
				break;
			case 'history':
				if(!options.hasOwnProperty('country'))
					reject("Route 'history' requires 'country' as property in 'options'");
				if(!options.hasOwnProperty('status'))
					reject("Route 'history' requires 'status' as property in 'options'");
				optionsForHttpsGet.path += `?country=${options.country}&status=${options.status}`;
				break;
			default:
				reject(`Unsupported route: ${route}`);
		}

		// Preforming the actual query
		https.get(optionsForHttpsGet, response => {
			let data = '';
			response.on('data', chunk => data += chunk);
			response.on('end', () => resolve(JSON.parse(data)));
		}).on('error', error => reject(error));

	});
}

/*
// Test for query
query('cases', {country: 'Israel'})
	.then(msg => console.log('then', JSON.stringify(msg)))
	.catch(msg => console.log('catch', msg));

query('history', {country: 'Israel', status: 'deaths'})
	.then(msg => console.log('then', JSON.stringify(msg)))
	.catch(msg => console.log('catch', msg));

query('history', {country: 'Israel', status: 'confirmed'})
	.then(msg => console.log('then', JSON.stringify(msg)))
	.catch(msg => console.log('catch', msg));
*/

module.exports.query = query;
/*
	This file contains any functionality of getting information from covid-19 API.
	Only CovidTempDatabase.js should be using this module.
*/
const https = require('https');
const params = require('./globalParameters');
const logger = require('./logger');


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
async function queryAsync(route, options) {
	return new Promise((resolve, reject) => {
		optionsForHttpsGet.path = params.covidAPIroutesPrefix + `/${route}`;

		switch (route) {
			case 'cases':
				optionsForHttpsGet.path += `?country=${options.country}`;
				break;
			case 'history':
				optionsForHttpsGet.path += `?country=${options.country}&status=${options.status}`;
				break;
			default:
				reject(`Unsupported route: ${route}`);
		}

		// Preforming the actual query
		https.get(optionsForHttpsGet, response => {
			let data = '';
			response.on('data', chunk => {
				data += chunk;
				if (data.length > params.maxResponseBodySize)
					response.destroy(new logger.LogInfo('error', 'client sent more data than params.maxResponseBodySize', true));
			});
			response.on('error', reject);
			response.on('end', () => {
				const jsonData = JSON.parse(data);
				if (jsonData['All'] === undefined)
					reject(new logger.LogInfo('args not found', `Incorrect query input: route=${route}, options=${JSON.stringify(options)}`, true));
				else
					resolve(jsonData);
			});
		}).on('error', reject);

	});
}

/**
 * Convert the server's date to covid19-API conventions.
 * @param date	<string> a date according to the server format.
 * @return {string} a date according to covid19-API format.
 */
function parseDate(date) {
	const values = date.split('-');
	return `${values[2]}-${values[1]}-${values[0]}`;
}

/**
 * Convert a string to lowercase except for the first character.
 * Will be used to convert to covid19-API's county conventions.
 * @param country	<string> a country name.
 * @return {string} a country according to covid19-API format.
 */
function upperCaseFirstLetterRestLowerCase(country) {
	return country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
}

function isValidStatus(status) {
	return status === 'deaths' || status === 'confirmed';
}

module.exports = {
	queryAsync: queryAsync,
	parseDate: parseDate,
	parseCountry: upperCaseFirstLetterRestLowerCase,
	isValidStatus: isValidStatus
};
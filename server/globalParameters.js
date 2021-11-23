/*
	Global Parameters - change them according to your needs.
*/
module.exports = {
	debugFlag: true, // TODO: delete this in the future.
	covidAPIurl: 'covid-api.mmediagroup.fr', // In case it will be changed in the future.
	covidAPIroutesPrefix: '/v1', /*	If they choose to remove it in the future, change it to ''.
																	If it gets longer, make sure it always ends without '/',
																	for example: '/v1/shimi'. */
	covidAPIport: 443,
	queryStoringDuration: 600000, /* How long each query will be cached until its invalid
																	(thus needs to query again the API).
																	The number is in millisecond, so in our case 10 minutes.
																	According to the API is shouldn't be any lower than 10 minutes. */
	maxResponseBodySize: 5e6, // Cap for response's body size (~5MB).
	maxRequestBodySize: 1e6 // Cap for request's body size (~1MB).
};
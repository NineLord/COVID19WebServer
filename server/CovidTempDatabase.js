/*
	This file will temporarily save the data that was pulled from
	http://covid-api.mmediagroup.fr/v1 .
	To not overload their server with too many requests.

	Since they stated:
	"If you make absurd amounts of requests to our API we will block you.
	[...]
	Please cache the API responses with a lifetime of at least 10 minutes to avoid this happening."
*/
const covidAPI = require('./covidAPI');
const logger = require('./logger');
const params = require('./globalParameters');
const HashMapExpire = require('./HashMapExpire');


/*
	Note: our database isn't persistent between server shutdowns.
	There is no reason to do it, because the values here
	are stored temporarily until they are outdated.
 */
class CovidTempDatabase {
	#database;

	constructor() {
		/*
			I chose to use MapExpire because it will automatically remove his keys
			after params.queryStoringDuration millisecond.

			Also, The database is split between route to avoid conflict between the saved data.
		*/
		this.#database = {
			cases: new HashMapExpire(),
			history: new HashMapExpire()
		};
	}

	/**
	 * Check the database if the data is already there.
	 * If so, return it.
	 * Otherwise query covid19-API for it (and save the data for future queries).
	 * @param route		<string>	Type of route ('cases', 'history', etc).
	 * @param options	<object>	If route is 'cases' it should have 'country' property.
	 * 													If route is 'history' it should have 'country' and 'status' property.
	 * @return {Promise}	Returns with the data or an error.
	 */
	async getInfoAsync(route, options) {
		const info = this.#database[route].get(options);
		if(info === undefined) {
			return covidAPI.queryAsync(route, options)
				.then(queryJson => {
					const data = CovidTempDatabase.#convertQueryToData(route, options, queryJson); // If it throws, catch() will get it.
					this.#database[route].set(options, data, params.queryStoringDuration);
					return data;
				});
		} else
			return info;
	}

	/**
	 * Given countries list, will query covid19-API for each one of them.
	 * @param countriesIter	<iterator>	iterator of the countries list.
	 * @param route		<string>	Type of route ('cases', 'history', etc).
	 * @param options	<object>	If route is 'history' it should have 'status' property.
	 * @return {Promise}	Returns with all the data or an error.
	 */
	async getInfoForListAsync(countriesIter, route, options={}) {
		let promisesData = [];
		let currCountry = countriesIter.next();

		while (!currCountry.done) {
			if(options.hasOwnProperty('status'))
				promisesData.push(this.getInfoAsync(route, {country: currCountry.value, status: options.status}));
			else
				promisesData.push(this.getInfoAsync(route, {country: currCountry.value}));
			currCountry = countriesIter.next();
		}
		return Promise.all(promisesData);
	}

	/**
	 * This function is here to filler out unused information that we get from the query,
	 * so we can save memory space.
	 * Change this function if in the future we will need other information from the query (or all of it).
	 *
	 * We pass route and options even if they aren't being used at the moment,
	 * in case in the future the result will depend on them.
	 * @param route			<string>	Type of route ('cases', 'history', etc).
	 * @param options		<object>	If route is 'cases' it should have 'country' property.
	 * 														If route is 'history' it should have 'country' and 'status' property.
	 * @param queryJson	<JSON>		Should be the result of covidAPI.query().
	 * @return {{recovered: *, confirmed: *, deaths: *}|{dates: *}}	Object representing the data needed from the query.
	 */
	static #convertQueryToData(route, options, queryJson) {
		const innerJson = queryJson['All'];

		// Note: the 'country' is ALSO saved here (and part of the key).
		// This is done to be able to know whose country this data belong to
		// when we query the database for a list of countries.
		switch (route) {
			case 'cases':
				return {
					confirmed: innerJson['confirmed'],
					deaths: innerJson['deaths'],
					country: innerJson['country'],
					population: innerJson['population']
				};
			case 'history':
				return {
					country: innerJson['country'],
					population: innerJson['population'],
					dates: innerJson['dates']
				};
			default:
				throw new logger.LogInfo('error', 'convertQueryToData: unsupported route', true);
		}
	}

}

// Note: this is a singleton, to protect us from having more than one database.
module.exports = new CovidTempDatabase();

/*
// Test
const database = new CovidTempDatabase();
database.getInfo('cases', {country: 'shimi'})
	.then(output => console.log(`then: ${output}`))
	.catch(output => console.log(`catch: ${output}`));
*/
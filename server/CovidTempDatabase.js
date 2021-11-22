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
	getInfo(route, options) {
		const info = this.#database[route].get(options);
		if(info === undefined) {
			return covidAPI.query(route, options)
				.then(queryJson => {
					const data = CovidTempDatabase.#convertQueryToData(route, options, queryJson); // If it throws, catch() will get it.
					this.#database[route].set(options, data, params.queryStoringDuration);
					return data;
				});
		} else
			return Promise.resolve(info);
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

		switch (route) { // TODO: change this soon, when I know the exact fields that I need.
			case 'cases':
				return {
					confirmed: innerJson['confirmed'],
					recovered: innerJson['recovered'],
					deaths: innerJson['deaths']
				};
			case 'history':
				return { // Note: even though it has only 1 property, we will keep it like that to be flexible in the future.
					dates: innerJson['dates']
				}
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
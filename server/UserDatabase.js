/*
	This database will remember the "users" and their current state.
*/
const logger = require('./logger');

class UserDatabase {
	/*
	* The database going to be a map,
	* whereas the keys are the usernames,
	* and the values are set of countries.
	*/
	#database;

	constructor() {
		this.#database = new Map();
	}

	static #parseUserName(username) {
		return username.toLowerCase();
	}

	/**
	 * Tries to add new user to the database.
	 * @param username	<string> representing the username.
	 * @return {Promise<boolean>}	true if the user was added,
	 * 														otherwise false (if he already exists).
	 */
	async addUser(username) {
		const parsedUsername = UserDatabase.#parseUserName(username);
		if(this.#database.has(parsedUsername))
			return false;
		else {
			this.#database.set(parsedUsername, new Set());
			return true;
		}
	}

	/**
	 * Tries to delete the user to the database.
	 * @param username	<string> representing the username.
	 * @return {Promise<boolean>}	true if the user was deleted,
	 * 														otherwise false (if he didn't exists).
	 */
	async deleteUser(username) { // Not part of the assigment, but exists for testing.
		const parsedUsername = UserDatabase.#parseUserName(username);
		return this.#database.delete(parsedUsername);
	}

	/**
	 * Tries to add new country to the specific user in the database.
	 * @param username	<string> representing the username.
	 * @param country		<string> representing the country.
	 * @return {Promise<boolean>}	true if the country was added,
	 * 														otherwise false (if it already exists).
	 * @throws {logger.LogInfo} if the user wasn't in the database.
	 */
	async addCountry(username, country) {
		const parsedUsername = UserDatabase.#parseUserName(username);
		if(!this.#database.has(parsedUsername))
			throw new logger.LogInfo('unregistered user', "Username didn't register before performing addCountry()", true);

		const countries = this.#database.get(parsedUsername);
		if(countries.has(country))
			return false;
		else {
			countries.add(country);
			return true;
		}
	}

	/**
	 * Tries to delete the country from a specific user in the database.
	 * @param username	<string> representing the username.
	 * @param country		<string> representing the country.
	 * @return {Promise<boolean>}	true if the country was deleted,
	 * 										otherwise false (if it didn't exists).
	 * @throws {logger.LogInfo} if the user wasn't in the database.
	 */
	async deleteCountry(username, country) {
		const parsedUsername = UserDatabase.#parseUserName(username);
		if(!this.#database.has(parsedUsername))
			throw new logger.LogInfo('unregistered user', "Username didn't register before performing deleteCountry()", true);

		const countries = this.#database.get(parsedUsername);
		return countries.delete(country);
	}

	/**
	 * Return an iterator of the countries set.
	 * Note: Returning iterator instead of the set,
	 * to not allow modifying the set outside of this class.
	 * @param username	<string> representing the username.
	 * @return {Promise<iterator>}	iterator of the countries set.
	 * @throws {logger.LogInfo} if the user wasn't in the database.
	 */
	async getCountries(username) {
		const parsedUsername = UserDatabase.#parseUserName(username);
		if(!this.#database.has(parsedUsername))
			throw new logger.LogInfo('unregistered user', "Username didn't register before performing deleteCountry()", true);

		return this.#database.get(parsedUsername).values();
	}

	/**
	 * Return a string representing the set of countries for the user.
	 * @param username	<string> representing the username.
	 * @return {Promise<string>}	country list as string.
	 */
	async getCountriesString(username) {
		const parsedUsername = UserDatabase.#parseUserName(username);
		if(!this.#database.has(parsedUsername))
			throw new logger.LogInfo('unregistered user', "Username didn't register before performing deleteCountry()", true);

		const countriesSet = this.#database.get(parsedUsername);
		const countriesSetEntries = countriesSet.entries();
		const countriesEntriesArray = Array.from(countriesSetEntries);
		const countriesArray = countriesEntriesArray.map(entry => entry[0]);
		return JSON.stringify(countriesArray);
	}

	/* This data should be persistence between server shutdowns.
	 * Thus, we have serialize and deserialize functions.
	 * They don't need to be async as they will be called once
	 * before the server start and when he is finished.
	 *
	 * Obviously, we should use a database like SQL instead.
	 * But this is outside of the score of this project.
	 */
	serialize() {
		const dbAsObj = {
			dataType: 'Map',
			value: Array.from(this.#database.entries())
				.map(entry => [entry[0], {
					dataType: 'Set',
					value: Array.from(entry[1].entries()).map(entry => entry[0])
				}])
		}
		return JSON.stringify(dbAsObj);
	}

	deserialize(data) {
		const dataJson = JSON.parse(data);
		this.#database = new Map();

		if(dataJson['dataType'] === undefined || dataJson['dataType'] !== 'Map')
			throw new logger.LogInfo('error', `Invalid serialize data:\n${dataJson}`, true);

		const mapEntriesJson = dataJson['value'];
		for(const index in mapEntriesJson) {
			const entryJson = mapEntriesJson[index];
			if(entryJson[1]['dataType'] === undefined || entryJson[1]['dataType'] !== 'Set')
				throw new logger.LogInfo('error', `Invalid serialize data:\n${dataJson}`, true);

			this.#database.set(entryJson[0], new Set(entryJson[1]['value']));
		}
	}
}

// Note: this is a singleton, to protect us from having more than one database.
module.exports = new UserDatabase();
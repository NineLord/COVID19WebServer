const MapExpire = require('map-expire/MapExpire');

/**
 * A wrapper to MapExpire which works only with object key.
 * It will convert the object to string (so we don't have to work with pointers).
 */
class HashMapExpire extends MapExpire {

	constructor(values, options) {
		super(values, options);
	}

	set(key, value, duration) {
		super.set(HashMapExpire.#hashcode(key), value, duration);
	}

	get(key) {
		return super.get(HashMapExpire.#hashcode(key));
	}

	delete(key){
		super.delete(HashMapExpire.#hashcode(key));
	}

	/**
	 * Convert object to primitive string (so the map keys won't be pointers).
	 * @param mapKey		<object> with any properties.
	 * @return {string}	primitive key.
	 */
	static #hashcode(mapKey) {
		let hashedKey = '';
		for (const [key, value] of Object.entries(mapKey)) {
			// Note: Object.entries always give the same order,
			// so the objects has to be created with the same order of properties.
			// Otherwise, we need to use .sort() to avoid same key but different properties order.
			hashedKey += key.toString() + value.toString();
		}
		return hashedKey;
	}
}

module.exports = HashMapExpire;

/*
// Small test to see that it really works

const map = new HashMapExpire();
const key1 = {
	s: 1
};

map.set(key1, 'found', 1000);
console.log(map.get(key1)); // found
key1.s = 2;
console.log(map.get(key1)); // undefined
console.log(map.get({s: 1})); // found
console.log(map.get({s: 2})); // undefined
*/
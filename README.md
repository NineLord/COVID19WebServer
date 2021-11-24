# COVID19WebServer

This project is a home assignment about creating a simple web server utilizing [Covid-19 API](https://github.com/M-Media-Group/Covid-19-API).

## Requirements / Installation
This project is written in Node.js and was tested on v14.18.1.  
To install it on linux machine run the following:
```
sudo apt install nodejs
```

Other dependencies:
* [map-expire](https://www.npmjs.com/package/map-expire):
  ```
  npm install map-expire
  ```

## How to run the server
Simply run the main file, like so:
```
node main.js <hostname> <port>
```

Whereas `<hostname>` is a string of the hostname and `<port>` is an integer of the listing port.  
For example:
```
node main.js localhost 8080
```

## How to interact with the server (protocol)
As a web server we work with http protocol.  

Protocol base:  
http://`<hostname>`:`<port>`

#### Daily new confirmed cases in a given country
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=daily`.
* Required query parameters:
  * country: `string` of any country name.
  * date: `string` of the date format `DD-MM-YYYY`.
* Return: non-negative `int`.
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=daily&country=France&date=25-10-2021"
    ```
  * Output:
    ```
    1283
    ```

</p>
</details>

#### Register a user
<details><summary>Click to Expand</summary>
<p>

* Method: `POST`.
* Base: `/`.
* Body: `JSON`.
* Required query parameters:
  * protocol: The following `string`: `addUser`.
  * username: `string` of a username (no spaces, case insensitive).
* Return: none.
* Example:
  * Input:
    ```
    curl --header "Content-Type: application/json" \
         --request POST \
         --data '{"protocol": "addUser", "username":"Shimi"}' \
         "http://localhost:8080/"
    ```

</p>
</details>

#### Add a country to user's list
<details><summary>Click to Expand</summary>
<p>

* Method: `POST`.
* Base: `/`.
* Body: `JSON`.
* Required query parameters:
  * protocol: The following `string`: `addCountry`.
  * username: `string` of a username (no spaces, case insensitive).
  * country: `string` of any country name.
* Return: none.
* Example:
  * Input:
    ```
    curl --header "Content-Type: application/json" \
         --request POST \
         --data '{"protocol": "addCountry", "username":"Shimi", "country":"France"}' \
         "http://localhost:8080/"
    ```

</p>
</details>

#### Remove a country to user's list
<details><summary>Click to Expand</summary>
<p>

* Method: `POST`.
* Base: `/`.
* Body: `JSON`.
* Required query parameters:
  * protocol: The following `string`: `removeCountry`.
  * username: `string` of a username (no spaces, case insensitive).
  * country: `string` of any country name.
* Return: none.
* Example:
  * Input:
    ```
    curl --header "Content-Type: application/json" \
         --request POST \
         --data '{"protocol": "removeCountry", "username":"Shimi", "country":"France"}' \
         "http://localhost:8080/"
    ```

</p>
</details>

#### Get user's country list
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=countryList`.
* Required query parameters:
  * username: `string` of a username (no spaces, case insensitive).
* Return: `JSON` with array of countries.
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=countryList&username=Shimi"
    ```
  * Output:
    ```json
    [
      "France",
      "Germany"
    ]
    ```

</p>
</details>

#### Get the number of deaths cases for each country in the user's list at a given date range
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=numOfDeath`.
* Required query parameters:
  * username: `string` of a username (no spaces, case insensitive).
  * from: `string` of the date format `DD-MM-YYYY`.
  * to: `string` of the date format `DD-MM-YYYY`.
* Return: `JSON` with which maps each country to his dates (each date maps to the number of deaths cases).
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=numOfDeath&username=Shimi&from=25-10-2021&to=28-10-2021"
    ```
  * Output:
    ```json
    {
      "France": {
        "25-10-2021": 43,
        "26-10-2021": 28,
        "27-10-2021": 33,
        "28-10-2021": 28
      },
      "Germany": {
        "25-10-2021": 27,
        "26-10-2021": 217,
        "27-10-2021": 124,
        "28-10-2021": 33
      }
    }
    ```

</p>
</details>

#### Get the number of confirmed cases for each country in the user's list at a given date range
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=numOfConfirmed`.
* Required query parameters:
  * username: `string` of a username (no spaces, case insensitive).
  * from: `string` of the date format `DD-MM-YYYY`.
  * to: `string` of the date format `DD-MM-YYYY`.
* Return: `JSON` with which maps each country to his dates (each date maps to the number of confirmed cases).
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=numOfConfirmed&username=Shimi&from=25-10-2021&to=28-10-2021"
    ```
  * Output:
    ```json
    {
      "France": {
        "25-10-2021": 1283,
        "26-10-2021": 6040,
        "27-10-2021": 6528,
        "28-10-2021": 5899
      },
      "Germany": {
        "25-10-2021": 9359,
        "26-10-2021": 31402,
        "27-10-2021": 28826,
        "28-10-2021": 8079
      }
    }
    ```

</p>
</details>

#### Get the country (from the user's list) with the highest deaths cases relative to the country population
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=highestDeaths`.
* Required query parameters:
  * username: `string` of a username (no spaces, case insensitive).
  * from: `string` of the date format `DD-MM-YYYY`.
  * to: `string` of the date format `DD-MM-YYYY`.
* Return: `JSON` with which maps each date to his country.
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=highestDeaths&username=Shimi&from=25-10-2021&to=28-10-2021"
    ```
  * Output:
    ```json
    {
      "25-10-2021": "France",
      "26-10-2021": "France",
      "27-10-2021": "France",
      "28-10-2021": "France"
    }
    ```

</p>
</details>

#### Get the country (from the user's list) with the highest confirmed cases relative to the country population
<details><summary>Click to Expand</summary>
<p>

* Method: `GET`.
* Base: `/?protocol=highestConfirmed`.
* Required query parameters:
  * username: `string` of a username (no spaces, case insensitive).
  * from: `string` of the date format `DD-MM-YYYY`.
  * to: `string` of the date format `DD-MM-YYYY`.
* Return: `JSON` with which maps each date to his country.
* Example:
  * Input:
    ```
    curl "http://localhost:8080/?protocol=highestConfirmed&username=Shimi&from=25-10-2021&to=28-10-2021"
    ```
  * Output:
    ```json
    {
      "25-10-2021": "France",
      "26-10-2021": "France",
      "27-10-2021": "France",
      "28-10-2021": "France"
    }
    ```

</p>
</details>

## Further places to expand the project
* Expand the logging system (logger.js). Currently, it's in his bare bones.
  * Move all the error messages to be static in the logger to help with consistency.
* handlers.js is starting to become quit robust.
  * It would help to move the validation functions to a new file.
  * Maybe also the date related functions.
* Create a new module for the server protocol.
  * It will hold functions related to conversion between the protocol and other formats.
  * Keeping statically the protocol properties (like `country`).
* CovidTempDatabase.js does not merge the data from `/history` and `/cases`. It may be more convenient to merge them.
* UserDatabase.js is not persistent between shutdowns, it has the serialize & deserialize functions, but they are not utilized yet.
  * Worth changing this database to a persistent one like SQL, to avoid losing data between crushes.
* The server always works with root (`/`) path, it would be better to expand it to work with other paths too.
* Create test folder with automatic tests using `curl`.

## Known bugs
* Any query which requires data on ranges of dates, does not work with the today date. It requires performing 2 queries to covid19-API, which it doesn't at the moment.

# Credit
This project was written by [@github/NineLord](https://github.com/NineLord).

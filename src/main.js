// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions

import { Brapci } from './databases/brapci.js';
import { Enancib } from './databases/enancib.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

const availableDBs = [
    "enancib", 
    "brapci"
    //"scielo"
];

let datasets = [];

for (const dbName of availableDBs) {
    let dataset = [];
    if (dbName === "brapci") {
        try {
            dataset = await Brapci.fetchData();
        } catch (error) {
            console.error(`Error fetching data from Brapci: ${error.message}`);
        }
    } else if(dbName === "enancib") {
        try {
            dataset = await Enancib.fetchData();
        } catch (error) {
            console.error(`Error fetching data from Enancib: ${error.message}`);
        }
    }else {
        //dataset = await fetchScieloStrategy();
    }
    datasets.push(...dataset); // Using spread operator to add items to datasets array
}

// Save results to Dataset - a table-like storage.
//await Actor.pushData(datasets);
for (const item of datasets) {
    //check if item is an object and not null or empty
    if (typeof item === 'object' && item !== null && Object.keys(item).length > 0) {
        await Actor.pushData(item);
    }
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();
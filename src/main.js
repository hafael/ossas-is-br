// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
// Axios - Promise based HTTP client for the browser and node.js (Read more at https://axios-http.com/docs/intro).
import axios from 'axios';
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions

// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio';

import FormData from 'form-data';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// Structure of input is defined in input_schema.json
const input = await Actor.getInput();
const { searchQuery, fromYear, toYear, databases } = input;
const availableDBs = [
    "enancib", 
    "brapci"
    //"scielo"
];

const fetchBrapciStrategy = async () => {

    const url = "https://cip.brapci.inf.br/api/brapci/search/v3";

    // Fetch the HTML content of the page.
    let formData = new FormData();

    formData.append('user', '');
    formData.append('session', 'sc_1750462286528');
    formData.append('term', searchQuery);
    if (fromYear !== '' && fromYear !== null && fromYear !== undefined) {
        formData.append('year_start', fromYear);
    }
    if (toYear !== '' && toYear !== null && toYear !== undefined) {
        formData.append('year_end', toYear);
    }
    formData.append('field', 'FL');
    formData.append('collection', 'JA,JE,EV,BK');
    formData.append('api_version', '3');
    formData.append('offset', '15');

    let response;

    try {
        response = await axios.post(url, formData);
        //console.log('Results from Brapci database', response.data);
    } catch (error) {
        console.error('Failed to search on Brapci database', error);  
    }

    if (response.data.total === 0) return [];

    // Extract all headings from the page (tag name and text).
    let results = [];
    const works = response.data.works || [];

    // Filter out works that do not have data or are empty.
    const items = works.filter(el => el.data && Object.keys(el.data).length > 0);

    items.forEach((el) => {

        //Legend data example 'AtoZ: Novas Práticas em Informação e Conhecimento, v. 10, n. 3, 2021'
        const legend = el.data["LEGEND"];
        
        const publicationYear = el.year || (legend ? legend.split(',')[1].trim().split(' ')[1] : null);
        const publicationVolume = legend ? legend.split(',')[1].trim().split(' ')[0] : null;
        const publicationNumber = legend ? legend.split(',')[1].trim().split(' ')[2] : null;
        
        const itemObject = {
            id: el.id,
            document_type: el.type,
            document_url: "https://brapci.inf.br/v/" + el.id,
            session: el.data["SESSION"],
            publication_year: el.year,
            authors: String(el.data["AUTHORS"]).split(',').map(author => author.trim()),
            journal: el.data["JOURNAL"],
            keywords: el.data["KEYWORDS"],
            title: el.data["TITLE"],
            legend: el.data["LEGEND"],
            cover: el.data["cover"],
            relevance_score: el.score,
            database: "Brapci",
            metadata: {
                idj: el.data["IDJ"],
                id_jnl: el.data["id_jnl"],
                issue: el.data["ISSUE"],
                year: publicationYear,
                publication_volume: publicationVolume,
                publication_number: publicationNumber,
            }
        };
        results.push(itemObject);
    });

    return results;
}

const fetchEnancibStrategy = async (page) => {

    const url = `https://search.scielo.org/?fb=&q=${searchQuery}&lang=pt&count=100&from=1&output=site&sort=&format=summary&page=1&where=&filter%5Bla%5D%5B%5D=*&filter%5Bsubject_area%5D%5B%5D=Applied+Social+Sciences`;

    // Fetch the HTML content of the page.
    let response;

    try {
        response = await axios.get("https://enancib.ancib.org/index.php/enancib/xxvenancib/search/advancedResults", {
            params: {
                query: searchQuery,
                dateFromYear: fromYear,
                dateToYear: toYear,
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
        });
        //console.log('Results from Enancib database', response.data);
    } catch (error) {
        console.error('Failed to search on Enancib database', error);  
    }

    //console.log('Enancib response', response.data);

    if(response.data == null){
        return [];
    }

    // Parse the downloaded HTML with Cheerio to enable data extraction.
    const $ = cheerio.load(response.data);

    // Extract all results from the page (tag name and text).
    let results = [];

    $('#results table tbody tr').each((i, element) => {

        //Ignore as 3 primeiras tr: são cabeçalhos
        //A cada 2 tr, temos um item e um autor. A próxima tr é um separador e deve ser ignorado

        if (i < 3 || i % 2 === 0) {
            return; // Skip the first three rows and every even row
        }
        
        const itemRow = $(element);
        const authorRow = $(element).next('tr');

        const title = itemRow.children('td:first').next().text().trim();
        const journal = itemRow.children('td:first').text().trim();
        const id = String(itemRow.find('td:eq(2) a:first').prop('href')).split('/').pop(); // Extract the ID from the URL
        const abstractPdfUrl = itemRow.find('td:eq(2) a:first').prop('href');
        const documentUrl = itemRow.find('td:eq(2) a:eq(2)').prop('href');
        let authors = authorRow.children('td:first').text().trim();
        authors = authors.replace(/[^a-zA-Z0-9, ]/g, '').split(',').map(author => author.trim()).filter(author => author.length > 0);

        const itemObject = {
            id: id || null,
            document_type: null,
            document_url: documentUrl || null,
            session: null,
            publication_year: null,
            authors: authors || null,
            journal: journal || null,
            keywords: null,
            title: title || null,
            legend: null,
            cover: null,
            relevance_score: null,
            database: "Enancib",
            metadata: {
                abstract_pdf_url: abstractPdfUrl || null,
            }
        };
        results.push(itemObject);
    });

    return results;
}

const fetchScieloStrategy = async (page) => {

    const url = `https://search.scielo.org/?fb=&q=${searchQuery}&lang=pt&count=100&from=1&output=site&sort=&format=summary&page=1&where=&filter%5Bla%5D%5B%5D=*&filter%5Bsubject_area%5D%5B%5D=Applied+Social+Sciences`;

    // Fetch the HTML content of the page.
    let response;

    try {
        response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
        });
        console.log('Results from Scielo database', response.data);
    } catch (error) {
        console.error('Failed to search on Scielo database', error);  
    }

    console.log('Scielo response', response.data);

    if(response.data == null){
        return [];
    }

    // Parse the downloaded HTML with Cheerio to enable data extraction.
    const $ = cheerio.load(response.data);

    // Extract all results from the page (tag name and text).
    let results = [];
    $('div.results > div.item').each((i, element) => {

        // const authors = [];

        // $(element).children('div:eq(2) .authors a.author').map((i, authorEl) => {
        //     authors.push($(authorEl).text());
        // });

        const itemObject = {
            
            id: $(element).prop('id'),
            //document_type: el.type,
            document_url: $(element).children('div:eq(2) .line a').prop('href'),
            //session: $(element).children('div:eq(2) .source span:eq(1) a').text(),
            publication_year: $(element).children('div:eq(2) .source span:eq(3)').text(),
            authors: $(element).children('div:eq(2) .authors').text(),
            journal: $(element).children('div:eq(2) .source span:eq(1) a').text(),
            //keywords: el.data["KEYWORDS"],
            title: $(element).children('div:eq(2) .line a strong').text(),
            //legend: el.data["LEGEND"],
            //cover: el.data["cover"],
            //relevance_score: el.score,
            database: "Scielo",
            metadata: {
                doi_url: $(element).children('div:eq(2) .metadata .DOIResults a').prop('href'),
                publication_date: $(element).children('div:eq(2) .source span:eq(2)').text() + ' ' + $(element).children('div:eq(2) .source span:eq(3)').text(),
                volume: $(element).children('div:eq(2) .source span:eq(5)').text(),
                number: $(element).children('div:eq(2) .source span:eq(7)').text(),
                elocation: $(element).children('div:eq(2) .source span:eq(9)').text(),
            }

        };
        console.log('Extracted heading', itemObject);
        results.push(itemObject);
    });

    return results;
}

let datasets = [];

for (const dbName of availableDBs) {
    let dataset = [];
    if (dbName === "brapci") {
        dataset = await fetchBrapciStrategy();
    } else if(dbName === "enancib") {
        dataset = await fetchEnancibStrategy();
    }else {
        //dataset = await fetchScieloStrategy();
    }
    datasets = datasets.concat(dataset);
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
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

// Axios - Promise based HTTP client for the browser and node.js (Read more at https://axios-http.com/docs/intro).
import axios from 'axios';
// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio';

class Scielo {

    // Fetch data from Enancib database.
    static async fetchData(page = 1) {
        return await fetchData(page);
    }
}

const fetchData = async (page = 1) => {

    // Structure of input is defined in input_schema.json
    const input = await Actor.getInput();
    const { searchQuery, fromYear, toYear, databases } = input;

    const url = `https://search.scielo.org/?fb=&q=${searchQuery}&lang=pt&count=100&from=${(page - 1) * 100 + 1}&output=site&sort=&format=summary&page=${page}&where=&filter%5Bla%5D%5B%5D=*&filter%5Bsubject_area%5D%5B%5D=Applied+Social+Sciences`;

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
        //console.log('Results from Scielo database', response.data);
    } catch (error) {
        //console.error('Failed to search on Scielo database', error);  
    }

    //console.log('Scielo response', response.data);

    if(response.data == null){
        return [];
    }

    // Parse the downloaded HTML with Cheerio to enable data extraction.
    const $ = cheerio.load(response.data);

    // Extract all results from the page (tag name and text).
    let results = [];
    $('div.results > div.item').each((i, element) => {

        // Get comma separated authors list.
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
        //console.log('Extracted heading', itemObject);
        results.push(itemObject);
    });

    return results;
}

export { Scielo };
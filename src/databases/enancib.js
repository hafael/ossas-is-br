// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

// Axios - Promise based HTTP client for the browser and node.js (Read more at https://axios-http.com/docs/intro).
import axios from 'axios';
// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio';

class Enancib {

    // Fetch data from Enancib database.
    static async fetchData() {
        return await fetchData();
    }
}

const fetchData = async (page) => {

    // Structure of input is defined in input_schema.json
    const input = await Actor.getInput();
    const { searchQuery, fromYear, toYear, databases } = input;

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
        return [];
    }

    //console.log('Enancib response', response.data);

    if(!response || response.data == null){
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

export { Enancib };
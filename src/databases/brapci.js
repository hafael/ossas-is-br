// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
// Axios - Promise based HTTP client for the browser and node.js (Read more at https://axios-http.com/docs/intro).
import axios from 'axios';
import FormData from 'form-data';

class Brapci {

    // Fetch data from Brapci database.
    static async fetchData() {
        return await fetchData();
    }
}

const fetchData = async () => {

    // Structure of input is defined in input_schema.json
    const input = await Actor.getInput();
    const { searchQuery, fromYear, toYear, databases } = input;

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

export { Brapci };
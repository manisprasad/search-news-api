const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const axiosRetry = require('axios-retry');

const PORT = process.env.PORT || 3000;

const app = express();

// Enable CORS for all routes
app.use(cors());

// Configure axios to use axios-retry
axiosRetry(axios, {
    retries: 3, // Number of retries
    retryDelay: (retryCount) => {
        return retryCount * 2000; // Time interval between retries in milliseconds
    },
    retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error);
    },
});

// Define selectors for elements on the Google News page
const selectors = {
    article: 'article',
    title: 'a',
    publishedBy: 'span.PJK1m',
    newsImage: 'figure img',
    websiteName: 'div.vr1PYe',
    companyImage: 'img',
    time: 'time'
};

// Function to fetch crypto news from Google News
const getCryptoNews = async (query) => {
    const newsArray = [];
    let totalNews = 0;
    let newsNumber = 0;
    try {
        // Fetching news data from Google News
        const response = await axios.get(`https://news.google.com/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`);
        const $ = cheerio.load(response.data);
        
        // Extracting information for each news article
        $(selectors.article).each((index, element) => {
            const title = $(element).find(selectors.title).text() || null;
            const url = 'https://news.google.com' + $(element).find(selectors.title).attr('href').substring(1);
            const publishedBy = $(element).find(selectors.publishedBy).text() || null;
            const newsImage = 'https://news.google.com' + $(element).find(selectors.newsImage).attr('src') || null;
            const websiteName = $(element).find(selectors.websiteName).text() || null;
            const companyImage = $(element).find(selectors.companyImage).attr('src') || null;
            const time = $(element).find(selectors.time).attr('datetime') || null;
            totalNews++;
            // Constructing news object and pushing it to the news array
            newsArray.push({
                id: ++newsNumber,
                title,
                url,
                newsImage,
                websiteName,
                companyImage,
                publishedBy,
                time
            });
        });
    } catch (error) {
        console.error('Error getting news from website:', error);
    }
    return { newsArray, totalNews };
}

// Route to display welcome message
app.get('/', (req, res) => {
    res.send('Welcome to the Crypto News API');
});

// Route to fetch crypto news based on coin name
app.get('/:coinName', async (req, res) => {
    const coinName = req.params.coinName;
    const limit = parseInt(req.query.limit); // Parse limit as integer
    if (!coinName) {
        return res.status(400).json({ error: "Coin name is required" });
    }
    try {
        const news = await getCryptoNews(coinName);
        if (limit) {
            news.newsArray = news.newsArray.slice(0, limit);
        } else {
            news.newsArray = news.newsArray.slice(0, 50);
        }
        res.json({ newsArray: news.newsArray, totalNews: news.totalNews, limit: limit || 50 });
    } catch (error) {
        console.error('Error fetching crypto news:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Starting the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


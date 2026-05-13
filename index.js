const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth plugin upayogikkunnathu vazhi bot detection kuraykkam
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

// Nalla User Agent-ukal random aayi edukkan
const BROWSER_PROFILES = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

app.get('/terabox', async (req, res) => {
    const teraboxUrl = req.query.url;
    
    if (!teraboxUrl) {
        return res.status(400).json({ status: false, message: "TeraBox URL provide cheyyuka (e.g. /terabox?url=...)" });
    }

    let browser;
    try {
        // Render Node runtime-il Buildpack upayogikkumpol executablePath nirbandhamanu
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ],
            headless: "new"
        });

        const page = await browser.newPage();
        
        // Random User Agent set cheyyunnu
        await page.setUserAgent(BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)]);

        // 1. Main site-ilekku poyi Cookies-um CSRF-um generate cheyyikkunnu
        await page.goto('https://flowvideoplayer.com/', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 2. Page source-il ninnu CSRF Token extract cheyyunnu
        const csrfToken = await page.evaluate(() => {
            const token = document.querySelector('meta[name="csrf-token"]')?.content || 
                         window._token || 
                         document.querySelector('input[name="_token"]')?.value;
            return token;
        });

        if (!csrfToken) {
            throw new Error("CSRF Token extract cheyyan pattiyilla.");
        }

        // 3. Page context-il ninnu thanne API request ayakkunnu
        const result = await page.evaluate(async (token, target) => {
            const response = await fetch('https://flowvideoplayer.com/telegram/bot/search/video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token
                },
                body: JSON.stringify({ url: target })
            });
            return response.json();
        }, csrfToken, teraboxUrl);

        await browser.close();

        // Final result response aayi ayakkunnu
        res.json({
            status: true,
            author: "Ansad",
            result: result
        });

    } catch (e) {
        if (browser) await browser.close();
        res.status(500).json({
            status: false,
            error: e.message
        });
    }
});

// Home route (Api live aanonnu nokkan)
app.get('/', (req, res) => {
    res.send('TeraBox Downloader API is Live! Use /terabox?url=LINK');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

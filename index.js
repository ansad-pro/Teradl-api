const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

const BROWSER_PROFILES = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
];

app.get('/terabox', async (req, res) => {
    const teraboxUrl = req.query.url;
    if (!teraboxUrl) return res.status(400).json({ status: false, message: "URL missing" });

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            headless: "new"
        });

        const page = await browser.newPage();
        await page.setUserAgent(BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)]);

        // 1. Visit main site
        await page.goto('https://flowvideoplayer.com/', { waitUntil: 'networkidle2', timeout: 60000 });

        // 2. Extract CSRF Token
        const csrfToken = await page.evaluate(() => {
            return document.querySelector('meta[name="csrf-token"]')?.content || 
                   window._token || 
                   document.querySelector('input[name="_token"]')?.value;
        });

        if (!csrfToken) throw new Error("Token extraction failed");

        // 3. Post to internal API
        const result = await page.evaluate(async (token, target) => {
            const response = await fetch('https://flowvideoplayer.com/telegram/bot/search/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ url: target })
            });
            return response.json();
        }, csrfToken, teraboxUrl);

        await browser.close();
        res.json({ status: true, result: result });

    } catch (e) {
        if (browser) await browser.close();
        res.status(500).json({ status: false, error: e.message });
    }
});

app.listen(PORT, () => console.log(`API Online on port ${PORT}`));

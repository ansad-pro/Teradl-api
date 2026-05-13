const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/terabox', async (req, res) => {
    const teraboxUrl = req.query.url;
    if (!teraboxUrl) return res.status(400).json({ status: false, message: "URL missing" });

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            headless: "new"
        });

        const page = await browser.newPage();
        await page.goto('https://flowvideoplayer.com/', { waitUntil: 'networkidle2' });

        const csrfToken = await page.evaluate(() => {
            return document.querySelector('meta[name="csrf-token"]')?.content || 
                   window._token || 
                   document.querySelector('input[name="_token"]')?.value;
        });

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

app.get('/', (req, res) => res.send('API is Online! Use /terabox?url=LINK'));
app.listen(PORT, () => console.log(`Running on ${PORT}`));

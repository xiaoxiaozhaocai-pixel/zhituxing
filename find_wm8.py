import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        for name, url in [('home', 'https://zhituxing.tech/'), ('auth', 'https://zhituxing.tech/auth')]:
            await pg.goto(url, wait_until='networkidle', timeout=45000)
            await pg.wait_for_timeout(800)
            await pg.screenshot(path=f'wm_cmp_{name}.png', clip={'x':480,'y':0,'width':320,'height':110})
        await b.close()
asyncio.run(main())

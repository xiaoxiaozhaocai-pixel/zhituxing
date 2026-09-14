import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        # 实验1：display:none 干掉 navbar
        await pg.evaluate("document.querySelector('nav').style.display='none'")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='wm_test_nonav.png', clip={'x':540,'y':0,'width':240,'height':120})
        # 实验2：恢复，隐藏卡片
        await pg.evaluate("document.querySelector('nav').style.display=''")
        await pg.evaluate("Array.from(document.querySelectorAll('.max-w-md > .shadow-lg')).forEach(e=>e.style.display='none')")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='wm_test_nocard.png', clip={'x':540,'y':0,'width':240,'height':120})
        await b.close()
asyncio.run(main())

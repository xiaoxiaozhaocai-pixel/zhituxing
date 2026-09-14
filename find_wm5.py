import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        els = await pg.evaluate("""() => {
          return document.elementsFromPoint(640, 70).map(el => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return {tag: el.tagName, cls:(el.className||'').toString().slice(0,80),
                    rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
                    color: st.color, fs: st.fontSize, text:(el.textContent||'').trim().slice(0,25)};
          });
        }""")
        print(json.dumps(els[:10], ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())

import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        info = await pg.evaluate("""() => {
          const probe = (x, y) => {
            const el = document.elementFromPoint(x, y);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const before = getComputedStyle(el, '::before');
            const after = getComputedStyle(el, '::after');
            return {
              tag: el.tagName, cls: (el.className||'').toString().slice(0,70),
              rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
              text: (el.textContent||'').trim().slice(0,20),
              pseudoBeforeContent: before.content.slice(0,30), pseudoBeforeFontSize: before.fontSize,
              pseudoAfterContent: after.content.slice(0,30)
            };
          };
          return { at_640_45: probe(640, 45), at_640_60: probe(640, 60), at_600_40: probe(600, 40) };
        }""")
        print(json.dumps(info, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())

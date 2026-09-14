import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        info = await pg.evaluate("""() => {
          const bg = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const st = getComputedStyle(el);
            return { img: st.backgroundImage.slice(0,120), pos: st.backgroundPosition, size: st.backgroundSize, cls: (el.className||'').toString().slice(0,60) };
          };
          // 也查 main/div 大容器
          const out = { body: bg('body'), html: bg('html') };
          document.querySelectorAll('body > div, body > div > div, main').forEach((el,i) => {
            const st = getComputedStyle(el);
            if (st.backgroundImage !== 'none') out['div_'+i] = {img: st.backgroundImage.slice(0,120), rect: [Math.round(el.getBoundingClientRect().left), Math.round(el.getBoundingClientRect().top)], cls:(el.className||'').toString().slice(0,60)};
          });
          return out;
        }""")
        print(json.dumps(info, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())

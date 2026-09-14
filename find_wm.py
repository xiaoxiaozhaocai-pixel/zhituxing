import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        # 找出顶部中央区域(500<x<800, y<120)所有含文本元素
        els = await pg.evaluate("""() => {
          const out = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.top < 120 && r.left > 400 && r.right < 900 && r.height > 5 && r.height < 200) {
              const t = (el.textContent||'').trim().slice(0,30);
              if (t) out.push({tag: el.tagName, cls: (el.className||'').toString().slice(0,80), top: Math.round(r.top), h: Math.round(r.height), text: t});
            }
          });
          return out;
        }""")
        print(json.dumps(els[:12], ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())

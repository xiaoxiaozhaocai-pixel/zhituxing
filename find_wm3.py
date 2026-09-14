import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        els = await pg.evaluate("""() => {
          const out = [];
          document.querySelectorAll('*').forEach(el => {
            // 直接文本节点（排除子元素文本）
            const direct = Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (direct.includes('职途星') && fs >= 20) {
              const r = el.getBoundingClientRect();
              const st = getComputedStyle(el);
              out.push({cls:(el.className||'').toString().slice(0,90), fs: Math.round(fs), rect:[Math.round(r.left),Math.round(r.top)], color: st.color, opacity: st.opacity, z: st.zIndex, text: direct.slice(0,15)});
            }
          });
          return out;
        }""")
        print(json.dumps(els, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())

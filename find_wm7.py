import asyncio, json, re
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        await pg.goto('https://zhituxing.tech/auth', wait_until='networkidle', timeout=45000)
        html = await pg.evaluate("document.documentElement.outerHTML")
        # 所有"职途星"出现的上下文
        hits = []
        for m in re.finditer('职途星', html):
            ctx = html[max(0,m.start()-220):m.start()+40]
            # 提取最近的标签开头
            tag = re.findall(r'<(\w+)[^>]*class="([^"]{0,90})"[^>]*>', ctx)
            hits.append({'tag': tag[-1] if tag else None, 'tail': ctx[-120:].replace('\n',' ')})
        print(f"共 {len(hits)} 处:")
        for i, h in enumerate(hits):
            print(f"--- {i}: {h['tag']}")
            print(f"    {h['tail'][-110:]}")
        print('nav 数量:', html.count('<nav'))
        await b.close()
asyncio.run(main())

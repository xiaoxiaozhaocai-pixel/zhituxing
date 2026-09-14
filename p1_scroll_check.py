#!/usr/bin/env python3
"""滚动后 sticky 压制复测 + 锚点 scroll-margin 检查"""
from playwright.sync_api import sync_playwright
BASE = "https://zhituxing.tech"

JS_FIXED = """() => {
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky') ) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 400)
        out.push({tag: el.tagName, cls: (el.className||'').toString().slice(0,55), pos: s.position, z: s.zIndex,
                  top: Math.round(r.top), h: Math.round(r.height)});
    }
  });
  return out;
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width":390,"height":844})
    pg = ctx.new_page()
    # 1) /insights 滚动后 InsightsTabs 吸顶，量其底边 vs 后续内容标题
    pg.goto(BASE+"/insights", wait_until="domcontentloaded", timeout=20000)
    pg.wait_for_timeout(2500)
    print("== /insights mobile fixed元素（未滚动）==")
    for f in pg.evaluate(JS_FIXED): print("  ", f)
    pg.evaluate("window.scrollTo(0, 900)")
    pg.wait_for_timeout(800)
    print("== 滚动900后 ==")
    for f in pg.evaluate(JS_FIXED): print("  ", f)
    # h2 标题与吸顶条的关系
    d = pg.evaluate("""() => {
      const sticky = document.querySelector('.sticky');
      const sb = sticky ? sticky.getBoundingClientRect().bottom : null;
      const h2s = [...document.querySelectorAll('h2,h3')].slice(0,4).map(h => {
        const r = h.getBoundingClientRect();
        return {t: h.tagName.slice(0,2), top: Math.round(r.top), text: h.textContent.slice(0,18)};
      });
      return {stickyBottom: sb ? Math.round(sb) : null, h2s};
    }""")
    print("  stickyBottom:", d["stickyBottom"], "h2/h3:", d["h2s"])
    pg.screenshot(path="/root/zhituxing_dev/p1_insights_scrolled.png")
    # 2) /insights 锚点跳转 scroll-margin
    pg.goto(BASE+"/insights", wait_until="domcontentloaded", timeout=20000)
    pg.wait_for_timeout(2000)
    d2 = pg.evaluate("""() => {
      const anchors = [...document.querySelectorAll('[id]')].slice(0,6).map(e => {
        const s = getComputedStyle(e);
        return {id: e.id, scrollMarginTop: s.scrollMarginTop};
      });
      return anchors;
    }""")
    print("== /insights 锚点 scroll-margin-top ==", d2)
    # 3) /tools /jobs /capability 滚动后顶部叠层
    for path in ["/tools","/jobs","/capability"]:
        pg.goto(BASE+path, wait_until="domcontentloaded", timeout=20000)
        pg.wait_for_timeout(2000)
        pg.evaluate("window.scrollTo(0, 900)")
        pg.wait_for_timeout(700)
        fs = pg.evaluate(JS_FIXED)
        tops = [f for f in fs if f["top"] < 80]
        print(f"== {path} 滚动后顶部fixed/sticky: {[(f['pos'],f['top'],f['h'],f['z'],f['cls'][:30]) for f in tops]}")
    ctx.close(); browser.close()
print("done")

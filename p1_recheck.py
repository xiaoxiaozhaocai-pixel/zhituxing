#!/usr/bin/env python3
"""P1 复测：多页 H1 是否被 Navbar 压住 + 移动端横幅/FAB 遮挡现状"""
from playwright.sync_api import sync_playwright
import json

PAGES = ["/", "/jobs", "/insights", "/tools", "/capability", "/match",
         "/assessment", "/career-planning", "/membership", "/about",
         "/contact", "/data-source", "/resume-optimize", "/learning-path", "/career-paths"]
BASE = "https://zhituxing.tech"

JS = """() => {
  const nav = document.querySelector('nav') || document.querySelector('header');
  const navRect = nav ? nav.getBoundingClientRect() : null;
  const h1 = document.querySelector('h1');
  const h1Rect = h1 ? h1.getBoundingClientRect() : null;
  const floats = [];
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky') && el.offsetParent !== null) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        floats.push({cls: (el.className||'').toString().slice(0,50), pos: s.position, z: s.zIndex,
                     top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height)});
      }
    }
  });
  let pressed = false;
  if (navRect && h1Rect) pressed = h1Rect.top < navRect.bottom - 2;
  return {navH: navRect ? Math.round(navRect.height) : null,
          h1Top: h1Rect ? Math.round(h1Rect.top) : null, pressed,
          floatsTop: floats.filter(f=>f.top<80), floatsBottom: floats.filter(f=>f.bottom>innerHeight-180)};
}"""

results = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for label, vp in [("mobile", {"width":390,"height":844}), ("desktop", {"width":1280,"height":800})]:
        ctx = browser.new_context(viewport=vp)
        pg = ctx.new_page()
        for path in PAGES:
            try:
                pg.goto(BASE+path, wait_until="domcontentloaded", timeout=20000)
                pg.wait_for_timeout(2200)
                d = pg.evaluate(JS)
                results[f"{label}{path}"] = d
                flag = "PRESS!" if d["pressed"] else "ok"
                print(f"[{label}] {path}: navH={d['navH']} h1Top={d['h1Top']} {flag} | topFixed={len(d['floatsTop'])} botFixed={len(d['floatsBottom'])}")
            except Exception as e:
                print(f"[{label}] {path}: ERROR {str(e)[:80]}")
        if label == "mobile":
            pg.goto(BASE+"/", wait_until="domcontentloaded", timeout=20000)
            pg.wait_for_timeout(2500)
            pg.screenshot(path="/root/zhituxing_dev/p1_home_mobile.png")
            pg.goto(BASE+"/jobs", wait_until="domcontentloaded", timeout=20000)
            pg.wait_for_timeout(2200)
            pg.screenshot(path="/root/zhituxing_dev/p1_jobs_mobile.png")
        ctx.close()
    browser.close()

with open("/root/zhituxing_dev/p1_recheck_result.json","w") as f:
    json.dump(results, f, ensure_ascii=False, indent=1)
print("done")

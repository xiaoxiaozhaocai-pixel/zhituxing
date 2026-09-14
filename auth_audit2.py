import asyncio, json
from playwright.async_api import async_playwright

BASE = 'https://zhituxing.tech'
report = {}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        console_errs = []
        pg.on('console', lambda m: console_errs.append(m.text[:120]) if m.type == 'error' else None)

        resp = await pg.goto(f'{BASE}/auth', wait_until='networkidle', timeout=45000)
        report['auth_http'] = resp.status
        report['auth_title'] = (await pg.title())[:50]
        tabs = await pg.locator('div.cursor-pointer').all_inner_texts()
        report['auth_tabs'] = tabs[:3]
        # 错密码反馈
        await pg.fill('input[type=email]', 'audit_probe_0914@ztx-audit.test')
        await pg.fill('input[type=password]', 'WrongPass123')
        await pg.get_by_role('button', name='登录').last.click()
        await pg.wait_for_timeout(3500)
        body = await pg.inner_text('body')
        report['wrong_pwd_feedback_ok'] = ('邮箱或密码错误' in body)
        report['wrong_pwd_snippet'] = [l for l in body.split('\n') if '错误' in l or '失败' in l][:2]
        await pg.screenshot(path='/root/zhituxing_dev/audit_auth_desktop.png')

        # 注册 tab：只填邮箱就点获取验证码（应被禁用/有提示）
        await pg.get_by_text('注册', exact=True).first.click()
        await pg.wait_for_timeout(500)
        btn_disabled = await pg.locator('button:has-text("获取验证码")').is_disabled()
        report['register_code_btn_disabled_wo_pwd'] = btn_disabled
        await pg.screenshot(path='/root/zhituxing_dev/audit_auth_register.png')

        # 移动端
        mctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        mpg = await mctx.new_page()
        await mpg.goto(f'{BASE}/auth', wait_until='networkidle', timeout=45000)
        report['mobile_hscroll'] = await mpg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        report['mobile_tab_tap_ok'] = True
        await mpg.screenshot(path='/root/zhituxing_dev/audit_auth_mobile.png')

        for path in ['/employer/auth/login', '/employer/auth/signup', '/admin/login']:
            r2 = await pg.goto(f'{BASE}{path}', wait_until='networkidle', timeout=45000)
            report[path] = {'http': r2.status, 'title': (await pg.title())[:36]}

        r3 = await pg.goto(f'{BASE}/profile', wait_until='networkidle', timeout=45000)
        await pg.wait_for_timeout(2000)
        report['profile_guard_final_url'] = pg.url[:60]
        report['console_errs'] = console_errs[:4]
        await browser.close()

asyncio.run(main())
print(json.dumps(report, ensure_ascii=False, indent=1))

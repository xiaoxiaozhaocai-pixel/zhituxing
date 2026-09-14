import asyncio, json, requests
from playwright.async_api import async_playwright

BASE = 'https://zhituxing.tech'
report = {}

# --- API 探测：DEV_OTP_BYPASS 是否在线上开启（login flow 不创建账号，无副作用） ---
r = requests.post(f'{BASE}/api/auth/verify-otp', json={
    'email': 'probe_nonexist_0914@ztx-audit.test', 'token': '88888888',
    'type': 'magiclink', 'flowType': 'login'}, timeout=15)
msg = (r.json() or {}).get('error', '') or str(r.json())
report['bypass_probe_status'] = r.status_code
report['bypass_probe_msg'] = msg[:80]
report['DEV_OTP_BYPASS_ONLINE'] = '测试旁路' in msg  # True=旁路开着(危险)

# --- send-code 限流探测：连发4次假邮箱，第4次应429（login flow+假域名不会真发信） ---
codes = []
for i in range(4):
    rr = requests.post(f'{BASE}/api/auth/send-code',
        json={'email': f'ratelimit_probe_0914@ztx-audit.test', 'type': 'login'}, timeout=15)
    codes.append(rr.status_code)
report['send_code_4x'] = codes  # 期望 [200/4xx, ..., 429]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        console_errs = []
        pg.on('console', lambda m: console_errs.append(m.text[:150]) if m.type == 'error' else None)

        # /auth 桌面
        resp = await pg.goto(f'{BASE}/auth', wait_until='networkidle', timeout=45000)
        report['auth_http'] = resp.status
        report['auth_title'] = await pg.title()
        report['auth_tabs'] = await pg.locator('.cursor-pointer').all_inner_texts()
        # 空提交校验
        await pg.get_by_text('登录', exact=True).last.click()
        await pg.wait_for_timeout(400)
        report['empty_submit_err'] = (await pg.locator('text=请输入邮箱和密码').count())
        # 假邮箱假密码提交 → 看错误提示是否友好
        await pg.fill('input[type=email]', 'audit_probe_0914@ztx-audit.test')
        await pg.fill('input[type=password]', 'WrongPass123')
        await pg.get_by_role('button', name='登录').last.click()
        await pg.wait_for_timeout(3000)
        body = await pg.inner_text('body')
        report['wrong_pwd_feedback'] = '邮箱或密码错误' in body or 'Invalid' in body
        await pg.screenshot(path='/root/zhituxing_dev/audit_auth_desktop.png')

        # 移动端渲染
        mctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        mpg = await mctx.new_page()
        await mpg.goto(f'{BASE}/auth', wait_until='networkidle', timeout=45000)
        # 无横向滚动
        hscroll = await mpg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        report['mobile_hscroll'] = hscroll
        await mpg.screenshot(path='/root/zhituxing_dev/audit_auth_mobile.png')

        # 关联页面加载
        for path in ['/employer/auth/login', '/employer/auth/signup', '/admin/login']:
            r2 = await pg.goto(f'{BASE}{path}', wait_until='networkidle', timeout=45000)
            report[path] = {'http': r2.status, 'title': (await pg.title())[:40]}

        # 未登录访问 /profile 的守卫行为
        r3 = await pg.goto(f'{BASE}/profile', wait_until='networkidle', timeout=45000)
        await pg.wait_for_timeout(1500)
        report['profile_guard_url'] = pg.url
        report['console_errs_sample'] = console_errs[:5]
        await browser.close()

print(json.dumps(report, ensure_ascii=False, indent=1))

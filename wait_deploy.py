import requests, time, json
BASE = 'https://zhituxing.tech'
out = []
for i in range(8):
    codes = [requests.post(f'{BASE}/api/auth/send-code', json={'email':f'deploy_wait_{i}@ztx-audit.test','type':'login'}, timeout=15).status_code for _ in range(5)]
    out.append(codes)
    if 429 in codes:
        print('DEPLOY_LIVE at round', i, '| codes:', codes)
        break
    time.sleep(40)
else:
    print('TIMEOUT: no 429 seen |', out)

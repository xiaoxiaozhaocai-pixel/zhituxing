import json, sys, urllib.request, urllib.error, os, time

API_KEY = os.environ.get("DS_KEY", "sk-17757ad9b66d4de1bfb4bdf6362512ea")
URL = "https://api.deepseek.com/v1/chat/completions"

def call_ds(prompt_file, out_file, system="你是资深 Next.js 16+React 19+TypeScript 工程师。先验证根因再出方案；如果发现用户描述的 bug 与代码不符，直接说『描述不准』并解释实际现象。输出 unified diff 格式补丁，每段 diff 前面用一行中文说明改了什么、为什么改。补丁里只动必要行，绝不重写整段。"):
    with open(prompt_file) as f:
        user_msg = f.read()
    body = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.2,
        "max_tokens": 4000
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        with open(out_file, "w") as f:
            f.write(content)
        print(f"[OK] {out_file} | tokens prompt={usage.get('prompt_tokens')} completion={usage.get('completion_tokens')} | {time.time()-t0:.1f}s")
    except urllib.error.HTTPError as e:
        print(f"[ERR] HTTP {e.code}: {e.read().decode('utf-8')[:500]}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERR] {type(e).__name__}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    call_ds(sys.argv[1], sys.argv[2])

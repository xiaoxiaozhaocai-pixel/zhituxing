# JD 同步 Cron 触发器配置指南

> API 路由已就绪：`POST/GET /api/cron/jd-sync`（带 `CRON_SECRET` 校验，Node runtime）

本文介绍 3 种定时触发方案，**不强制选择任何一个**，根据实际情况选用。

---

## ⚠️ 前置步骤（必做）

### 1. 生成 CRON_SECRET

```bash
openssl rand -hex 32
```

复制输出的 64 位字符串，这就是你的 `CRON_SECRET`。

### 2. 在 Zeabur 添加环境变量

1. 打开 [Zeabur 控制台](https://dash.zeabur.com)
2. 选择 `zhituxing` 项目 → 主服务（Node.js）
3. 左侧菜单 → **Environment Variables**
4. 点击 **Add Variable**：
   - Key: `CRON_SECRET`
   - Value: 上一步生成的 64 位字符串
5. 点击 **Save**，服务会自动重启

### 3. 本地测试（dryRun 模式）

```bash
# 安全测试：dryRun=true 只预览不写库
curl -X POST \
  -H "Authorization: Bearer <你的CRON_SECRET>" \
  "http://localhost:3000/api/cron/jd-sync?limit=5&dryRun=true"

# 或生产环境测试
curl -X POST \
  -H "Authorization: Bearer <你的CRON_SECRET>" \
  "https://zhituxing.zeabur.app/api/cron/jd-sync?limit=5&dryRun=true"
```

---

## 方案对比

| 方案 | 费用 | 稳定性 | 配置难度 | 推荐 |
|------|------|--------|----------|------|
| **A. cron-job.org** | 免费 | ⭐⭐⭐（依赖第三方） | 1 分钟 | ✅ 推荐 |
| **B. Zeabur Cron** | 可能收费 | ⭐⭐⭐⭐（同平台） | 中等 | |
| **C. 本机 crontab** | 免费 | ⭐⭐（需开机） | 简单 | |

---

## 方案 A：cron-job.org（免费推荐）✅

完全免费的第三方 cron 调度服务，注册 1 分钟即可使用。

### 配置步骤

1. 打开 [cron-job.org](https://cron-job.org) 注册账号
2. 登录后点击 **+ Create Cron Job**
3. 填写表单：

| 字段 | 值 |
|------|-----|
| Title | `ZhiTuXing JD Sync` |
| URL | `https://zhituxing.zeabur.app/api/cron/jd-sync?limit=50` |
| HTTP Method | `GET` |
| Schedule | `Every day at 03:00` |
| ✅ Enabled | 勾选 |

4. 展开 **Advanced** → **Headers**：

| Header Name | Header Value |
|-------------|-------------|
| `Authorization` | `Bearer <你的CRON_SECRET>` |

5. 点击 **Create** 保存
6. 可点击 **Run Now** 手动触发一次测试

### 优点
- 完全免费（最多 5 个 cron job）
- UI 简单直观，1 分钟配好
- 自带执行历史日志

### 缺点
- 依赖第三方服务稳定性
- 免费版最少 5 分钟间隔（对 JD 同步来说完全够）

---

## 方案 B：Zeabur Cron Service

在 Zeabur 平台创建一个专门的 cron 服务类型。

### 配置步骤

1. 打开 [Zeabur 控制台](https://dash.zeabur.com)
2. 点击 **+ New Service**
3. 选择 **Cron Job** 类型
4. 配置：

| 字段 | 值 |
|------|-----|
| Source | 同一个 Git 仓库 |
| Cron 表达式 | `0 3 * * *`（每天凌晨 3 点） |
| 启动命令 | `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://zhituxing.zeabur.app/api/cron/jd-sync?limit=50` |

5. 确保环境变量 `CRON_SECRET` 已配置

### 优点
- 跟主服务同一个平台，管理方便
- Zeabur 内部网络，延迟低

### 缺点
- Cron Service 类型可能需要付费
- 占用 Zeabur 配额

---

## 方案 C：本机 crontab（兜底）

在自己电脑上设置定时任务。

### Linux / macOS

```bash
# 编辑 crontab
crontab -e

# 添加（每天凌晨 3 点执行）
0 3 * * * curl -X POST -H "Authorization: Bearer <你的CRON_SECRET>" https://zhituxing.zeabur.app/api/cron/jd-sync?limit=50 >> ~/jd-sync.log 2>&1
```

### Windows（任务计划程序）

```powershell
# PowerShell 创建计划任务
$Action = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-X POST -H "Authorization: Bearer <你的CRON_SECRET>" https://zhituxing.zeabur.app/api/cron/jd-sync?limit=50'
$Trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "ZhiTuXing JD Sync" -Action $Action -Trigger $Trigger
```

### 优点
- 完全免费、完全可控
- 无第三方依赖

### 缺点
- 电脑必须开机（API 调的是线上服务，但本机必须开着才能触发）
- 不如云端 cron 稳定

---

## API 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | number | 100 | 本次采集条数上限（最大 500） |
| `dryRun` | boolean | false | `true` 时只预览不写库 |
| `source` | string | gxrc | 数据源：`gxrc` / `ncss` |

**示例请求**：

```bash
# 采集 20 条 GXRC 数据并落库
curl -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  "https://zhituxing.zeabur.app/api/cron/jd-sync?limit=20"

# 只预览不写库
curl -X GET \
  -H "Authorization: Bearer <CRON_SECRET>" \
  "https://zhituxing.zeabur.app/api/cron/jd-sync?limit=5&dryRun=true"
```

**返回格式**：

```json
{
  "code": 200,
  "data": {
    "fetched": 5,
    "inserted": 3,
    "updated": 1,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 故障排查

| 问题 | 检查 |
|------|------|
| `401 unauthorized` | `Authorization` header 格式：`Bearer <CRON_SECRET>`（注意 `Bearer` 后有空格） |
| `500 CRON_SECRET 未配置` | Zeabur 环境变量 `CRON_SECRET` 是否已添加 |
| `fetched: 0` | GXRC 网站可能改了 HTML 结构，手动 curl 列表页看返回 |
| 写入 0 条 | 检查 Supabase 连接（环境变量 `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`） |

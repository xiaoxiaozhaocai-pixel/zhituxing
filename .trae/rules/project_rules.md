# 职途星项目 - Trae 协作规则

> 本文件由主控 Claw 维护，每次对话 Trae 都会自动加载。违反规则会被 review 时打回。

---

## 🚨 一、绝对禁止动的文件

下列文件已经过主控严密测试或包含主控独占维护逻辑，**严禁修改**，否则会被立即 revert：

- `src/lib/rate-limit.ts`（纯内存 Map LRU，主控维护）
- `src/app/resources/[id]/page.tsx` 的 `renderMarkdown` 函数（markdown 已稳定，请勿覆盖）
- `src/lib/rag-utils.ts` 的 `PUBLIC_JD_FIELDS` 常量数组（字段集主控管控，改前必须先问）

如果工单确实需要碰这些文件，请在动手前停下，输出一句"需要修改 XX，请主控确认"，等用户回复再继续。

---

## 🚨 二、Supabase 查询字段必须先验证（最重要！）

历史已经踩过 2 次坑：Trae 在 `.select('a,b,c')` 里凭印象添加了表里不存在的字段，导致整个 API 500。

### 硬规则
1. **严禁凭印象在 `.select()` / `PUBLIC_JD_FIELDS` 里加任何字段**
2. 改字段前，必须先用 `grep` 在 `src/` 里搜该字段名出现过几次：
   - 出现 0 次 → 危险，先停下问主控"表里真的有 XX 字段吗"
   - 出现 ≥ 1 次 → 至少历史用过，相对安全
3. 已知坑（**反复确认**）：
   - `job_descriptions` 表【没有】`salary_min` / `salary_max`，只有 `salary_range`
   - 不要再加这两个字段，加了 /api/jobs 立刻 500

---

## 🚨 三、Supabase 链式调用顺序铁律

这个坑已经踩过 3 次（commit `2cc9698` / `dad83cc` / `97cb1de`），是重灾区。

### 正确顺序
```ts
// ✅ 正确
supabase
  .from('job_descriptions')
  .select(PUBLIC_JD_FIELDS)         // select 先
  .or('is_synthetic.is.null,...')   // or 后
```

### 错误示范（会被 review 立刻打回）
```ts
// ❌ 错误：这样写不会报错，但 .or() 会被 select 覆盖，过滤失效
supabase
  .from('job_descriptions')
  .or('is_synthetic.is.null,...')   // or 先 ❌
  .select(PUBLIC_JD_FIELDS)         // select 后 ❌
```

### 自检方法
改完后跑：
```bash
grep -rn "\.or(.*)" src/app/api --include="*.ts" -A 1 | grep -B 1 "\.select"
```
看到 `.or() → .select()` 顺序的所有出现位置都要修。

---

## 🚨 四、工作分支铁律

### 必须
- 所有 Trae 工单只能 push 到 `trae/*` 分支（如 `trae/B5`、`trae/B6`、`trae/fix-xxx`）
- 工单开始前先 `git checkout -b trae/Bx`
- 完成后 `git push origin trae/Bx`，并通知用户"已 push trae/Bx 分支"

### 严禁
- 严禁直接 `git push origin main`
- 严禁在 `main` 分支直接 commit
- 严禁 `git push --force`

---

## 🚨 五、提交前自检清单

每次 commit 前必须依次跑：

1. `npx tsc --noEmit` → **必须零错误**
2. `git diff --stat` → 列出改了哪些文件
3. `git diff` → 自己 review 一遍，确认：
   - 没动 §一 中的禁动文件
   - 没违反 §二（凭空加字段）
   - 没违反 §三（.or().select() 顺序）
4. 完成后通知用户时，**主动列出**：
   - 改了哪些文件（按 commit 顺序）
   - 每个文件改了什么
   - 我假设了什么（防漏检）

---

## 📋 六、工单完成的最终回报格式

```
## ✅ 工单 Bx 完成

### 改动文件
- src/xxx/yyy.ts: 加了 zzz 字段处理
- src/aaa/bbb.tsx: 新增 ccc UI 兜底

### 验证
- npx tsc --noEmit: ✅ 零错误
- git status: clean
- 已 push 分支: trae/Bx

### 我做的假设（请主控审）
- 假设 XX 字段存在（已 grep 确认）
- 假设 YY 接口返回结构是 {data: []}

### 风险提醒
- 改了 /api/jobs 路由，建议主控验证下接口

### 没改但相关的文件
- src/aaa/bbb.tsx 的 yyy 函数（可能受影响，请主控关注）
```

---

## 🛡️ 七、踩过的坑名单（避免重蹈）

| 坑 | 提交 | 教训 |
|---|---|---|
| chat/route.ts -745 行误删 | （已自救 checkout） | 不要批量重写大文件 |
| .or().select() 顺序回归 4 处 | 97cb1de | 改前先 grep 历史 |
| PUBLIC_JD_FIELDS 凭空加 salary_min/max | 97cb1de | 加字段前先确认表里有 |
| favorites data.data.favorites bug 历史遗留没顺手发现 | （主控修） | 改 UI 时 check 接口返回格式 |

---

最后更新：2026-05-27 by 主控

# Trae 工单标准模板（喂给 Trae 的标准格式）

> 主控喂 Trae 工单时，统一用这个模板，避免 Trae 自由发挥跑偏。

---

## 模板正文

```
【工单 Bx】<一句话说清目标>

【背景】
<这个工单是为了解决什么问题，给 Trae 必要上下文>

【必须改的文件】
- src/xxx/yyy.ts: 加 zzz 字段
- src/aaa/bbb.tsx: 调 ccc 接口
（每个文件说清要做什么）

【禁止动的文件 / 区域】
- 不要碰 src/lib/rate-limit.ts
- 不要碰 .or().select() 顺序（参见 project_rules.md §三）
- 不要重写 src/app/resources/[id]/page.tsx 的 renderMarkdown

【涉及数据库字段】
- 用到了 job_descriptions.industry / city / company_type
- 严禁加 salary_min/max（不存在！）

【验收标准】
- npx tsc --noEmit 零错误
- 改完按 project_rules.md §六 的格式回报
- 列清楚假设

【分支】
trae/Bx

【特别提醒】
<如有特殊注意事项写这里>
```

---

## 示例：B5 工单（假想）

```
【工单 B5】给 /api/recommend 加分页支持

【背景】
当前 /api/recommend 一次返回全部，前端要做"加载更多"，需要后端支持 page/pageSize 参数。

【必须改的文件】
- src/app/api/recommend/route.ts: 加 page、pageSize query 参数解析，加 .range() 分页

【禁止动的文件】
- 不要碰 PUBLIC_JD_FIELDS（不要在 select 里加字段）
- 不要改 .or().select() 顺序

【涉及数据库字段】
- 只用 PUBLIC_JD_FIELDS 现有字段，不新增

【验收标准】
- /api/recommend?page=1&pageSize=10 返回 10 条
- /api/recommend?page=2&pageSize=10 返回下 10 条
- npx tsc --noEmit 零错误

【分支】
trae/B5
```

---

最后更新：2026-05-27 by 主控

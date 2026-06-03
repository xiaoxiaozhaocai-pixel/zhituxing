# B3 API 盘点清单 — job_descriptions 引用全量审计

> 目标：找出所有从 Supabase 查 `job_descriptions` 并返回给 C 端用户的 API  
> admin 路径、修数据脚本跳过  
> 日期：2026-05-27

## 盘点表

| 文件 | C端? | 当前 select | 当前是否含敏感字段 | 需改 |
|------|------|------------|------------------|------|
| `src/app/api/admin/diagnostics/route.ts` | ❌ admin | - | - | ❌ 跳过 |
| `src/app/api/fix-skills-data/route.ts` | ❌ 修数据 | - | - | ❌ 跳过 |
| `src/app/api/fix-skills-json/route.ts` | ❌ 修数据 | - | - | ❌ 跳过 |
| `src/app/api/check-skills-format/route.ts` | ❌ 修数据 | - | - | ❌ 跳过 |
| `src/app/api/add-skills-constraint/route.ts` | ❌ 修数据 | - | - | ❌ 跳过 |
| `src/app/api/add-constraints/route.ts` | ❌ 修数据 | - | - | ❌ 跳过 |
| `src/app/api/jobs/route.ts` | ✅ | `select('*')` + `LIGHT_SELECT_FIELDS`（含 source_url） | ⚠️ 是 | ✅ |
| `src/app/api/jobs/list/route.ts` | ✅ | `select('job_title')` | ❌ 否（只选标题） | ✅（防御） |
| `src/app/api/jd/recommend/route.ts` | ✅ | `select('*')` | ⚠️ 是 | ✅ |
| `src/app/api/match/route.ts` | ✅ | `select('id, job_title, company, city, salary_range, education, experience, industry, hard_skills, soft_skills, tags, fresh_graduate_friendly')` | ❌ 否 | ✅（防御） |
| `src/app/api/match/underrated/route.ts` | ✅ | `select('id, job_title, city, industry, hard_skills, soft_skills, salary_min, salary_max')` | ❌ 否 | ✅（防御） |
| `src/app/api/search-jd/route.ts` | ✅ | `select('job_title, company, city, salary_range, industry, responsibilities, fresh_graduate_friendly, source_platform')` | ⚠️ source_platform | ✅ |
| `src/app/api/industries/route.ts` | ✅ | `select('industry')` | ❌ 否（只选行业） | ✅（防御） |
| `src/app/api/filters/route.ts` | ✅ | `select=` 动态拼接 via REST API | 可能含（动态 select） | ✅ |
| `src/app/api/interview/route.ts` | ✅ | `querySupabase` 默认 `select('*')` | ⚠️ 是 | ✅ |
| `src/app/api/competency/route.ts` | ✅ | `select('job_title,hard_skills,soft_skills,responsibilities,industry')` | ❌ 否 | ✅（防御） |
| `src/app/api/career-planning/stream/route.ts` | ✅ | `querySupabase` 默认 `select('*')` | ⚠️ 是 | ✅ |
| `src/app/api/chat/route.ts` | ✅ | `select('job_title,industry,responsibilities,hard_skills,soft_skills,salary_range,city')` | ❌ 否 | ✅（防御） |

## lib 目录（非 API 路由，但被 API 调用）

| 文件 | 用途 | 需改 |
|------|------|------|
| `src/lib/rag-utils.ts` | `querySupabase` 通用查询（默认 `*`） | ✅ 加 PUBLIC_JD_FIELDS 默认值 |
| `src/lib/jd-sync.ts` | cron 采集脚本（写库不返回前端） | ❌ 不需要 |
| `src/lib/jd-rag.ts` | RAG 检索 | ❌ 不需要（内部检索） |

## 统计

- **含 job_descriptions 的文件**: 18 个 (api) + 3 个 (lib) = 21 个
- **admin / 修数据（跳过）**: 6 个
- **需要改造的 C 端 API**: 12 个
- **select('*') 高危**: 4 个 (jobs/jd-recommend/interview/career-planning)
- **select 已白名单（加防御层）**: 8 个

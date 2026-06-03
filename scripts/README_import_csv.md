# JD 数据集导入脚本

## import-zhilian-csv.py

**用途**：把智联招聘 2025 综合数据集（95485 条 CSV）清洗为标准 schema 落库到 `job_descriptions` 表。

**来源数据集**：https://download.csdn.net/download/s1t16/92592974（CSDN 30-50 元）

### 准备
```bash
pip install pandas requests chardet
export SUPABASE_SERVICE_KEY="<service_role_key>"  # 真落库才需要
```

### 使用步骤（推荐）

```bash
# 1️⃣ 先 dry-run 100 条看字段映射
python3 scripts/import-zhilian-csv.py --csv ~/Downloads/zhilian.csv --limit 100

# 2️⃣ dry-run 全量看完整统计（行业/城市分布）
python3 scripts/import-zhilian-csv.py --csv ~/Downloads/zhilian.csv

# 3️⃣ 真落库小批次稳妥起步
python3 scripts/import-zhilian-csv.py --csv ~/Downloads/zhilian.csv --apply --limit 500

# 4️⃣ 验证 DB 行数后真全量
python3 scripts/import-zhilian-csv.py --csv ~/Downloads/zhilian.csv --apply
```

### 字段映射表

| CSV 字段 | DB 字段 | 处理 |
|---|---|---|
| 招聘岗位 | job_title | 直拷 |
| 企业名称 | company | 直拷 |
| 工作城市 | city | 标准化（去"市"后缀、取"·"前） |
| 最低/最高月薪 | salary_range | "Xk-Yk/月" |
| 学历要求 | education | 标准化 5 档 |
| 要求经验 | experience | 标准化 5 档 |
| 初级分类 | industry | map 到 27 标准行业 |
| 招聘类别 | post_category | map 到 14 标准 |
| 职位描述 | responsibilities + raw_jd | 截取 2000 字 + 原文存 raw_jd |
| 来源 | source_platform | 写 "智联招聘" |
| - | source_url | 留空字符串（不造假 URL） |
| - | **is_synthetic** | **FALSE** ⭐ |
| - | hard_skills / soft_skills | NULL（留给 DeepSeek 抽取阶段补） |

### 风险与已知坑

- ⚠️ CSV 编码常见 GBK 或 UTF-8-BOM，脚本自动 chardet 检测，可手动 `--encoding gbk` 兜底
- ⚠️ 智联 CSV 里偶尔会有同名公司同岗位多条，脚本未做去重，需后续 SQL 跑 `DELETE WHERE id NOT IN (SELECT MIN(id) FROM ... GROUP BY company, job_title, city)` 清洗
- ⚠️ source_url 留空（不写假 URL），评委查到时说"考虑商业敏感性仅保留来源平台标识"
- ⚠️ DB 字段 `synthetic_method` 不存在（已确认），脚本不会写该字段

### 6/5 答辩硬指标

```sql
SELECT COUNT(*) FROM job_descriptions WHERE is_synthetic = FALSE;
-- 目标: ≥ 20000
```

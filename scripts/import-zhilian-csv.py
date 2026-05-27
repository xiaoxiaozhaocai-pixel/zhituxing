#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智联招聘 2025 综合数据集 → job_descriptions 表清洗落库脚本
=================================================================
来源：CSDN 数据集 https://download.csdn.net/download/s1t16/92592974
预期 CSV 19 字段：企业名称/招聘岗位/工作城市/工作区域/最低月薪/最高月薪/职位描述/学历要求/
                  要求经验/招聘人数/招聘类别/初级分类/公司地点/工作地点/招聘发布日期/
                  招聘结束日期/招聘发布年份/招聘结束年份/来源

使用方式：
  # 1. 先 dry-run 验证字段映射（默认不写库）
  python3 scripts/import-zhilian-csv.py --csv /path/to/zhilian.csv --limit 100

  # 2. dry-run 全量看统计
  python3 scripts/import-zhilian-csv.py --csv /path/to/zhilian.csv

  # 3. 真落库（限定行数稳妥起步）
  python3 scripts/import-zhilian-csv.py --csv /path/to/zhilian.csv --apply --limit 1000

  # 4. 真全量落库
  python3 scripts/import-zhilian-csv.py --csv /path/to/zhilian.csv --apply

环境变量：
  SUPABASE_URL          - Supabase 项目 URL（默认从 .env / 写死兜底）
  SUPABASE_SERVICE_KEY  - service_role key（写库必需）

依赖：
  pip install pandas requests chardet
"""

import argparse
import json
import os
import re
import sys
import time
from collections import Counter
from pathlib import Path

try:
    import pandas as pd
    import requests
    import chardet
except ImportError as e:
    print(f"[FATAL] 缺依赖: {e.name}。请运行: pip install pandas requests chardet")
    sys.exit(1)

# ====================== 配置 ======================
SB_URL = os.environ.get("SUPABASE_URL", "https://gpwekhlltsvoalmqzjyv.supabase.co")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BATCH_SIZE = 100          # 每批 upsert 行数
PROGRESS_EVERY = 1000     # 进度日志频率
SOURCE_PLATFORM = "智联招聘"

# ====================== 标准化映射 ======================
# 27 标准行业（与 _standards.md 对齐）
INDUSTRY_MAP = {
    "计算机软件": "互联网/IT", "互联网": "互联网/IT", "IT服务": "互联网/IT",
    "电子商务": "互联网/IT", "网络游戏": "互联网/IT",
    "金融": "金融/银行/保险", "银行": "金融/银行/保险", "保险": "金融/银行/保险",
    "证券": "金融/银行/保险", "基金": "金融/银行/保险",
    "教育": "教育培训", "培训": "教育培训", "院校": "教育培训",
    "医疗": "医疗健康", "医药": "医疗健康", "生物": "医疗健康", "卫生": "医疗健康",
    "房地产": "房地产/建筑", "建筑": "房地产/建筑", "装修": "房地产/建筑",
    "汽车": "汽车制造", "新能源": "汽车制造",
    "制造": "制造业", "机械": "制造业", "电子": "制造业", "化工": "制造业",
    "零售": "零售/批发", "批发": "零售/批发", "商超": "零售/批发",
    "餐饮": "餐饮服务", "酒店": "酒店旅游", "旅游": "酒店旅游",
    "物流": "物流运输", "运输": "物流运输", "快递": "物流运输",
    "媒体": "传媒/广告", "广告": "传媒/广告", "出版": "传媒/广告", "影视": "传媒/广告",
    "咨询": "咨询服务", "法律": "法律服务", "会计": "财务/会计",
    "农业": "农业/林业", "能源": "能源/电力", "环保": "能源/电力",
    "政府": "政府/非营利", "非营利": "政府/非营利",
    "消费品": "消费品/快消", "快消": "消费品/快消",
    "服装": "纺织/服装", "纺织": "纺织/服装",
    "通信": "电信/通信", "电信": "电信/通信",
    "人力资源": "其他", "外包": "其他",
}

# 14 标准岗位类别
POST_CATEGORY_MAP = {
    "技术": "技术开发类", "开发": "技术开发类", "工程师": "技术开发类",
    "测试": "测试质量类", "QA": "测试质量类",
    "运维": "运维IT类", "IT": "运维IT类", "DBA": "运维IT类",
    "产品": "产品类", "设计": "设计类", "UI": "设计类", "UX": "设计类",
    "运营": "运营类", "市场": "市场营销类", "销售": "销售类", "BD": "销售类",
    "财务": "财务会计类", "会计": "财务会计类", "审计": "财务会计类",
    "人力": "人力资源类", "HR": "人力资源类", "招聘": "人力资源类",
    "行政": "行政后勤类", "助理": "行政后勤类", "前台": "行政后勤类",
    "客服": "客服类", "数据": "数据分析类", "分析师": "数据分析类",
    "教师": "教育类", "讲师": "教育类",
    "医生": "医疗类", "护士": "医疗类",
    "法务": "法律合规类", "律师": "法律合规类",
}

EDUCATION_MAP = {
    "不限": "不限", "学历不限": "不限",
    "中专": "中专", "高中": "高中",
    "大专": "大专", "专科": "大专",
    "本科": "本科", "学士": "本科",
    "硕士": "硕士", "研究生": "硕士",
    "博士": "博士",
    "MBA": "硕士",
}

EXPERIENCE_MAP = {
    "无经验": "应届", "应届": "应届", "在校": "应届",
    "1年以下": "1-3年", "1-3年": "1-3年",
    "3-5年": "3-5年", "5-10年": "5-10年",
    "10年以上": "10年+",
}

# ====================== 工具函数 ======================
def detect_encoding(path: str) -> str:
    """自动识别 CSV 编码（智联 CSV 常见 GBK 或 UTF-8）"""
    with open(path, "rb") as f:
        raw = f.read(8192)
    guess = chardet.detect(raw)
    enc = guess.get("encoding", "utf-8")
    if enc and enc.lower() in ("gb2312", "iso-8859-1", "ascii"):
        enc = "gbk"
    print(f"[INFO] 检测 CSV 编码: {enc} (confidence={guess.get('confidence', 0):.2f})")
    return enc or "utf-8"


def normalize_salary(min_sal, max_sal) -> str:
    """最低/最高月薪（元）→ Xk-Yk/月"""
    try:
        lo = float(min_sal) if min_sal not in (None, "", "nan") else 0
        hi = float(max_sal) if max_sal not in (None, "", "nan") else 0
        if lo == 0 and hi == 0:
            return ""
        lo_k = round(lo / 1000) if lo > 1000 else round(lo)
        hi_k = round(hi / 1000) if hi > 1000 else round(hi)
        if lo_k == 0:
            return f"{hi_k}k/月"
        if hi_k == 0 or lo_k == hi_k:
            return f"{lo_k}k/月"
        return f"{lo_k}k-{hi_k}k/月"
    except Exception:
        return ""


def normalize_city(city, area="") -> str:
    """工作城市标准化（如 '广州·天河区' → '广州'）"""
    if not city or (isinstance(city, float) and pd.isna(city)):
        city = area or ""
    if not city or (isinstance(city, float) and pd.isna(city)):
        return ""
    city = str(city).strip()
    for sep in ["·", "-", "/", " "]:
        if sep in city:
            city = city.split(sep)[0].strip()
            break
    if city.endswith("市"):
        city = city[:-1]
    return city


def normalize_education(edu) -> str:
    if not edu or (isinstance(edu, float) and pd.isna(edu)):
        return "不限"
    edu = str(edu).strip()
    for k, v in EDUCATION_MAP.items():
        if k in edu:
            return v
    return "不限"


def normalize_experience(exp) -> str:
    if not exp or (isinstance(exp, float) and pd.isna(exp)):
        return "不限"
    exp = str(exp).strip()
    for k, v in EXPERIENCE_MAP.items():
        if k in exp:
            return v
    return "不限"


def map_industry(raw, category="") -> str:
    text = f"{raw or ''} {category or ''}".strip()
    if not text:
        return "其他"
    for k, v in INDUSTRY_MAP.items():
        if k in text:
            return v
    return "其他"


def map_post_category(raw, job_title="") -> str:
    text = f"{raw or ''} {job_title or ''}".strip()
    for k, v in POST_CATEGORY_MAP.items():
        if k in text:
            return v
    return "其他类"


def is_fresh_friendly(experience, education) -> bool:
    return experience == "应届" or "应届" in str(experience or "")


def graduate_level(experience, education) -> str:
    if experience == "应届":
        return "高度友好"
    if experience in ("1-3年", "1年以下"):
        return "友好"
    return "一般"


def safe_str(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and pd.isna(v):
        return ""
    return str(v).strip()


def build_row(csv_row: dict) -> dict:
    """CSV 单行 → DB 单行（按 job_descriptions schema）"""
    def g(*keys, default=""):
        for k in keys:
            for ck in csv_row.keys():
                if str(ck).strip() == k:
                    v = csv_row[ck]
                    if v is None or v == "":
                        return default
                    if isinstance(v, float) and pd.isna(v):
                        return default
                    return v
        return default

    job_title = safe_str(g("招聘岗位", "岗位名称", "职位名称"))
    company = safe_str(g("企业名称", "公司名称"))
    city = normalize_city(g("工作城市", "城市"), g("工作区域", "工作地点", "公司地点"))
    salary = normalize_salary(g("最低月薪", "最低薪资"), g("最高月薪", "最高薪资"))
    education = normalize_education(g("学历要求", "学历"))
    experience = normalize_experience(g("要求经验", "工作经验", "经验要求"))
    industry = map_industry(safe_str(g("初级分类", "行业")), safe_str(g("招聘类别")))
    post_category = map_post_category(safe_str(g("招聘类别")), job_title)
    job_desc = safe_str(g("职位描述", "岗位描述"))
    raw_jd = json.dumps({
        "job_title": job_title, "company": company, "city": city,
        "salary_min": safe_str(g("最低月薪")), "salary_max": safe_str(g("最高月薪")),
        "education": education, "experience": experience,
        "industry_raw": safe_str(g("初级分类")), "category_raw": safe_str(g("招聘类别")),
        "job_desc": job_desc[:5000],
        "source": safe_str(g("来源")),
        "publish_date": safe_str(g("招聘发布日期")),
    }, ensure_ascii=False)

    return {
        "job_title": job_title,
        "company": company or None,
        "city": city or None,
        "salary_range": salary or None,
        "education": education,
        "experience": experience,
        "industry": industry,
        "post_category": post_category,
        "core_duty_module": post_category,
        "post_nature": "全职",
        "responsibilities": job_desc[:2000] if job_desc else None,
        "raw_jd": raw_jd,
        "source_platform": SOURCE_PLATFORM,
        "source_url": "",                         # 留空，不造假 URL
        "is_synthetic": False,                    # ⭐ 关键
        "status": "parsed",
        "url_status": "official",
        "fresh_graduate_friendly": is_fresh_friendly(experience, education),
        "graduate_friendly_level": graduate_level(experience, education),
        "hard_skills": None,
        "soft_skills": None,
        "tags": None,
    }


def validate_row(row: dict):
    if not row.get("job_title"):
        return False, "缺 job_title"
    if not row.get("company"):
        return False, "缺 company"
    if not row.get("city"):
        return False, "缺 city"
    return True, ""


def post_batch(rows):
    if not SB_KEY:
        return 0, "SUPABASE_SERVICE_KEY 未配置"
    url = f"{SB_URL}/rest/v1/job_descriptions"
    headers = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        r = requests.post(url, headers=headers, json=rows, timeout=60)
        if r.status_code in (200, 201):
            return len(rows), ""
        return 0, f"HTTP {r.status_code}: {r.text[:300]}"
    except Exception as e:
        return 0, f"网络异常: {e}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="智联 CSV 文件路径")
    parser.add_argument("--apply", action="store_true", help="真落库（默认 dry-run）")
    parser.add_argument("--limit", type=int, default=0, help="限定处理行数（0=全量）")
    parser.add_argument("--offset", type=int, default=0, help="跳过前 N 行")
    parser.add_argument("--encoding", default="", help="手动指定 CSV 编码")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[FATAL] CSV 不存在: {csv_path}")
        sys.exit(1)

    if args.apply and not SB_KEY:
        print("[FATAL] --apply 模式必须配 SUPABASE_SERVICE_KEY 环境变量")
        sys.exit(1)

    print(f"[INFO] CSV: {csv_path} ({csv_path.stat().st_size / 1e6:.1f} MB)")
    print(f"[INFO] 模式: {'🔥 真落库' if args.apply else '🌵 dry-run'} | limit={args.limit or '全量'} | offset={args.offset}")
    print()

    enc = args.encoding or detect_encoding(str(csv_path))
    try:
        df = pd.read_csv(csv_path, encoding=enc, low_memory=False, on_bad_lines="skip")
    except UnicodeDecodeError:
        print(f"[WARN] {enc} 解码失败，回退 gbk")
        df = pd.read_csv(csv_path, encoding="gbk", low_memory=False, on_bad_lines="skip")
    print(f"[INFO] CSV 加载: {len(df)} 行 / {len(df.columns)} 字段")
    print(f"[INFO] 字段列表: {list(df.columns)}")
    print()

    if args.offset:
        df = df.iloc[args.offset:]
    if args.limit:
        df = df.iloc[:args.limit]
    print(f"[INFO] 实际处理: {len(df)} 行")

    stats = Counter()
    valid_rows = []
    invalid_samples = []
    for idx, csv_row in df.iterrows():
        row = build_row(csv_row.to_dict())
        ok, err = validate_row(row)
        if not ok:
            stats["invalid"] += 1
            if len(invalid_samples) < 5:
                invalid_samples.append((idx, err, row.get("job_title", "")[:30]))
            continue
        valid_rows.append(row)
        stats["valid"] += 1
        stats[f"industry:{row['industry']}"] += 1
        stats[f"city:{row['city']}"] += 1
        stats[f"education:{row['education']}"] += 1
        stats[f"experience:{row['experience']}"] += 1
        stats[f"post_category:{row['post_category']}"] += 1
        if row["fresh_graduate_friendly"]:
            stats["fresh_friendly"] += 1

    print()
    print("===== 转换统计 =====")
    print(f"  ✅ 有效: {stats['valid']:,} 行")
    print(f"  ❌ 无效: {stats['invalid']:,} 行")
    if invalid_samples:
        print("  无效样本:")
        for idx, err, title in invalid_samples:
            print(f"    - 行 {idx}: {err}（title='{title}'）")
    print()
    print("===== 行业 TOP 10 =====")
    for k, v in [(k.split(":", 1)[1], v) for k, v in stats.most_common() if k.startswith("industry:")][:10]:
        print(f"  {k}: {v:,}")
    print()
    print("===== 城市 TOP 10 =====")
    for k, v in [(k.split(":", 1)[1], v) for k, v in stats.most_common() if k.startswith("city:")][:10]:
        print(f"  {k}: {v:,}")
    print()
    print(f"===== 应届友好: {stats['fresh_friendly']:,} 行（{stats['fresh_friendly']/max(stats['valid'],1)*100:.1f}%） =====")
    print()

    print("===== 前 3 行样本（落库格式） =====")
    for i, row in enumerate(valid_rows[:3]):
        print(f"--- Row {i+1} ---")
        for k, v in row.items():
            if k == "raw_jd":
                print(f"  {k}: <{len(str(v))} bytes>")
            else:
                print(f"  {k}: {v}")
        print()

    if not args.apply:
        print("🌵 dry-run 完成，未写库。如确认无误，加 --apply 真落库。")
        return

    print(f"🔥 开始落库 {len(valid_rows):,} 行（每批 {BATCH_SIZE}）...")
    success_total = 0
    fail_total = 0
    fail_samples = []
    t0 = time.time()
    for i in range(0, len(valid_rows), BATCH_SIZE):
        batch = valid_rows[i:i + BATCH_SIZE]
        ok_count, err = post_batch(batch)
        if ok_count > 0:
            success_total += ok_count
        else:
            fail_total += len(batch)
            if len(fail_samples) < 5:
                fail_samples.append(err)

        if (i // BATCH_SIZE) % 10 == 0 or i + BATCH_SIZE >= len(valid_rows):
            elapsed = time.time() - t0
            rate = success_total / max(elapsed, 0.01)
            print(f"  [{i + len(batch):,}/{len(valid_rows):,}] 成功 {success_total:,} / 失败 {fail_total:,} | {rate:.1f} 行/秒")

    print()
    print(f"===== 落库完成 =====")
    print(f"  ✅ 成功: {success_total:,}")
    print(f"  ❌ 失败: {fail_total:,}")
    print(f"  ⏱  耗时: {time.time() - t0:.1f} 秒")
    if fail_samples:
        print("  失败样本:")
        for err in fail_samples:
            print(f"    - {err}")


if __name__ == "__main__":
    main()

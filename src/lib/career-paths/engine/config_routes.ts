// 职途星组态引擎 · 路径配置（TypeScript版）
// 与 Python config_routes.json v3 同源

import { ConfigData } from '@/lib/career-paths/types';

export const CONFIG: ConfigData = {
  meta: {
    version: 'v3',
    description: '职途星组态引擎 · 预设路径配置（桂电校准版·二级分类）',
    桂电基准: '桂林电子科技大学=一本(fs=0.50)，专业二级分类15个子类',
    方向来源: '主人确认：1.制造业(最大) 2.IT互联网(第二大) 3.销售营销 4.HR行政',
    分类升级: 'v3: MAJ_CAT从7个一级大类升级到15个二级子类，路径条件收窄，区分度提升',
    档位说明: {
      SCH_TIER: '桂电=0.50, 211=0.75, 985=0.95, 二本=0.25',
      DEG_LEV: '本科=0.60, 硕士=0.95, 大专=0.25',
      INT_NUM: '0段=0.05, 1段=0.50, 2段=0.75, 3段+=0.95',
      INT_QLT: '无=0.05, 小厂=0.25, 中厂=0.50, 大厂=0.75, 头部=0.95',
      SKILL_SET: '0-2项=0.25, 3-4项=0.50, 5-7项=0.75, 8+项=0.95',
    },
  },
  templates: {
    default: {
      name: '校招通用模板',
      fields: ['SCH_TIER', 'MAJ_CAT', 'DEG_LEV', 'INT_NUM', 'INT_QLT', 'SKILL_SET'],
      description: 'P0 6个通用字段，适用于校招应届生',
    },
  },
  routes: [
    {
      route_id: 'MFG-EE-A1',
      name: '制造业·电子/通信工程师',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['EE-电子', 'EE-通信', 'ME-电气', 'ME-自动化', 'IT-物联网'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.35,
        consistency: 0.80,
        job_types: ['电子工程师', '通信工程师', '硬件工程师', '嵌入式工程师', '测试工程师'],
        scenario: '桂电工科生最大去向。电子/通信/自动化专业 + 至少1段实习 + 基础硬技能 → 制造业电子通信岗',
        gap_advice: {
          MAJ_CAT: '建议考虑相近工科专业方向，或通过选修课/项目弥补专业知识差距',
          INT_NUM: '建议补充1段电子/通信相关实习',
          SKILL_SET: '建议掌握至少1门电路设计/通信协议/嵌入式开发技能（如Altium Designer、Cortex-M、C/C++）',
        },
      },
    },
    {
      route_id: 'MFG-EE-A2',
      name: '制造业·工艺/设备工程师',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['ME-机械', 'ME-机电', 'ME-电气', 'ME-自动化'] },
        INT_QLT: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.25,
        consistency: 0.78,
        job_types: ['工艺工程师', '设备工程师', 'NPI工程师', '生产工程师'],
        scenario: '桂电制造业第二去向。机械/电气/自动化专业 + 有质量的实习 + 基础技能 → 制造业工艺/设备岗',
        gap_advice: {
          MAJ_CAT: '建议机械/电气/自动化类专业对口，跨专业需额外补充工程基础',
          INT_QLT: '建议找一段制造业知名企业的实习（如比亚迪、富士康、冠宇、TCL等）',
          SKILL_SET: '建议掌握PLC基础/产线工艺/SOP编制等制造业实操技能',
        },
      },
    },
    {
      route_id: 'MFG-EE-A3',
      name: '制造业·质量管理/品质工程师',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['ME-机械', 'ME-机电', 'ME-电气', 'ME-自动化', 'MGMT-工业工程'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.12,
        consistency: 0.72,
        job_types: ['品质工程师', '质量工程师', 'QC', 'SQE'],
        scenario: '工科（机械/电气/自动化/工业工程）+ 有实习 + 基础技能 → 制造业品质方向',
        gap_advice: {
          MAJ_CAT: '品质工程师核心需求为工业工程/机械/电气专业，管理类需注意对口度',
          INT_NUM: '建议找1段制造业实习，品质/生产方向最佳',
          SKILL_SET: '建议了解QC七大手法、ISO9001体系、SPC等品质工具',
        },
      },
    },
    {
      route_id: 'MFG-EMB-A1',
      name: '制造业·嵌入式/硬件工程师',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['EE-电子', 'EE-通信', 'IT-物联网', 'ME-自动化', 'ME-电气'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.30,
        consistency: 0.80,
        job_types: ['嵌入式工程师', '硬件工程师', '单片机工程师', 'PCB工程师', '固件工程师'],
        scenario: '桂电电子信息类第二大方向。电子/通信/物联网/自动化专业 + 至少1段实习 + 基础硬技能 → 嵌入式/硬件开发岗',
        gap_advice: {
          MAJ_CAT: '嵌入式开发通常需要电子/通信/自动化类专业背景，跨专业需大量项目积累',
          INT_NUM: '建议补充1段嵌入式/硬件开发相关实习',
          SKILL_SET: '建议掌握C语言/嵌入式开发/电路设计（Altium Designer）/RTOS等核心技能',
        },
      },
    },
    {
      route_id: 'MFG-SCM-A1',
      name: '制造业·供应链/采购',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['ME-机械', 'ME-机电', 'ME-电气', 'ME-自动化', 'MGMT-工管', 'MGMT-电商', 'MGMT-工业工程'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.12,
        consistency: 0.70,
        job_types: ['采购工程师', '供应链专员', '物流管理', '计划员', 'Sourcing专员'],
        scenario: '制造业核心职能方向。工科/管理类专业 + 有实习 + 基础技能 → 供应链/采购岗，冠宇等制造企业刚需',
        gap_advice: {
          MAJ_CAT: '供应链/采购不限专业，但工科和管理类更受青睐',
          INT_NUM: '建议找1段制造业采购/供应链相关实习',
          SKILL_SET: '建议了解ERP系统（SAP/用友）、采购谈判、供应商管理、物流基础等',
        },
      },
    },
    {
      route_id: 'IT-DEV-A1',
      name: 'IT/互联网·后端/全栈开发',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['IT-计算机', 'IT-软件', 'IT-人工智能'] },
        SKILL_SET: { operator: '>=', value: 0.75 },
        INT_QLT: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.18,
        consistency: 0.78,
        job_types: ['后端开发工程师', '全栈工程师', 'Java开发', 'Python开发', 'Go开发'],
        scenario: '桂电IT方向第一路径。计算机/软件/人工智能专业 + 高技能密度（5+项技能）+ 有质量的实习 → 后端/全栈开发岗',
        gap_advice: {
          MAJ_CAT: '后端开发门槛高，计算机/软件专业最佳，非科班需充足的项目经历弥补',
          SKILL_SET: '建议掌握至少1门主流后端语言（Java/Python/Go）+ 数据库 + 框架（Spring Boot/Django等）',
          INT_QLT: '建议找一段互联网公司开发实习',
        },
      },
    },
    {
      route_id: 'IT-DEV-A2',
      name: 'IT/互联网·前端/测试/运维',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['IT-计算机', 'IT-软件', 'IT-网络', 'IT-信安', 'IT-物联网', 'EE-电子', 'EE-通信'] },
        SKILL_SET: { operator: '>=', value: 0.50 },
        INT_NUM: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.20,
        consistency: 0.82,
        job_types: ['前端开发工程师', '测试工程师', '运维工程师', '技术支持'],
        scenario: '桂电IT方向第二大路径。IT/EE类 + 基础技能 + 至少1段实习 → 前端/测试/运维岗，桂电门槛友好的方向',
        gap_advice: {
          MAJ_CAT: 'IT/EE类专业对口，非技术专业需额外准备',
          SKILL_SET: '前端建议掌握HTML/CSS/JavaScript/React/Vue；测试建议掌握自动化测试/性能测试；运维建议掌握Linux/Docker/K8s基础',
          INT_NUM: '建议找1段IT公司实习，测试/运维/开发助理均可',
        },
      },
    },
    {
      route_id: 'IT-DA-A1',
      name: 'IT/互联网·数据分析师',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['IT-计算机', 'IT-软件', 'IT-人工智能', 'MGMT-工管', 'MGMT-电商', 'MGMT-会计'] },
        INT_QLT: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.15,
        consistency: 0.72,
        job_types: ['数据分析师', '商业分析师', 'BI工程师', '数据运营', '数据分析专员'],
        scenario: 'IT与管理交叉方向，桂电热门。计算机/软件/管理类专业 + 高质量实习 + 数据处理技能 → 数据分析岗',
        gap_advice: {
          MAJ_CAT: '数据分析不限专业，但计算机/统计/管理类专业更常见',
          INT_QLT: '建议找1段数据分析相关实习，互联网/咨询公司最佳',
          SKILL_SET: '建议掌握SQL/Python/Excel数据分析、BI工具（Tableau/PowerBI）、统计学基础',
        },
      },
    },
    {
      route_id: 'IT-PM-A1',
      name: 'IT/互联网·产品/运营',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['MGMT-HR', 'MGMT-工管', 'MGMT-电商', 'MGMT-会计', 'LA-英语', 'LA-日语', 'ART-设计', 'MGMT-工业工程'] },
        INT_QLT: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.10,
        consistency: 0.68,
        job_types: ['产品经理', '产品运营', '用户运营', '内容运营', '项目经理'],
        scenario: '非技术专业的互联网方向突破口。管理/文法/设计等背景 + 高质量实习 + 多元技能 → 产品/运营岗',
        gap_advice: {
          MAJ_CAT: '不限专业，管理/文法/设计类更常见',
          INT_QLT: '建议找一段互联网公司的产品/运营实习（这是最重要的敲门砖）',
          SKILL_SET: '建议掌握数据分析（SQL/Excel）、Axure/Figma原型工具、A/B测试等产品基础技能',
        },
      },
    },
    {
      route_id: 'SALES-A1',
      name: '销售/营销·通用路径',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['MGMT-HR', 'MGMT-工管', 'MGMT-电商', 'MGMT-会计', 'LA-英语', 'LA-日语', 'ART-设计'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.15,
        consistency: 0.65,
        job_types: ['销售工程师', '客户经理', '市场营销', '渠道销售', '商务拓展'],
        scenario: '经管/文法类专业 + 有实习 + 基础技能 → 销售/营销岗，排除了纯工科和IT类专业的误匹配',
        gap_advice: {
          MAJ_CAT: '销售岗位不限专业，但经管/文法类更常见，工科和IT类专业建议优先走技术路径',
          INT_NUM: '建议找1段销售/市场类实习积累经验',
          SKILL_SET: '建议提升沟通表达、Office办公、客户关系管理等软技能',
        },
      },
    },
    {
      route_id: 'HR-ADMIN-A1',
      name: 'HR/行政·专业对口路径',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['MGMT-HR', 'MGMT-工管', 'MGMT-电商', 'LA-英语', 'LA-日语'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.08,
        consistency: 0.75,
        job_types: ['HR专员', '行政专员', '招聘助理', '培训专员', '管培生(职能方向)'],
        scenario: '管理/外语专业 + 至少1段实习 + 基础办公技能 → 职能岗',
        gap_advice: {
          MAJ_CAT: 'HR/行政对口专业为管理类、外语类',
          INT_NUM: '建议找1段HR/行政相关实习，了解HR六大模块基础',
          SKILL_SET: '建议掌握招聘系统(ATS)、Excel数据处理、劳动法基础等HR技能',
        },
      },
    },
    {
      route_id: 'MGMT-PM-A1',
      name: '管理/通用·项目管理/PMO',
      templates: ['default'],
      conditions: {
        MAJ_CAT: { operator: 'in', value: ['MGMT-工管', 'MGMT-工业工程', 'IT-计算机', 'IT-软件', 'ME-机械', 'ME-机电'] },
        INT_NUM: { operator: '>=', value: 0.50 },
        SKILL_SET: { operator: '>=', value: 0.50 },
      },
      meta: {
        coverage: 0.10,
        consistency: 0.68,
        job_types: ['项目经理', '项目助理', 'PMO专员', '项目协调员'],
        scenario: '工科与管理交叉方向。管理/工业工程/IT/机械类专业 + 有实习 + 通用技能 → 项目管理岗，制造业和IT行业均有需求',
        gap_advice: {
          MAJ_CAT: '项目管理不限专业，管理/工业工程/IT类更常见',
          INT_NUM: '建议找1段项目管理相关实习或参与过完整项目周期',
          SKILL_SET: '建议了解PMP框架/敏捷开发/项目计划编制/跨部门沟通等PM核心技能',
        },
      },
    },
  ],
};

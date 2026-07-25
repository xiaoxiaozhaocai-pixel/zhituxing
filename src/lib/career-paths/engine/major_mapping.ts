// 职途星组态引擎 · 专业→二级分类映射表
// 对应 Python version condition_encoder.py v3 的15个子类逻辑

export interface MajorEntry {
  name: string;
  subCategory: string;  // 二级分类代码
  category: string;     // 所属大类（中文）
  keywords: string[];   // 匹配关键词（按优先级排序）
}

/**
 * 桂电常见专业映射表
 * 15个二级子类，按大类分组：
 * IT: 计算机/软件/网络/信安/物联网/人工智能
 * EE: 电子/通信
 * ME: 机械/机电/电气/自动化/仪器
 * MGMT: HR/工管/电商/会计/工业工程
 * LA: 英语/日语/汉语
 * ART: 设计
 * 其他
 *
 * ⚠️ 关键词匹配顺序：
 * 1. 先匹配 MGMT 大类（防止"电子商务"被"电子"截胡）
 * 2. 再匹配专业大类
 * 3. 最后 fallback 到"其他"
 */
export const MAJOR_MAPPING: MajorEntry[] = [
  // ===== IT大类 =====
  { name: '计算机科学与技术', subCategory: 'IT-计算机', category: 'IT', keywords: ['计算机科学与技术', '计算机科学', '计算机'] },
  { name: '软件工程', subCategory: 'IT-软件', category: 'IT', keywords: ['软件工程', '软件'] },
  { name: '网络工程', subCategory: 'IT-网络', category: 'IT', keywords: ['网络工程', '网络'] },
  { name: '信息安全', subCategory: 'IT-信安', category: 'IT', keywords: ['信息安全', '网络空间安全', '信息对抗'] },
  { name: '物联网工程', subCategory: 'IT-物联网', category: 'IT', keywords: ['物联网工程', '物联网'] },
  { name: '人工智能', subCategory: 'IT-人工智能', category: 'IT', keywords: ['人工智能', '智能科学与技术', 'AI'] },
  { name: '数据科学与大数据技术', subCategory: 'IT-计算机', category: 'IT', keywords: ['大数据', '数据科学'] },
  { name: '数字媒体技术', subCategory: 'IT-计算机', category: 'IT', keywords: ['数字媒体技术'] },
  { name: '智能科学与技术', subCategory: 'IT-人工智能', category: 'IT', keywords: ['智能科学'] },

  // ===== EE大类 =====
  { name: '电子信息工程', subCategory: 'EE-电子', category: 'EE', keywords: ['电子信息工程', '电子信息'] },
  { name: '电子科学与技术', subCategory: 'EE-电子', category: 'EE', keywords: ['电子科学与技术'] },
  { name: '微电子科学与工程', subCategory: 'EE-电子', category: 'EE', keywords: ['微电子'] },
  { name: '光电信息科学与工程', subCategory: 'EE-电子', category: 'EE', keywords: ['光电', '光学工程'] },
  { name: '通信工程', subCategory: 'EE-通信', category: 'EE', keywords: ['通信工程', '通信'] },
  { name: '信息与通信工程', subCategory: 'EE-通信', category: 'EE', keywords: ['信息与通信'] },

  // ===== ME大类 =====
  { name: '机械设计制造及其自动化', subCategory: 'ME-机械', category: 'ME', keywords: ['机械设计', '机械制造', '机械工程', '机械设计制造'] },
  { name: '机械电子工程', subCategory: 'ME-机电', category: 'ME', keywords: ['机械电子', '机电'] },
  { name: '车辆工程', subCategory: 'ME-机械', category: 'ME', keywords: ['车辆工程', '车辆'] },
  { name: '电气工程及其自动化', subCategory: 'ME-电气', category: 'ME', keywords: ['电气工程', '电气'] },
  { name: '自动化', subCategory: 'ME-自动化', category: 'ME', keywords: ['自动化'] },
  { name: '测控技术与仪器', subCategory: 'ME-自动化', category: 'ME', keywords: ['测控', '仪器', '仪器仪表'] },
  { name: '机器人工程', subCategory: 'ME-自动化', category: 'ME', keywords: ['机器人'] },

  // ===== MGMT大类（放在EE前面！防截胡）=====
  { name: '人力资源管理', subCategory: 'MGMT-HR', category: 'MGMT', keywords: ['人力资源管理', '人力资源'] },
  { name: '工商管理', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['工商管理'] },
  { name: '电子商务', subCategory: 'MGMT-电商', category: 'MGMT', keywords: ['电子商务', '电商'] },
  { name: '会计学', subCategory: 'MGMT-会计', category: 'MGMT', keywords: ['会计学', '会计', '财务管理', '财务'] },
  { name: '工业工程', subCategory: 'MGMT-工业工程', category: 'MGMT', keywords: ['工业工程'] },
  { name: '市场营销', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['市场营销', '市场'] },
  { name: '物流管理', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['物流管理', '物流', '供应链'] },
  { name: '信息管理与信息系统', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['信息管理', '信管'] },
  { name: '行政管理', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['行政管理'] },
  { name: '公共事业管理', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['公共事业管理'] },
  { name: '旅游管理', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['旅游管理'] },
  { name: '金融学', subCategory: 'MGMT-会计', category: 'MGMT', keywords: ['金融', '金融学', '经济学'] },
  { name: '国际经济与贸易', subCategory: 'MGMT-工管', category: 'MGMT', keywords: ['国际经济', '国际贸易', '国贸'] },

  // ===== LA大类 =====
  { name: '英语', subCategory: 'LA-英语', category: 'LA', keywords: ['英语', '商务英语', '翻译(英语)'] },
  { name: '日语', subCategory: 'LA-日语', category: 'LA', keywords: ['日语', '商务日语'] },
  { name: '汉语国际教育', subCategory: 'LA-英语', category: 'LA', keywords: ['汉语国际', '对外汉语'] },
  { name: '法学', subCategory: '其他', category: 'LA', keywords: ['法学', '法律'] },

  // ===== ART大类 =====
  { name: '产品设计', subCategory: 'ART-设计', category: 'ART', keywords: ['产品设计', '工业设计'] },
  { name: '视觉传达设计', subCategory: 'ART-设计', category: 'ART', keywords: ['视觉传达', '平面设计'] },
  { name: '环境设计', subCategory: 'ART-设计', category: 'ART', keywords: ['环境设计'] },
  { name: '动画', subCategory: 'ART-设计', category: 'ART', keywords: ['动画', '数字媒体艺术'] },
  { name: '服装与服饰设计', subCategory: 'ART-设计', category: 'ART', keywords: ['服装设计'] },
];

/**
 * 专业名称 → 二级分类
 * ⚠️ 匹配规则（与Python版一致）：
 * 1. MGMT大类优先（防"电子商务"被"电子"截胡）
 * 2. 找完整关键词匹配（不拆单字）
 * 3. 未匹配 → "其他"
 */
export function encodeMajor(majorName: string): string {
  const clean = majorName.replace(/\s+/g, '');

  // 先遍历MGMT大类（优先级最高）
  for (const entry of MAJOR_MAPPING) {
    if (entry.category === 'MGMT') {
      for (const kw of entry.keywords) {
        if (clean.includes(kw)) {
          return entry.subCategory;
        }
      }
    }
  }

  // 再遍历所有专业
  for (const entry of MAJOR_MAPPING) {
    for (const kw of entry.keywords) {
      if (clean.includes(kw)) {
        return entry.subCategory;
      }
    }
  }

  return '其他';
}

/** 专业名称 → 二级分类中文名 */
export function getSubCategoryLabel(subCategory: string): string {
  const labels: Record<string, string> = {
    'IT-计算机': '计算机',
    'IT-软件': '软件工程',
    'IT-网络': '网络工程',
    'IT-信安': '信息安全',
    'IT-物联网': '物联网',
    'IT-人工智能': '人工智能',
    'EE-电子': '电子',
    'EE-通信': '通信',
    'ME-机械': '机械',
    'ME-机电': '机电',
    'ME-电气': '电气',
    'ME-自动化': '自动化',
    'MGMT-HR': '人力资源管理',
    'MGMT-工管': '工商管理',
    'MGMT-电商': '电子商务',
    'MGMT-会计': '会计/金融',
    'MGMT-工业工程': '工业工程',
    'LA-英语': '英语',
    'LA-日语': '日语',
    'ART-设计': '设计',
    '其他': '其他',
  };
  return labels[subCategory] || subCategory;
}

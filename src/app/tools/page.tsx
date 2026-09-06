import Link from 'next/link';
import {
  Map, Briefcase, BarChart3, GraduationCap, Route, Compass, ArrowRight, Radar,
} from 'lucide-react';

/**
 * 工具栏 — 收纳各能力/内容入口，统一在此选择使用。
 * 依据 C 端产品结构收敛原则：主对话口 + 5条核心链路为主，其余工具/内容收敛到本板块。
 */

export const metadata = {
  title: '工具栏 — 职途星',
  description:
    '职途星工具栏：行业地图、岗位百科、判断力内容库、干货库、学习路径、考研就业决策，一站式选择使用。',
};

const tools = [
  {
    name: '行业地图',
    desc: '全国公司与岗位面试情报，聚合脱敏',
    href: '/industry-map',
    icon: <Map className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    name: '岗位百科',
    desc: '浏览真实岗位信息，了解岗位要求',
    href: '/jobs',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    name: '判断力内容库',
    desc: '行业雷达 / 潜台词词条 / 认知库 / 能力词典',
    href: '/insights',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    name: '干货库',
    desc: '简历模板、面试技巧、求职干货',
    href: '/resources',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    name: '学习路径',
    desc: '分阶段掌握求职能力，逐步进阶',
    href: '/learning-path',
    icon: <Route className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    name: '考研就业决策',
    desc: '用真实画像推演，不靠拍脑袋决定',
    href: '/assistant?bot=decision',
    icon: <Compass className="w-5 h-5" />,
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E293B]">
      <section className="relative pt-16 sm:pt-24 pb-14 sm:pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] blob-primary -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] blob-accent translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-6 text-[#165DFF] text-sm font-medium">
              工具栏
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 heading-tight">
              求职工具，一站选择
            </h1>
            <p className="text-[#64748B] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              行业地图、岗位百科、内容库、干货库等能力入口都在这里，
              挑一个开始，让小职陪你走好求职每一步。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool, i) => (
              <Link
                key={tool.name}
                href={tool.href}
                className="bento-card group hover:-translate-y-1.5 transition-all duration-300"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg shadow-[#165DFF]/20 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {tool.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-1.5 group-hover:text-[#165DFF] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-[#64748B] text-sm leading-relaxed mb-4">{tool.desc}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-[#165DFF] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  进入使用 <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>

          {/* 内容能力边界入口：让用户/搜索引擎一眼看到职途星内容底座真实规模 */}
          <Link
            href="/capability"
            className="group mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#165DFF]/15 bg-gradient-to-br from-[#165DFF]/5 to-[#3D7FFF]/5 px-6 py-5 transition hover:border-[#165DFF]/30 hover:shadow-md sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white shadow-lg shadow-[#165DFF]/20 group-hover:scale-110 transition-transform duration-300">
                <Radar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#1E293B]">内容能力边界</span>
                  <span className="rounded-full bg-[#165DFF]/10 px-2 py-0.5 text-xs font-medium text-[#165DFF]">全景看板</span>
                </div>
                <p className="mt-1 text-sm text-[#64748B]">
                  行业雷达 / 词条库 / 认知库 / 能力词典 / 判断力因果层，一眼看清职途星能帮你什么。
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#165DFF]">
              查看内容底座 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <div className="mt-12 text-center">
            <p className="text-[#94A3B8] text-sm">
              想先规划方向，还是直接开始投递？
            </p>
            <Link
              href="/chat"
              className="btn-gradient px-7 py-3 rounded-2xl font-semibold text-sm inline-flex items-center gap-2 mt-4"
            >
              找小职聊聊
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

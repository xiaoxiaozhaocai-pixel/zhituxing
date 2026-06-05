'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Breadcrumb from '@/components/Breadcrumb';
import { QUIZ_QUESTIONS, calculateQuizResult, type QuizResult } from '@/lib/assessment-engine';
import { BarChart3, ChevronLeft, ChevronRight, Award, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

const DIMENSION_ICONS: Record<string, string> = {
  '自我认知': '🧠',
  '职业方向': '🧭',
  '技能匹配': '🔧',
  '求职准备': '📋',
};

export default function QuizPage() {
  const [step, setStep] = useState<'quiz' | 'result'>('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = Math.round((Object.keys(answers).length / QUIZ_QUESTIONS.length) * 100);

  function handleAnswer(value: string) {
    const newAnswers = { ...answers, [question!.id]: value };
    setAnswers(newAnswers);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 完成所有题目
      const quizResult = calculateQuizResult(newAnswers);
      setResult(quizResult);
      setStep('result');
    }
  }

  function handlePrev() {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  }

  function handleRestart() {
    setAnswers({});
    setCurrentQuestion(0);
    setResult(null);
    setStep('quiz');
  }

  // 获取状态颜色
  function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-500';
  }

  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
        <Breadcrumb theme="light" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" />
        <div className="max-w-4xl mx-auto px-4">
          {/* 总览卡片 */}
          <Card className="border-blue-100 overflow-hidden mb-6">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardContent className="py-8 text-center">
              <Award className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-[#1E293B] mb-2">测评完成</h1>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-xl text-[#64748B] font-normal"> / 100</span>
              </div>
              <Badge className={`text-sm px-3 py-1 ${
                result.overallGrade === '优秀' ? 'bg-green-50 text-green-700' :
                result.overallGrade === '良好' ? 'bg-blue-50 text-blue-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {result.overallGrade}
              </Badge>
              <p className="text-[#64748B] mt-3 max-w-md mx-auto">{result.suggestion}</p>
            </CardContent>
          </Card>

          {/* 维度得分 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {result.dimensions.map((dim) => (
              <Card key={dim.name} className="border-[#E2E8F0]">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#1E293B] flex items-center gap-2">
                      <span>{DIMENSION_ICONS[dim.name] || '📊'}</span>
                      {dim.name}
                    </h3>
                    <Badge className={`text-xs ${
                      dim.level === '优秀' ? 'bg-green-50 text-green-700' :
                      dim.level === '良好' ? 'bg-blue-50 text-blue-700' :
                      dim.level === '达标' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {dim.level}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className={`text-3xl font-bold ${getScoreColor(dim.score)}`}>{dim.score}</span>
                    <span className="text-sm text-[#94A3B8] mb-1">/ {dim.maxScore}</span>
                  </div>
                  <Progress value={dim.score} className="h-2" />
                  <p className="text-xs text-[#94A3B8] mt-1">超过 {dim.percentile}% 的测评者</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 优势与短板 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 优势 */}
            <Card className="border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-700 text-base flex items-center gap-1">
                  <Award className="w-4 h-4" /> 你的优势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <Badge key={i} className="bg-green-50 text-green-700 border-green-200">
                      {DIMENSION_ICONS[s] || ''} {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 短板 */}
            <Card className="border-orange-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-700 text-base flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> 需要提升
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.gapSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.gapSkills.map((s, i) => (
                      <Badge key={i} className="bg-orange-50 text-orange-700 border-orange-200">
                        {DIMENSION_ICONS[s] || ''} {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">各维度均表现良好，继续保持！</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 行动按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRestart} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              重新测评
            </Button>
            <Link href="/assessment">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                查看历史测评
              </Button>
            </Link>
            <Link href="/assistant">
              <Button className="bg-[#1E3A8A] hover:bg-[#1E40AF] gap-2">
                <Sparkles className="w-4 h-4" />
                和小职聊聊结果
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 答题界面
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <Breadcrumb theme="light" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8" />
      <div className="max-w-2xl mx-auto px-4">
        {/* 进度条 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#64748B]">
              第 {currentQuestion + 1} / {QUIZ_QUESTIONS.length} 题
            </span>
            <span className="text-sm text-[#64748B]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 题目卡片 */}
        <Card className="border-blue-100 shadow-lg">
          <CardContent className="py-8">
            {/* 维度标签 */}
            <div className="mb-4">
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs">
                {DIMENSION_ICONS[question!.dimension] || '📊'} {question!.dimension}
              </Badge>
            </div>

            {/* 题目 */}
            <h2 className="text-xl font-bold text-[#1E293B] mb-8">
              {question!.id}. {question!.text}
            </h2>

            {/* 选项 */}
            <div className="space-y-3">
              {question!.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    answers[question!.id] === option.value
                      ? 'border-[#1E3A8A] bg-blue-50'
                      : 'border-[#E2E8F0] hover:border-[#1E3A8A]/50 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      answers[question!.id] === option.value
                        ? 'bg-[#1E3A8A] text-white'
                        : 'bg-gray-100 text-[#64748B]'
                    }`}>
                      {option.value}
                    </span>
                    <span className="text-[#334155]">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 导航按钮 */}
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                上一题
              </Button>
              <span className="text-sm text-[#94A3B8] self-center">
                点击选项自动进入下一题
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 提示 */}
        <p className="text-center text-xs text-[#94A3B8] mt-4">
          共 12 题，预计 3 分钟完成 · 结果即时生成
        </p>
      </div>
    </div>
  );
}

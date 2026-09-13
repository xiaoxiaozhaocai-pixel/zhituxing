'use client';

/**
 * 小职可交互头像：让小职"活着"
 *
 * 交互设计（40px 消息头像上做轻量彩蛋，不干扰聊天主流程）：
 * - 点击：弹性蹦一下 + 随机台词气泡（"戳我干嘛～"）
 * - 拖拽：小职挣扎摆动（切 angry 贴图）+ 喊话，松手弹性回弹原位
 * - 悬停：轻微放大
 * - 思考中（等待 AI 回复）：idle 贴图 + 呼吸动画
 * - 共情表情：由消息 emotion 驱动（自动变表情主链路）
 *
 * 渲染优先级：拖拽挣扎(angry) > 思考中(idle) > 共情贴图 > 默认图标
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { EMOTION_IMAGES, IDLE_IMAGE, type Emotion } from '@/lib/emotion';

const CLICK_LINES = [
  '戳我干嘛～', '在呢在呢！', '嘿嘿，精神了',
  '有什么想聊的？', '我在认真听～', '再戳就熟了啊',
];
const DRAG_LINES = ['哎哎别拽我！', '放我下来！', '救命——', '工牌要掉了！', '头发要掉了！'];
const RELEASE_LINES = ['吓我一跳…', '呜，回去继续搬砖', '哼，不理你了'];

interface XiaozhiAvatarProps {
  /** 共情式表情（由用户消息情绪驱动） */
  emotion?: Emotion | null;
  /** 等待 AI 回复中：idle 贴图 + 呼吸 */
  isThinking?: boolean;
  /** 默认图标（无贴图时显示） */
  iconNode: ReactNode;
  iconColorClass?: string;
}

const DRAG_LIMIT = 80;

export default function XiaozhiAvatar({ emotion, isThinking, iconNode, iconColorClass }: XiaozhiAvatarProps) {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [bubble, setBubble] = useState<string | null>(null);
  const [bounceKey, setBounceKey] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
  }, []);

  const showBubble = (lines: string[], duration = 1800) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
    bubbleTimer.current = setTimeout(() => setBubble(null), duration);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 6) {
      // 移动超过阈值判定为拖拽（否则松手算点击）
      movedRef.current = true;
      setDragging(true);
      showBubble(DRAG_LINES, 1500);
    }
    if (movedRef.current) {
      setOffset({
        x: Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, dx)),
        y: Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, dy)),
      });
    }
  };

  const onPointerUp = () => {
    if (!startRef.current) return;
    if (movedRef.current) {
      setDragging(false);
      setOffset({ x: 0, y: 0 });
      showBubble(RELEASE_LINES);
    } else {
      setBounceKey((k) => k + 1);
      showBubble(CLICK_LINES);
    }
    startRef.current = null;
  };

  const activeEmotion = dragging
    ? EMOTION_IMAGES.angry
    : isThinking
      ? IDLE_IMAGE
      : emotion
        ? EMOTION_IMAGES[emotion]
        : null;

  return (
    <div className="relative flex-shrink-0">
      {/* 台词气泡 */}
      {bubble && (
        <div className="xiaozhi-bubble absolute bottom-full left-1/2 mb-2 z-30 whitespace-nowrap px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl shadow-md pointer-events-none">
          {bubble}
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`xiaozhi-avatar w-10 h-10 rounded-full flex items-center justify-center overflow-hidden cursor-pointer ${
          activeEmotion ? 'bg-transparent' : 'bg-white border-2 border-slate-200'
        } ${dragging ? 'z-20 shadow-lg' : ''}`}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        title="戳戳小职"
      >
        {activeEmotion ? (
          // eslint-disable-next-line @next/next/no-img-element -- 40px 静态贴图已手动压缩为 WebP，无需 next/image 开销
          <img
            key={`${activeEmotion}-${bounceKey}`}
            src={activeEmotion}
            alt="小职"
            draggable={false}
            className={`w-10 h-10 object-contain xiaozhi-face ${
              dragging ? 'xiaozhi-wiggle' : isThinking ? 'xiaozhi-breathe' : 'emotion-pop'
            }`}
          />
        ) : (
          <span key={`icon-${bounceKey}`} className={`xiaozhi-face ${iconColorClass ?? ''} ${bounceKey > 0 ? 'emotion-pop' : ''}`}>
            {iconNode}
          </span>
        )}
      </div>
    </div>
  );
}

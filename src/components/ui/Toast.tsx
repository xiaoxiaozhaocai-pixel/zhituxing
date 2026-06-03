'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 延迟显示，触发淡入动画
    requestAnimationFrame(() => setIsVisible(true));

    // 自动关闭
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等淡出动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-[20%] left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg
        text-base font-medium
        transition-all duration-300
        ${type === 'success' 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-red-50 text-red-700 border border-red-200'
        }
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button 
        className="ml-2 hover:opacity-70 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast管理器
interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

let toastList: ToastItem[] = [];
let listeners: ((toasts: ToastItem[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toastList]));
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const id = Date.now().toString();
  toastList = [...toastList, { id, message, type }];
  notifyListeners();

  // 自动移除
  setTimeout(() => {
    toastList = toastList.filter(t => t.id !== id);
    notifyListeners();
  }, 3000 + 300);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => {
            toastList = toastList.filter(t => t.id !== toast.id);
            notifyListeners();
          }}
        />
      ))}
    </>
  );
}

// 职途星组态引擎 · 典型岗位列表
'use client';

import React from 'react';

interface JobTypeListProps {
  jobs: string[];
}

export default function JobTypeList({ jobs }: JobTypeListProps) {
  return (
    <div className="px-4 pb-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">📌 典型岗位（可投递方向）</p>
        <div className="flex flex-wrap gap-1.5">
          {jobs.map((job) => (
            <span
              key={job}
              className="inline-block px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700"
            >
              {job}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

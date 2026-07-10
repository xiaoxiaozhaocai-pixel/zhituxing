'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X, Check, ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== Types =====

interface CategoryGroup {
  name: string;
  skills: string[];
}

interface TagsResponse {
  success: boolean;
  data: {
    domains: CategoryGroup[];
    categories: CategoryGroup[];
  };
}

interface SkillTagInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
}

// ===== SkillTagInput Component =====

export default function SkillTagInput({
  value = [],
  onChange,
  placeholder = '搜索并选择技能标签...',
}: SkillTagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [domains, setDomains] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始加载所有技能
  useEffect(() => {
    async function loadAll() {
      try {
        const res = await fetch('/api/skills/tags');
        const json: TagsResponse = await res.json();
        if (json.success) {
          setDomains(json.data.domains);
          setCategories(json.data.categories);
        }
      } catch (err) {
        console.error('加载技能标签失败:', err);
      }
    }
    loadAll();
  }, []);

  // 搜索技能
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/skills/tags?search=${encodeURIComponent(q)}`);
      const json: TagsResponse = await res.json();
      if (json.success) {
        // 从所有域中搜集匹配的技能名（最多10个）
        const matched = new Set<string>();
        for (const domain of json.data.domains) {
          for (const s of domain.skills) {
            if (matched.size >= 10) break;
            matched.add(s);
          }
          if (matched.size >= 10) break;
        }
        setSearchResults(Array.from(matched));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // 防抖搜索
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  // 添加/移除技能
  const toggleSkill = (skill: string) => {
    if (value.includes(skill)) {
      onChange(value.filter((s) => s !== skill));
    } else {
      onChange([...value, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  // 从分类中选择
  const handleCategorySelect = (domain: CategoryGroup) => {
    const newSkills = [...value];
    for (const s of domain.skills) {
      if (!newSkills.includes(s)) {
        newSkills.push(s);
      }
    }
    onChange(newSkills);
    setOpen(false);
  };

  // 当前显示的建议列表
  const suggestions = search.trim() ? searchResults : [];

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white',
              'text-sm text-left transition-all',
              'focus:outline-none focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/8',
              value.length > 0 ? 'h-auto min-h-[36px]' : 'h-9',
            )}
          >
            <div className="flex-1 flex flex-wrap gap-1.5">
              {value.length === 0 && (
                <span className="text-gray-400 text-sm">{placeholder}</span>
              )}
              {value.slice(0, 8).map((skill) => (
                <Badge
                  key={skill}
                  className="bg-[#165DFF]/10 text-[#165DFF] border-0 text-xs font-normal rounded-full px-2.5 py-0.5 flex items-center gap-1 group"
                >
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSkill(skill);
                    }}
                  />
                </Badge>
              ))}
              {value.length > 8 && (
                <Badge className="bg-gray-100 text-gray-500 border-0 text-xs rounded-full px-2">
                  +{value.length - 8}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="搜索技能..."
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? '搜索中...' : '未找到匹配技能'}
              </CommandEmpty>

              {/* 搜索结果 */}
              {suggestions.length > 0 && (
                <CommandGroup heading="搜索结果">
                  {suggestions.map((skill) => (
                    <CommandItem
                      key={skill}
                      onSelect={() => toggleSkill(skill)}
                      className="flex items-center justify-between"
                    >
                      <span>{skill}</span>
                      {value.includes(skill) && (
                        <Check className="h-4 w-4 text-[#165DFF]" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 预设分类 */}
              {!search.trim() && (
                <>
                  {domains.slice(0, 6).map((domain) => (
                    <CommandGroup key={domain.name} heading={domain.name}>
                      {domain.skills.slice(0, 5).map((skill) => (
                        <CommandItem
                          key={skill}
                          onSelect={() => toggleSkill(skill)}
                          className="flex items-center justify-between"
                        >
                          <span>{skill}</span>
                          {value.includes(skill) && (
                            <Check className="h-4 w-4 text-[#165DFF]" />
                          )}
                        </CommandItem>
                      ))}
                      {domain.skills.length > 5 && (
                        <CommandItem
                          onSelect={() => handleCategorySelect(domain)}
                          className="text-[#165DFF] text-xs font-medium"
                        >
                          <Layers className="h-3.5 w-3.5 mr-1" />
                          添加全部 {domain.skills.length} 项
                        </CommandItem>
                      )}
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 已选技能展示 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((skill) => (
            <Badge
              key={skill}
              className="bg-[#165DFF] text-white border-0 text-xs font-normal rounded-full px-2.5 py-0.5 flex items-center gap-1 group"
            >
              {skill}
              <X
                className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                onClick={() => removeSkill(skill)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

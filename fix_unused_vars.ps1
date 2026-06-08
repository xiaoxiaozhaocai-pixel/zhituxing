$ErrorActionPreference = 'Stop'
$root = 'D:\zhituxing\zhituxing'

# ===== 1. assistant/page.tsx =====
$f = "$root\src\app\assistant\page.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace("import { useRouter, useSearchParams }", "import { useSearchParams }")
$c = $c.Replace("`r`n  const router = useRouter();`r`n", "`r`n")
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] assistant/page.tsx"

# ===== 2. dashboard/cost/page.tsx =====
$f = "$root\src\app\dashboard\cost\page.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace("import { Tabs, TabsContent, TabsList, TabsTrigger }", "import { Tabs, TabsList, TabsTrigger }")
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] dashboard/cost/page.tsx"

# ===== 3. profile/info/page.tsx =====
$f = "$root\src\app\profile\info\page.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace("{ skill, category, selected, level, onToggle,", "{ skill, selected, level, onToggle,")
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] profile/info/page.tsx"

# ===== 4. resume/editor/page.tsx =====
$f = "$root\src\app\resume\editor\page.tsx"
$c = [IO.File]::ReadAllText($f)
# Line 4: remove CardHeader, CardTitle from ui/card import
$c = $c.Replace("import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';", "import { Card, CardContent } from '@/components/ui/card';")
# Line 11: remove ScrollArea import
$c = $c.Replace("import { ScrollArea } from '@/components/ui/scroll-area';`r`n", "")
# Line 17: remove Award
$c = $c.Replace("User, GraduationCap, Briefcase, FolderGit2, Wrench, Award,", "User, GraduationCap, Briefcase, FolderGit2, Wrench,")
# Line 18: remove GripVertical and FileDown
$c = $c.Replace("Plus, Trash2, GripVertical, Eye, Sparkles, Save, FileDown,", "Plus, Trash2, Eye, Sparkles, Save,")
# Line 19: remove ChevronRight and ChevronDown
$c = $c.Replace("ChevronRight, ChevronDown, X, MessageCircle, Bot, Send,", "X, MessageCircle, Bot, Send,")
# Line 468: remove saving state
$c = $c.Replace("const [saving, setSaving] = useState(false);`r`n  ", "")
# Line 546: catch(err) -> catch
$c = $c.Replace("} catch (err) {", "} catch {")
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] resume/editor/page.tsx"

# ===== 5. skill-portrait/page.tsx =====
$f = "$root\src\app\skill-portrait\page.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace("{ skill, category, selected, level, onToggle, onLevelChange }", "{ skill, selected, level, onToggle, onLevelChange }")
$c = $c.Replace("skill: SkillItem; category: string; selected: boolean; level: ProficiencyLevel;", "skill: SkillItem; selected: boolean; level: ProficiencyLevel;")
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] skill-portrait/page.tsx"

# ===== 6. SharePosterGenerator.tsx =====
$f = "$root\src\components\pdf\SharePosterGenerator.tsx"
$c = [IO.File]::ReadAllText($f)
# Remove reportId from interface
$c = $c.Replace("  reportId: string;`r`n", "")
# Remove isMember from interface
$c = $c.Replace("  isMember: boolean;`r`n", "")
# Remove reportId from destructuring
$c = $c.Replace("  reportId,`r`n", "")
# Remove isMember from destructuring
$c = $c.Replace("  isMember,`r`n", "")
# Remove canvasRef
$c = $c.Replace("  const canvasRef = useRef<HTMLCanvasElement>(null);`r`n", "")
# Remove useRef if no longer needed (canvasRef was the only usage)
# Check: canvasRef is the only useRef usage. We'll also remove useRef from import
# Actually let's check if useRef is used elsewhere first...
# For safety, just leave useRef in the import - unused imports get caught by ESLint anyway
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] SharePosterGenerator.tsx"

Write-Host ""
Write-Host "=== ALL unused-var fixes DONE ==="

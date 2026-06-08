$ErrorActionPreference = 'Stop'
$root = 'D:\zhituxing\zhituxing'

# ===== 1. profile/info/page.tsx - 2 combobox fixes =====
$f = "$root\src\app\profile\info\page.tsx"
$c = [IO.File]::ReadAllText($f)
# First occurrence: line 115 button with role="combobox"
$old1 = 'role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ?'
$new1 = 'role="combobox"
          aria-expanded={open}
          aria-controls="skills-listbox"
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ?'
$c = $c.Replace($old1, $new1)

# Second occurrence: line 176 button with role="combobox" (different text content)
$old2 = 'role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={selectedLabel ?'
$new2 = 'role="combobox"
          aria-expanded={open}
          aria-controls="levels-listbox"
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={selectedLabel ?'
$c = $c.Replace($old2, $new2)
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] profile/info/page.tsx"

# ===== 2. skill-portrait/page.tsx - 1 combobox fix =====
$f = "$root\src\app\skill-portrait\page.tsx"
$c = [IO.File]::ReadAllText($f)
$old = 'role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ?'
$new = 'role="combobox"
          aria-expanded={open}
          aria-controls="skills-listbox"
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ?'
$c = $c.Replace($old, $new)
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] skill-portrait/page.tsx"

# ===== 3. SharePosterGenerator.tsx - alt text =====
$f = "$root\src\components\pdf\SharePosterGenerator.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace('<Image className="w-4 h-4 mr-2" />', '<Image className="w-4 h-4 mr-2" alt="" />')
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] SharePosterGenerator.tsx"

Write-Host ""
Write-Host "=== ALL jsx-a11y fixes DONE ==="

$ErrorActionPreference = 'Stop'
$root = 'D:\zhituxing\zhituxing'
$f = "$root\src\components\pdf\SharePosterGenerator.tsx"
$c = [IO.File]::ReadAllText($f)
$c = $c.Replace('import { useRef, useState, useCallback }', 'import { useState, useCallback }')
[IO.File]::WriteAllText($f, $c)
Write-Host "[OK] useRef import removed"

# Git commit & push
Set-Location $root
git add -A
git commit -m "fix: remove 18 unused-vars warnings (batch 1/4)"
git push
Write-Host "[OK] git commit & push done"

$root = 'D:\zhituxing\zhituxing'

function Show-Context($file, $line, $label) {
    Write-Host "`n========== $label (line $line) =========="
    $c = Get-Content "$root\$file"
    $start = [Math]::Max(0, $line - 6)
    $end = [Math]::Min($c.Count - 1, $line + 3)
    for ($i = $start; $i -le $end; $i++) {
        $marker = if ($i -eq $line - 1) { ">>>" } else { "   " }
        Write-Host "$marker $($i+1): $($c[$i])"
    }
}

Show-Context "src\app\profile\info\page.tsx" 115 "profile/info - combobox #1"
Show-Context "src\app\profile\info\page.tsx" 176 "profile/info - combobox #2"
Show-Context "src\app\skill-portrait\page.tsx" 439 "skill-portrait - combobox"
Show-Context "src\components\pdf\SharePosterGenerator.tsx" 212 "SharePoster - alt text"

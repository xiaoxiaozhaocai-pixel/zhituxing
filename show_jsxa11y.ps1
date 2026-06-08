$root = 'D:\zhituxing\zhituxing'
$content = Get-Content "$root\eslint_jsxa11y.txt" -Raw
$lines = $content -split "`n"

# Show 10 lines before each jsx-a11y match (to capture file header)
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'jsx-a11y') {
        $start = [Math]::Max(0, $i - 10)
        Write-Host "=== MATCH at line $i ==="
        for ($k = $start; $k -le [Math]::Min($lines.Count - 1, $i + 2); $k++) {
            Write-Host $lines[$k]
        }
        Write-Host ""
    }
}

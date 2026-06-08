$ErrorActionPreference = 'Stop'
$root = 'D:\zhituxing\zhituxing'
Set-Location $root

# Run ESLint with only jsx-a11y rules, save full output
$outFile = "$root\eslint_jsxa11y.txt"
npx eslint src/ --rule '@typescript-eslint/no-unused-vars: off' --rule 'react-hooks/exhaustive-deps: off' --rule 'react-hooks/immutability: off' 2>&1 | Out-File -FilePath $outFile -Encoding UTF8

Write-Host "ESLint output saved to eslint_jsxa11y.txt"
Write-Host "File size: $((Get-Item $outFile).Length) bytes"

# Show jsx-a11y lines
$content = Get-Content $outFile -Raw
$lines = $content -split "`n" | Where-Object { $_ -match 'jsx-a11y' }
Write-Host "`n=== jsx-a11y warnings ==="
Write-Host "Count: $($lines.Count)"
$lines | ForEach-Object { Write-Host $_ }

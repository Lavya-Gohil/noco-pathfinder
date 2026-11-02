# Applies Morph with PowerPoint itself, saves, and exports each slide as an image.
param([string]$Dir, [string]$Out)
$already = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$app = New-Object -ComObject PowerPoint.Application
$raw = Join-Path $Dir 'raw.pptx'
$p = $app.Presentations.Open($raw, $false, $false, $false)
$n = $p.Slides.Count
for ($i = 1; $i -le $n; $i++) {
  $s = $p.Slides.Item($i)
  $s.Shapes.Title.Name = '!!title'
  if ($i -ge 2 -and $i -le 10) {
    $s.SlideShowTransition.EntryEffect = 3954   # ppEffectMorphByObject
    $s.SlideShowTransition.Duration = 1.1
  }
  $s.SlideShowTransition.AdvanceOnClick = -1
}
foreach ($sh in $p.Slides.Item(7).Shapes) {
  if ($sh.Name -eq 'demo-button') { $sh.ActionSettings.Item(1).Hyperlink.Address = 'https://lavya-gohil.github.io/noco-pathfinder/#/demo' }
}
$p.Slides.Item(11).SlideShowTransition.Hidden = -1
$p.SaveAs($Out, 24)  # ppSaveAsOpenXMLPresentation
$img = Join-Path $Dir 'render'
if (Test-Path $img) { Remove-Item $img -Recurse -Force }
New-Item -ItemType Directory $img | Out-Null
for ($i = 1; $i -le $n; $i++) { $p.Slides.Item($i).Export((Join-Path $img ("s{0:00}.png" -f $i)), 'PNG', 1600, 900) }
for ($i = 1; $i -le $n; $i++) {
  $s = $p.Slides.Item($i)
  "{0,2} effect={1} dur={2} hidden={3} shapes: {4}" -f $i, $s.SlideShowTransition.EntryEffect, $s.SlideShowTransition.Duration, $s.SlideShowTransition.Hidden, (($s.Shapes | ForEach-Object { $_.Name }) -join ', ')
}
$p.Close()
if (-not $already -and $app.Presentations.Count -eq 0) { $app.Quit() }

# Render a PPTX through PowerPoint itself and report what PowerPoint read: each
# slide exported as a PNG, and the slide count, the speaker notes and the media
# on every slide printed as JSON. Used to show the teaching pack as PowerPoint
# draws it (scripts/gen-sample-decks.mjs) and to verify the pitch deck opens with
# its notes (scripts/gen-deck.mjs). Windows with PowerPoint installed only.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/render-pptx.ps1 -In deck.pptx [-Out folder] [-Width 1920]
param(
  [Parameter(Mandatory = $true)][string]$In,
  [string]$Out = "",
  [int]$Width = 1920
)
$ErrorActionPreference = "Stop"
$path = (Resolve-Path -LiteralPath $In).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  # ReadOnly, no title change, no window: PowerPoint opens the file the way a viewer would.
  $deck = $app.Presentations.Open($path, -1, 0, 0)
  try {
    $height = [int]([math]::Round($Width * $deck.PageSetup.SlideHeight / $deck.PageSetup.SlideWidth))
    $slides = @()
    foreach ($slide in $deck.Slides) {
      $notes = ""
      if ($slide.HasNotesPage) {
        foreach ($shape in $slide.NotesPage.Shapes) {
          try { $isBody = $shape.PlaceholderFormat.Type -eq 2 } catch { $isBody = $false } # 2 is the notes body placeholder
          if ($isBody -and $shape.HasTextFrame) { $notes = $shape.TextFrame.TextRange.Text }
        }
      }
      $media = 0
      foreach ($shape in $slide.Shapes) { if ($shape.Type -eq 16) { $media += 1 } }
      if ($Out) {
        New-Item -ItemType Directory -Force -Path $Out | Out-Null
        $file = Join-Path (Resolve-Path -LiteralPath $Out).Path ("slide-{0:D2}.png" -f $slide.SlideIndex)
        $slide.Export($file, "PNG", $Width, $height)
      }
      $slides += [pscustomobject]@{ index = $slide.SlideIndex; notes = $notes; media = $media; shapes = $slide.Shapes.Count }
    }
    [pscustomobject]@{ file = $path; slides = $deck.Slides.Count; width = $deck.PageSetup.SlideWidth; height = $deck.PageSetup.SlideHeight; detail = $slides } | ConvertTo-Json -Depth 4
  } finally { $deck.Close() }
} finally {
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}

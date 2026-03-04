Add-Type -AssemblyName System.Drawing

function New-GradientBrush([int]$w, [int]$h) {
  $rect = [System.Drawing.Rectangle]::new(0,0,$w,$h)
  return [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, [System.Drawing.Color]::FromArgb(10,52,131), [System.Drawing.Color]::FromArgb(48,158,255), 35)
}

function Draw-BaseBrand($g, [int]$cx, [int]$cy, [int]$size) {
  $bookColor = [System.Drawing.Color]::FromArgb(21,196,230)
  $bookDark = [System.Drawing.Color]::FromArgb(9,45,117)
  $white = [System.Drawing.Color]::White

  $bookBrush = [System.Drawing.SolidBrush]::new($bookColor)
  $darkBrush = [System.Drawing.SolidBrush]::new($bookDark)
  $whiteBrush = [System.Drawing.SolidBrush]::new($white)

  $left = [System.Drawing.Rectangle]::new([int]($cx - $size*0.42), [int]($cy - $size*0.25), [int]($size*0.34), [int]($size*0.52))
  $right = [System.Drawing.Rectangle]::new([int]($cx + $size*0.08), [int]($cy - $size*0.25), [int]($size*0.34), [int]($size*0.52))
  $bottomLeft = [System.Drawing.Rectangle]::new([int]($cx - $size*0.42), [int]($cy + $size*0.22), [int]($size*0.34), [int]($size*0.08))
  $bottomRight = [System.Drawing.Rectangle]::new([int]($cx + $size*0.08), [int]($cy + $size*0.22), [int]($size*0.34), [int]($size*0.08))

  $g.FillRectangle($bookBrush, $left)
  $g.FillRectangle($bookBrush, $right)
  $g.FillRectangle($darkBrush, $bottomLeft)
  $g.FillRectangle($darkBrush, $bottomRight)

  $penW = [int]([Math]::Max(6, $size * 0.05))
  $linkPenWhite = [System.Drawing.Pen]::new($white, $penW)
  $linkPenBlue = [System.Drawing.Pen]::new($bookDark, [int]([Math]::Max(3, $penW*0.55)))

  $ring = [int]($size*0.12)
  $x1 = [int]($cx - $size*0.14)
  $x2 = [int]($cx + $size*0.02)
  $y = [int]($cy - $size*0.03)

  $g.DrawEllipse($linkPenWhite, $x1, $y, $ring, $ring)
  $g.DrawEllipse($linkPenWhite, $x2, $y, $ring, $ring)
  $g.DrawLine($linkPenWhite, [int]($x1 + $ring*0.7), [int]($y + $ring*0.5), [int]($x2 + $ring*0.3), [int]($y + $ring*0.5))

  $g.DrawEllipse($linkPenBlue, $x1, $y, $ring, $ring)
  $g.DrawEllipse($linkPenBlue, $x2, $y, $ring, $ring)
  $g.DrawLine($linkPenBlue, [int]($x1 + $ring*0.7), [int]($y + $ring*0.5), [int]($x2 + $ring*0.3), [int]($y + $ring*0.5))

  $centerSq = [System.Drawing.Rectangle]::new([int]($cx - $size*0.03), [int]($cy + $size*0.01), [int]($size*0.06), [int]($size*0.06))
  $innerSq = [System.Drawing.Rectangle]::new([int]($cx - $size*0.015), [int]($cy + $size*0.025), [int]($size*0.03), [int]($size*0.03))
  $g.FillRectangle($whiteBrush, $centerSq)
  $g.FillRectangle($bookBrush, $innerSq)

  $bookBrush.Dispose(); $darkBrush.Dispose(); $whiteBrush.Dispose(); $linkPenWhite.Dispose(); $linkPenBlue.Dispose()
}

function Save-Png($bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-Canvas([int]$w, [int]$h) {
  $bmp = [System.Drawing.Bitmap]::new($w,$h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $brush = New-GradientBrush $w $h
  $g.FillRectangle($brush, 0,0,$w,$h)
  $brush.Dispose()
  return @{ Bmp = $bmp; G = $g }
}

# icon.png
$c = New-Canvas 1024 1024
Draw-BaseBrand $c.G 512 450 520
$font = [System.Drawing.Font]::new('Segoe UI', 90, [System.Drawing.FontStyle]::Bold)
$sf = [System.Drawing.StringFormat]::new()
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$c.G.DrawString('Learn Base', $font, [System.Drawing.Brushes]::White, [System.Drawing.RectangleF]::new(0,700,1024,200), $sf)
$font.Dispose(); $sf.Dispose(); $c.G.Dispose(); Save-Png $c.Bmp 'icon.png'

# splash.png
$c = New-Canvas 1024 1024
Draw-BaseBrand $c.G 512 430 460
$font = [System.Drawing.Font]::new('Segoe UI', 84, [System.Drawing.FontStyle]::Bold)
$sf = [System.Drawing.StringFormat]::new()
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$c.G.DrawString('Learn Base', $font, [System.Drawing.Brushes]::White, [System.Drawing.RectangleF]::new(0,680,1024,180), $sf)
$font.Dispose(); $sf.Dispose(); $c.G.Dispose(); Save-Png $c.Bmp 'splash.png'

# cover.png
$c = New-Canvas 1200 630
Draw-BaseBrand $c.G 220 250 260
$title = [System.Drawing.Font]::new('Segoe UI', 74, [System.Drawing.FontStyle]::Bold)
$sub = [System.Drawing.Font]::new('Segoe UI', 42, [System.Drawing.FontStyle]::Bold)
$body = [System.Drawing.Font]::new('Segoe UI', 30, [System.Drawing.FontStyle]::Regular)
$c.G.DrawString('Learn Base Safely', $title, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(380,110))
$c.G.DrawString('20 lessons from beginner to technical', $sub, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(380,235))
$c.G.DrawString('Safe lessons. Real understanding.', $body, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(380,320))
$p = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180,255,255,255), 4)
$c.G.DrawArc($p, -180, 340, 1550, 500, 0, 180)
$title.Dispose(); $sub.Dispose(); $body.Dispose(); $p.Dispose(); $c.G.Dispose(); Save-Png $c.Bmp 'cover.png'

# hero.png
$c = New-Canvas 1200 800
Draw-BaseBrand $c.G 180 190 200
$t = [System.Drawing.Font]::new('Segoe UI', 72, [System.Drawing.FontStyle]::Bold)
$b = [System.Drawing.Font]::new('Segoe UI', 34, [System.Drawing.FontStyle]::Regular)
$bb = [System.Drawing.Font]::new('Segoe UI', 34, [System.Drawing.FontStyle]::Bold)
$c.G.DrawString('Learn Base', $t, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(300,105))
$c.G.DrawString('Your safe and beginner-first Base education app', $b, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(300,215))
$c.G.DrawString('BASICS  |  SAFETY  |  TECHNICAL', $bb, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(300,300))
$c.G.DrawString('Short lessons, quizzes, and optional certificates', $b, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(300,380))
$c.G.DrawString('No required swaps, bridges, or risky transactions', $b, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(300,445))
$t.Dispose(); $b.Dispose(); $bb.Dispose(); $c.G.Dispose(); Save-Png $c.Bmp 'hero.png'

# og.png
$c = New-Canvas 1200 630
Draw-BaseBrand $c.G 220 240 240
$t = [System.Drawing.Font]::new('Segoe UI', 84, [System.Drawing.FontStyle]::Bold)
$b = [System.Drawing.Font]::new('Segoe UI', 44, [System.Drawing.FontStyle]::Regular)
$c.G.DrawString('Learn Base', $t, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(380,165))
$c.G.DrawString('Safe lessons. Real understanding.', $b, [System.Drawing.Brushes]::White, [System.Drawing.PointF]::new(380,305))
$t.Dispose(); $b.Dispose(); $c.G.Dispose(); Save-Png $c.Bmp 'og.png'

Write-Output 'Assets generated successfully.'

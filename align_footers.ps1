$dir = "."
$files = Get-ChildItem -Path $dir -Filter *.html

foreach ($file in $files) {
    if ($file.Name -eq "login.html") { continue }
    
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # We define a regex that matches the left block on subpages (supporting both </a> or </div> closing)
    $patternSub = '(?ms)(<div class="footer-left">)\s*<div class="footer-links">(.*?)</div>\s*(<a href="index.html" class="footer-logo-block".*?)(</a>|</div>)\s*<div class="footer-address">\s*<p>(.*?)</p>\s*<p>(.*?)</p>\s*<p class="copyright">(.*?)</p>\s*</div>\s*(</div>)'
    
    # We define a regex that matches the left block on homepages
    $patternHome = '(?ms)(<div class="footer-bottom-left">)\s*<div class="footer-links">(.*?)</div>\s*(<a href="index.html" class="footer-logo-block".*?)(</a>|</div>)\s*<div class="footer-address">\s*<p>(.*?)</p>\s*<p>(.*?)</p>\s*<p class="copyright">(.*?)</p>\s*</div>\s*(</div>)'
    
    $isHome = $file.Name -eq "index.html" -or $file.Name -eq "index_v2.html"
    $pattern = if ($isHome) { $patternHome } else { $patternSub }
    
    $match = [System.Text.RegularExpressions.Regex]::Match($content, $pattern)
    if ($match.Success) {
        $leftClass = $match.Groups[1].Value
        $linksContent = $match.Groups[2].Value.Trim()
        $logoBlockOpen = $match.Groups[3].Value.Trim()
        # Groups[4] is the old closing tag (</a> or </div>)
        $address = $match.Groups[5].Value.Trim()
        $email = $match.Groups[6].Value.Trim()
        $copyright = $match.Groups[7].Value.Trim()
        $closeTag = $match.Groups[8].Value
        
        # Clean up logo block styles to fit inside the flex row
        $cleanLogo = $logoBlockOpen -replace 'margin-bottom:\s*\d+px;?', ''
        $cleanLogo = $cleanLogo -replace 'style="display:\s*flex;\s*align-items:\s*flex-end;\s*gap:\s*\d+px;?', 'style="display: flex; align-items: flex-end; gap: 0px; text-decoration: none; color: inherit; flex-shrink: 0;'
        
        # We append a clean closing </a> tag to the logo block
        $logoBlockFull = "$cleanLogo`r`n                        </a>"
        
        # Format the address block next to the logo
        $newAddress = @"
                        <div class="footer-address" style="text-align: left; font-size: 0.82rem; line-height: 1.6; color: #bbb;">
                            <p style="margin: 0;">$address &nbsp;&nbsp;|&nbsp;&nbsp; $email</p>
                            <p class="copyright" style="margin: 2px 0 0 0; color: #777;">$copyright</p>
                        </div>
"@

        # Format the links row
        $newLinks = @"
                    <div class="footer-links" style="display: flex; align-items: center; gap: 15px; font-size: 0.92rem; margin-top: 5px;">
                        $linksContent
                    </div>
"@

        # Reconstruct the left column
        $newLeftColumn = @"
$leftClass
                    <div class="footer-main-row" style="display: flex; align-items: center; gap: 30px; margin-bottom: 12px;">
                        $logoBlockFull
                        <div class="footer-vertical-divider" style="width: 1px; height: 35px; background: rgba(255,255,255,0.15); flex-shrink: 0;"></div>
                        $newAddress
                    </div>
$newLinks
                $closeTag
"@
        
        $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $newLeftColumn)
        [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
        Write-Output "Aligned footer layout in $($file.Name)"
    } else {
        Write-Output "Regex match failed for $($file.Name)"
    }
}

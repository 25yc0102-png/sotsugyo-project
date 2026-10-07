$ErrorActionPreference = 'Stop'
$port = 5180
$root = $PSScriptRoot
$script:apiKey = ''
$secureKey = Read-Host 'Enter Hot Pepper Gourmet API key' -AsSecureString
$keyPointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $script:apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
}
finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    $secureKey.Dispose()
}

if ($script:apiKey.Length -lt 8 -or $script:apiKey.Length -gt 200) {
    throw 'The API key format is invalid.'
}

function Write-JsonResponse {
    param(
        [System.Net.HttpListenerContext]$Context,
        [int]$StatusCode,
        [object]$Body
    )

    $json = ConvertTo-Json -InputObject $Body -Depth 20 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = 'application/json; charset=utf-8'
    $Context.Response.Headers['Cache-Control'] = 'no-store'
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "Nearby Gourmet: http://127.0.0.1:$port/"
Write-Host 'Press Ctrl+C to stop. The API key stays in server memory only.'

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $path = $request.Url.AbsolutePath
        $statusCode = 200

        try {
            if ($path -eq '/api/status' -and $request.HttpMethod -eq 'GET') {
                Write-JsonResponse $context 200 @{ configured = [bool]$script:apiKey }
            }
            elseif ($path -eq '/api/search' -and $request.HttpMethod -eq 'GET') {
                if (-not $script:apiKey) {
                    Write-JsonResponse $context 400 @{ error = 'Set an API key first.' }
                    $statusCode = 400
                }
                else {
                    $latitude = [double]::Parse($request.QueryString['lat'], [System.Globalization.CultureInfo]::InvariantCulture)
                    $longitude = [double]::Parse($request.QueryString['lng'], [System.Globalization.CultureInfo]::InvariantCulture)
                    $range = [int]::Parse($request.QueryString['range'], [System.Globalization.CultureInfo]::InvariantCulture)

                    if ($latitude -lt -90 -or $latitude -gt 90 -or $longitude -lt -180 -or $longitude -gt 180 -or $range -lt 1 -or $range -gt 5) {
                        Write-JsonResponse $context 400 @{ error = 'Invalid coordinates or search range.' }
                        $statusCode = 400
                    }
                    else {
                        $culture = [System.Globalization.CultureInfo]::InvariantCulture
                        $latText = $latitude.ToString('0.######', $culture)
                        $lngText = $longitude.ToString('0.######', $culture)
                        $query = 'key=' + [System.Uri]::EscapeDataString($script:apiKey) +
                            '&lat=' + $latText + '&lng=' + $lngText +
                            '&range=' + $range + '&count=9&format=json&order=4'
                        $apiUrl = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/?' + $query
                        $result = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 20

                        if ($result.results.error) {
                            Write-JsonResponse $context 502 @{ error = 'Check the API key and search settings.' }
                            $statusCode = 502
                        }
                        else {
                            Write-JsonResponse $context 200 $result
                        }
                    }
                }
            }
            elseif ($request.HttpMethod -eq 'GET') {
                $fileName = switch ($path) {
                    '/' { 'index.html' }
                    '/styles.css' { 'styles.css' }
                    '/app.js' { 'app.js' }
                    default { $null }
                }

                if ($fileName) {
                    $filePath = Join-Path $root $fileName
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $contentType = if ($fileName.EndsWith('.css')) { 'text/css; charset=utf-8' } elseif ($fileName.EndsWith('.js')) { 'application/javascript; charset=utf-8' } else { 'text/html; charset=utf-8' }
                    $context.Response.ContentType = $contentType
                    $context.Response.ContentLength64 = $bytes.Length
                    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                else {
                    $statusCode = 404
                    Write-JsonResponse $context 404 @{ error = 'Not found' }
                }
            }
            else {
                $statusCode = 405
                Write-JsonResponse $context 405 @{ error = 'Method not allowed' }
            }
        }
        catch {
            $statusCode = 502
            try {
                Write-JsonResponse $context 502 @{ error = 'Search failed. Check your connection and API key.' }
            }
            catch {
            }
        }
        finally {
            Write-Host "$($request.HttpMethod) $path -> $statusCode"
            $context.Response.Close()
        }
    }
}
finally {
    $script:apiKey = ''
    $listener.Stop()
    $listener.Close()
}
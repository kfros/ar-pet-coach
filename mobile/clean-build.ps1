Write-Host '🧹 Init total React Native cache clearing...' -ForegroundColor Cyan

# 1. Очистка кэшей Metro Bundler и React Native (Windows Temp)
Write-Host '📦 Removing JS-cache and Metro Bundler...' -ForegroundColor Yellow
$tempPaths = @(
    '$env:TEMP\metro-cache',
    '$env:TEMP\metro-cache\*',
    '$env:TEMP\haste-map-react-native-packager-*',
    '$env:TEMP\react-native-packager-cache-*'
)

foreach ($path in $tempPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host '   [+] Cleaned: ' $path -ForegroundColor Green
    }
    else {
        Write-Host 'No' $path 'to clean' -ForegroundColor Cyan
    }
}

# 2. Cleaning android artifacts (C++ / Gradle)
Write-Host '🛠️ Cleaning C++ (JSI/Fabric) and Gradle caches...' -ForegroundColor Yellow
$androidPaths = @(
    'android\app\.cxx',
    'android\app\build',
    'android\build',
    'android\.gradle'
)

foreach ($path in $androidPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host '   [+] Cleaned: ' $path -ForegroundColor Green
    }
    else {
        Write-Host 'No' $path 'to clean' -ForegroundColor Cyan
    }
}

Write-Host '✅ Cleaning done!' -ForegroundColor Green
Write-Host '🚀 Go to android folder now and launch assemble:' -ForegroundColor Cyan
Write-Host 'cd android; .\gradlew assembleRelease; cd ..' -ForegroundColor White
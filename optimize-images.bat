@echo off
chcp 65001 >nul
echo 🚀 币安长征 DApp - 图片优化脚本
echo ========================================
echo.

REM 检查是否安装了 cwebp
where cwebp >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ 未找到 cwebp，尝试使用 npx...
    where npx >nul 2>nul
    if %errorlevel% neq 0 (
        echo ❌ 错误: 需要安装 libwebp 或 Node.js
        echo 请访问: https://developers.google.com/speed/webp/download
        pause
        exit /b 1
    )
    set USE_NPX=1
) else (
    set USE_NPX=0
)

REM 创建 assets 目录
if not exist assets mkdir assets

REM 优化桌面背景图
echo 📷 优化桌面背景图 (1200px宽)...
if %USE_NPX%==1 (
    npx @squoosh/cli --webp "{quality:80}" --resize "{width:1200}" IMG_20260501_130436.png -d assets
    rename assets\IMG_20260501_130436.webp bg-optimized.webp
) else (
    cwebp -q 80 -resize 1200 0 IMG_20260501_130436.png -o assets/bg-optimized.webp
)

REM 优化移动端背景图
echo 📷 优化移动端背景图 (640px宽)...
if %USE_NPX%==1 (
    npx @squoosh/cli --webp "{quality:75}" --resize "{width:640}" IMG_20260501_130436.png -d assets
    rename assets\IMG_20260501_130436.webp bg-mobile.webp
) else (
    cwebp -q 75 -resize 640 0 IMG_20260501_130436.png -o assets/bg-mobile.webp
)

REM 生成 JPEG 回退
echo 📷 生成 JPEG 回退图...
if %USE_NPX%==1 (
    npx @squoosh/cli --mozjpeg "{quality:75}" --resize "{width:1200}" IMG_20260501_130436.png -d assets
    rename assets\IMG_20260501_130436.jpg bg-optimized.jpg
) else (
    cwebp -q 75 -resize 1200 0 IMG_20260501_130436.png -o assets/bg-optimized.jpg
)

echo.
echo ✅ 图片优化完成！
echo.
echo 生成文件:
dir assets\bg-* /b
echo.
echo 📊 文件大小对比:
for %%F in (IMG_20260501_130436.png) do set ORIG_SIZE=%%~zF
for %%F in (assets\bg-optimized.webp) do set WEBP_SIZE=%%~zF
echo   原始: %ORIG_SIZE% bytes
echo   WebP: %WEBP_SIZE% bytes
echo.
pause

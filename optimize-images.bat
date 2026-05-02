@echo off
chcp 65001 >nul
echo ==========================================
echo  币安长征 DApp - 图片优化工具
echo ==========================================
echo.

REM 检查 cwebp 是否可用
where cwebp >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 cwebp 工具
    echo 请从 https://developers.google.com/speed/webp/download 下载
    echo 或将 cwebp.exe 放入系统 PATH
    pause
    exit /b 1
)

REM 创建输出目录
if not exist "assets" mkdir assets

echo [1/3] 优化桌面端背景图...
cwebp -q 80 -resize 1200 0 "IMG_20260501_130436.png" -o "assets\bg-optimized.webp"
if %errorlevel% equ 0 (
    echo [成功] 桌面端背景图已优化
) else (
    echo [警告] 桌面端优化失败
)

echo.
echo [2/3] 优化移动端背景图...
cwebp -q 75 -resize 768 0 "IMG_20260501_130436.png" -o "assets\bg-mobile.webp"
if %errorlevel% equ 0 (
    echo [成功] 移动端背景图已优化
) else (
    echo [警告] 移动端优化失败
)

echo.
echo [3/3] 生成 JPEG 回退...
cwebp -q 85 -resize 1200 0 "IMG_20260501_130436.png" -o "assets\bg-optimized.jpg"
if %errorlevel% equ 0 (
    echo [成功] JPEG 回退已生成
) else (
    echo [警告] JPEG 回退生成失败
)

echo.
echo ==========================================
echo  优化完成！
echo ==========================================
echo.

REM 显示文件大小对比
echo 文件大小对比:
echo ------------------------------------------
for %%F in ("IMG_20260501_130436.png") do set ORIGINAL_SIZE=%%~zF
for %%F in ("assets\bg-optimized.webp") do set WEBP_SIZE=%%~zF
for %%F in ("assets\bg-mobile.webp") do set MOBILE_SIZE=%%~zF

echo 原始 PNG:  %ORIGINAL_SIZE% bytes
echo WebP 桌面: %WEBP_SIZE% bytes
echo WebP 移动: %MOBILE_SIZE% bytes
echo.

REM 计算压缩率
set /a SAVED=%ORIGINAL_SIZE% - %WEBP_SIZE%
set /a RATIO=(%SAVED% * 100) / %ORIGINAL_SIZE%
echo 节省空间: %SAVED% bytes (%RATIO%%%)
echo.

pause

@echo off
REM XSS Lab Docker Management Script for Windows

setlocal enabledelayedexpansion

if "%1"=="" goto help
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="build" goto build
if "%1"=="logs" goto logs
if "%1"=="ps" goto ps
if "%1"=="clean" goto clean
if "%1"=="rebuild" goto rebuild
if "%1"=="help" goto help
goto help

:up
echo [*] Starting all containers...
docker-compose up -d
echo [+] All containers started!
echo.
echo Access student instances at:
echo   - Student 1: http://localhost/student1/
echo   - Student 2: http://localhost/student2/
echo   - Student 3: http://localhost/student3/
echo   - Student 4: http://localhost/student4/
echo   - Student 5: http://localhost/student5/
echo.
goto end

:down
echo [*] Stopping all containers...
docker-compose down
echo [+] All containers stopped!
goto end

:build
echo [*] Building Docker images...
docker-compose build
echo [+] Build complete!
goto end

:logs
if "%2"=="" (
    echo [*] Showing logs from all containers...
    docker-compose logs -f
) else (
    echo [*] Showing logs from backend-!2!...
    docker-compose logs -f backend-!2!
)
goto end

:ps
echo [*] Container status:
docker-compose ps
goto end

:clean
echo [!] WARNING: This will remove all containers and volumes!
setlocal
set /p confirm="Are you sure? (yes/no): "
if /i "!confirm!"=="yes" (
    echo [*] Removing containers and volumes...
    docker-compose down -v
    echo [+] Cleaned!
)
goto end

:rebuild
echo [*] Rebuilding and starting containers...
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
echo [+] Rebuild complete!
echo.
echo Access student instances at:
echo   - Student 1: http://localhost/student1/
echo   - Student 2: http://localhost/student2/
echo   - Student 3: http://localhost/student3/
echo   - Student 4: http://localhost/student4/
echo   - Student 5: http://localhost/student5/
goto end

:help
echo.
echo XSS Lab Docker Management
echo Usage: docker-manage.bat [command]
echo.
echo Commands:
echo   up              Start all containers
echo   down            Stop all containers
echo   build           Build Docker images
echo   logs [student]  View logs (optional: specific student)
echo   ps              Show container status
echo   clean           Remove all containers and volumes
echo   rebuild         Full rebuild from scratch
echo   help            Show this help message
echo.
echo Examples:
echo   docker-manage.bat up
echo   docker-manage.bat logs backend-student1
echo   docker-manage.bat rebuild
echo.

:end
endlocal

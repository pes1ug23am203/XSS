# XSS Lab Docker Management Script for Windows PowerShell
# Usage: ./docker-manage.ps1 [command]

param(
    [string]$Command = "",
    [string]$Arg = ""
)

function Show-Help {
    Write-Host "`n=== XSS Lab Docker Management ===" -ForegroundColor Cyan
    Write-Host "Usage: ./docker-manage.ps1 [command]`n" -ForegroundColor Yellow
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  up              Start all containers"
    Write-Host "  down            Stop all containers"
    Write-Host "  build           Build Docker images"
    Write-Host "  logs [student]  View logs (optional: specific student ID)"
    Write-Host "  ps              Show container status"
    Write-Host "  clean           Remove all containers and volumes"
    Write-Host "  rebuild         Full rebuild from scratch"
    Write-Host "  shell [student] Open shell in student container"
    Write-Host "  help            Show this help message`n"
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  ./docker-manage.ps1 up"
    Write-Host "  ./docker-manage.ps1 logs backend-student1"
    Write-Host "  ./docker-manage.ps1 shell student1"
    Write-Host "  ./docker-manage.ps1 rebuild`n"
}

function Start-Lab {
    Write-Host "[*] Starting all containers..." -ForegroundColor Yellow
    docker-compose up -d
    Write-Host "[+] All containers started!" -ForegroundColor Green
    Write-Host "`nAccess student instances at:" -ForegroundColor Cyan
    Write-Host "  - Student 1: http://localhost/student1/" -ForegroundColor Green
    Write-Host "  - Student 2: http://localhost/student2/" -ForegroundColor Green
    Write-Host "  - Student 3: http://localhost/student3/" -ForegroundColor Green
    Write-Host "  - Student 4: http://localhost/student4/" -ForegroundColor Green
    Write-Host "  - Student 5: http://localhost/student5/`n" -ForegroundColor Green
}

function Stop-Lab {
    Write-Host "[*] Stopping all containers..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "[+] All containers stopped!`n" -ForegroundColor Green
}

function Build-Lab {
    Write-Host "[*] Building Docker images..." -ForegroundColor Yellow
    docker-compose build
    Write-Host "[+] Build complete!`n" -ForegroundColor Green
}

function Show-Logs {
    if ($Arg -eq "") {
        Write-Host "[*] Showing logs from all containers...`n" -ForegroundColor Yellow
        docker-compose logs -f
    } else {
        $container = "backend-$Arg"
        Write-Host "[*] Showing logs from $container...`n" -ForegroundColor Yellow
        docker-compose logs -f $container
    }
}

function Show-Status {
    Write-Host "[*] Container status:`n" -ForegroundColor Yellow
    docker-compose ps
    Write-Host ""
}

function Clean-Lab {
    Write-Host "[!] WARNING: This will remove all containers and volumes!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -eq "yes") {
        Write-Host "[*] Removing containers and volumes..." -ForegroundColor Yellow
        docker-compose down -v
        Write-Host "[+] Cleaned!`n" -ForegroundColor Green
    } else {
        Write-Host "[*] Cancelled.`n" -ForegroundColor Yellow
    }
}

function Rebuild-Lab {
    Write-Host "[*] Rebuilding and starting containers..." -ForegroundColor Yellow
    docker-compose down -v
    docker-compose build --no-cache
    docker-compose up -d
    Write-Host "[+] Rebuild complete!`n" -ForegroundColor Green
    Write-Host "Access student instances at:" -ForegroundColor Cyan
    Write-Host "  - Student 1: http://localhost/student1/" -ForegroundColor Green
    Write-Host "  - Student 2: http://localhost/student2/" -ForegroundColor Green
    Write-Host "  - Student 3: http://localhost/student3/" -ForegroundColor Green
    Write-Host "  - Student 4: http://localhost/student4/" -ForegroundColor Green
    Write-Host "  - Student 5: http://localhost/student5/`n" -ForegroundColor Green
}

function Open-Shell {
    if ($Arg -eq "") {
        Write-Host "[!] Error: Please specify a student ID (1-5)`n" -ForegroundColor Red
        return
    }
    $container = "xss-lab-backend-student$Arg"
    Write-Host "[*] Opening shell in $container...`n" -ForegroundColor Yellow
    docker exec -it $container sh
}

# Main switch
switch ($Command.ToLower()) {
    "up"      { Start-Lab }
    "down"    { Stop-Lab }
    "build"   { Build-Lab }
    "logs"    { Show-Logs }
    "ps"      { Show-Status }
    "clean"   { Clean-Lab }
    "rebuild" { Rebuild-Lab }
    "shell"   { Open-Shell }
    "help"    { Show-Help }
    ""        { Show-Help }
    default   { 
        Write-Host "[!] Unknown command: $Command`n" -ForegroundColor Red
        Show-Help
    }
}

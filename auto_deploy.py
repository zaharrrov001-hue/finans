#!/usr/bin/env python3
"""
Автоматический деплой finance-app на Beget через SSH
Использование: python3 auto_deploy.py
"""

import subprocess
import sys
import time

SERVER = "45.80.69.195"
USER = "root"
PASSWORD = "2&UPny4fHa#P"
APP_DIR = "/root/finance-app"

def run_ssh_command(command):
    """Выполняет команду на удаленном сервере через SSH"""
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        f"{USER}@{SERVER}",
        command
    ]
    
    # Используем expect для автоматической передачи пароля
    expect_script = f"""
spawn {' '.join(ssh_cmd)}
expect "password:"
send "{PASSWORD}\\r"
expect eof
"""
    
    try:
        result = subprocess.run(
            ["expect", "-c", expect_script],
            capture_output=True,
            text=True,
            timeout=300
        )
        return result.returncode == 0, result.stdout, result.stderr
    except FileNotFoundError:
        print("❌ Требуется 'expect'. Установите: brew install expect")
        return False, "", "expect not found"
    except subprocess.TimeoutExpired:
        return False, "", "Timeout"

def main():
    print("🚀 Начинаю автоматический деплой на Beget...")
    
    commands = [
        ("Проверка подключения", "echo 'Подключение успешно!'"),
        ("Создание директории", f"mkdir -p {APP_DIR}"),
        ("Клонирование репозитория", f"cd /root && rm -rf finance-app && git clone https://github.com/zaharrrov001-hue/finans.git finance-app"),
        ("Проверка Node.js", "command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)"),
        ("Установка зависимостей", f"cd {APP_DIR} && npm install"),
        ("Сборка приложения", f"cd {APP_DIR} && npm run build"),
        ("Установка PM2", "command -v pm2 >/dev/null 2>&1 || npm install -g pm2"),
        ("Создание директории логов", f"mkdir -p {APP_DIR}/logs"),
        ("Остановка старого процесса", f"cd {APP_DIR} && pm2 delete finance-app 2>/dev/null || true"),
        ("Запуск приложения", f"cd {APP_DIR} && pm2 start ecosystem.config.js"),
        ("Сохранение PM2", "pm2 save"),
        ("Настройка автозапуска", "pm2 startup systemd -u root --hp /root || true"),
    ]
    
    for step_name, command in commands:
        print(f"⏳ {step_name}...")
        success, stdout, stderr = run_ssh_command(command)
        if not success:
            print(f"❌ Ошибка при выполнении: {step_name}")
            print(f"   Команда: {command}")
            if stderr:
                print(f"   Ошибка: {stderr}")
            sys.exit(1)
        print(f"✅ {step_name} - завершено")
        time.sleep(1)
    
    print("\n📊 Статус приложения:")
    run_ssh_command("pm2 status")
    
    print(f"\n✅ Деплой завершён!")
    print(f"🌐 Приложение доступно на: http://{SERVER}:3000")
    print("📋 Настройте Nginx для проксирования на localhost:3000")

if __name__ == "__main__":
    main()


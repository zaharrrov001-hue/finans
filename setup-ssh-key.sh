#!/usr/bin/expect -f

# Скрипт для добавления SSH ключа на сервер (выполнить ОДИН РАЗ)
# После этого пароль больше не понадобится

set timeout 30
set server "45.80.69.195"
set user "root"
set password "2&UPny4fHa#P"
set ssh_key "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBO0ESDAG9lAYSnIyYq5AoSTMR7A5nB7XWtHM248ZEvl beget-finance-app"

puts "🔑 Добавляю SSH ключ на сервер..."

spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$server "mkdir -p ~/.ssh && echo '$ssh_key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh && echo 'SSH ключ добавлен!'"

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    eof
}

puts "\n✅ SSH ключ добавлен! Теперь можно подключаться без пароля."


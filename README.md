# Temcrypta

Temcrypta is an open-source secure messaging platform designed with privacy and security at its core. It provides end-to-end encrypted communication that keeps your conversations private and secure.

## ✨ Features

- **End-to-End Encryption**: All messages are encrypted on your device and can only be decrypted by intended recipients
- **RSA-2048 & AES-256**: Industry-standard encryption algorithms for secure communications
- **Group Messaging**: Create secure group conversations with multiple participants while maintaining full encryption
- **Key Management**: Export and import encryption keys for account recovery and device switching
- **Web-Based**: No app installation required - works in any modern web browser
- **Open Source**: Fully transparent code that anyone can inspect, audit, and contribute to

## 🔒 Security

Temcrypta uses modern cryptographic technologies to ensure your messages remain private:

- RSA-2048 encryption for key exchange
- AES-256 for message encryption
- Client-side encryption and decryption
- No server access to decryption keys
- Private keys never leave your device unless you explicitly export them

## 🚀 Installation

### Prerequisites

- PHP 7.4 or higher (not sure, using PHP 8 personally)
- SQLite3
- Web server (Apache/Nginx)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/temal32/temcrypta.git
   ```
2. Set up the database:
   ```bash
   php setup/setup.php
   ```
3. Configure your web server to point to the project directory
4. Set proper permissions:
   ```bash
   chmod 770 db
   chmod 660 db/messenger.db
   sudo chown www-data:www-data db/messenger.db # for apache2
   ```
5. Run the app:
   ```bash
   php -S localhost:8000
   ```
   Note: As we used PHP code without artisan, no need to run php artisan serve as using in Laravel.

6. Access the application through your web browser

## 🛡️ Technical Implementation
Temcrypta implements industry-standard encryption:
- Client-side RSA key pair generation (2048-bit)
- AES-256-GCM for symmetric message encryption
- Secure key exchange using recipient's public key
- Zero server-side access to decryption keys or plaintext messages

### Encryption Flow
1. Each message is encrypted with a random AES key
2. The AES key is encrypted with the recipient's public RSA key
3. Only the encrypted message and encrypted AES key are transmitted
4. Recipients decrypt the AES key using their private RSA key
5. The decrypted AES key is used to decrypt the message

## ⚠️ Disclaimer
While Temcrypta uses strong encryption standards, no system can guarantee absolute security. Users should follow best security practices:

- Keep your private keys safe
- Use strong, unique passwords
- Be cautious about who you communicate with
- Regularly update your system and browser

<p align="center">
  Made with ❤️ for privacy and security
</p>

# TGCloud

<div align="center">
  
![TGCloud Logo](https://img.shields.io/badge/TGCloud-Unlimited%20Storage-blue?style=for-the-badge&logo=telegram)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://github.com/kumneger0/TGCloud/blob/main/LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)](https://www.postgresql.org/)
[![Auth: Better Auth](https://img.shields.io/badge/Auth-Better%20Auth-purple)](https://betterauth.io/)
[![100% Free](https://img.shields.io/badge/100%25-Free-brightgreen)](https://github.com/kumneger0/TGCloud)

**TGCloud is a cloud storage solution that provides unlimited storage by leveraging Telegram's API.**

</div>

## 🚀 Overview

TGCloud offers a simple, secure, and free way to store and manage files. Built with modern web technologies, it uses Telegram's infrastructure to provide unlimited cloud storage without restrictions.

### 💡 Why TGCloud?

- **Completely Free**: Unlike traditional cloud storage services with tiered payment plans, TGCloud is 100% free with no hidden costs or premium tiers.
- **No Storage Limits**: Leverage Telegram's unlimited storage capabilities without restrictions on file size or total storage used.
- **Privacy-Focused**: Your files are stored in private Telegram channels accessible only to you.
- **Simple & Fast**: Modern interface designed for easy file management with quick uploads and downloads.
- **Open Source**: Fully transparent codebase you can inspect, modify, and contribute to.

## ✨ Features

- **Unlimited Storage**: Store as many files as you need—TGCloud utilizes Telegram's channel storage without restrictions.
- **Secure and Private**: Each user has a unique, private Telegram channel, ensuring their files are only accessible to them.
- **File Organization**: Create folders and organize your files with a familiar interface.
- **File Sharing**: Generate temporary links to share files with others.
- **File Preview**: View images, videos, and documents directly in the browser.

## 🛠 How It Works

1. **Create an Account**: Sign up on TGCloud and connect your Telegram account when prompted.
2. **Private Storage Channel**: Once connected, TGCloud automatically creates a private Telegram channel for you.
3. **Store Files Securely**: All uploaded files are sent to this private channel, where they remain accessible only to you.
4. **Access Anywhere**: Log in to your TGCloud account from any device to access your files.

## 🔧 Installation

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- Telegram Bot API token

### Setup

1. Clone the repository:

```bash
git clone https://github.com/kumneger0/TGCloud.git
cd TGCloud
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration details.

4. Set up the database:

```bash
npm run db:migrate
# or
yarn db:migrate
# or
pnpm db:migrate
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🖥 Technologies Used

- Next.js
- Tailwind CSS
- Shadcn UI
- Drizzle ORM
- PostgreSQL
- Better Auth
- Telegram API
- Dexie (for client-side caching)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. We expect all participants in our community to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand what behaviors will and will not be tolerated.

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

For questions or support, please reach out to:

- Email: tgcloud@kumneger.dev
- Project Lead: Kumneger Wondimu

---

<div align="center">
  <p>⭐ Star this repository if you find it useful! ⭐</p>
  <p>Made with ❤️ by <a href="https://github.com/kumneger0">Kumneger Wondimu</a></p>
</div>

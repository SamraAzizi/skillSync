# SkillSync

SkillSync is a modern application designed to connect users based on their skills, interests, and learning goals. The platform enables collaboration, skill discovery, and meaningful connections using a scalable backend powered by Supabase and a frontend built with TypeScript.

---

## 🚀 Features

- User authentication (Sign up / Login)
- Skill-based user profiles
- Discover and connect with people sharing similar skills
- Secure backend using Supabase
- Modern TypeScript-based codebase
- Responsive and scalable architecture

---

## 🛠 Tech Stack

- **Frontend:** TypeScript  
- **Backend:** Supabase (Authentication & Database)  
- **Styling:** Tailwind CSS  
- **Build Tools:** Vite  
- **Mobile Support:** Capacitor (optional)

---

## 📦 Getting Started

Follow the steps below to run the project locally.

### Prerequisites

Make sure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- Git
- A Supabase account

---

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SamraAzizi/skillSync.git
cd skillSync
```
2. Install dependencies:
```bash
npm install
# or
yarn install

```

### Environment Setup (Supabase)
1. Create a project at https://app.supabase.com
2. Copy your Project URL and Anon Key
3. Create a `.env` file in the root directory and add:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

```

### Running the Project
```bash
npm run dev
# or
yarn dev

```
The application will run locally (URL will be shown in the terminal).

### Project Structure
```bash
skillSync/
│
├── dist/
├── node_modules/
├── src/
│ ├── assets/
│ ├── components/
│ ├── hooks/
│ ├── integrations/
│ ├── lib/
│ ├── pages/
│ ├── services/
│ ├── App.css
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ └── vite-env.d.ts
│
├── supabase/
├── .env
├── .gitignore
├── capacitor.config.ts
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```
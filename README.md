# RFP Matcher - Next.js Web Application

This is a [Next.js](https://nextjs.org) application for matching RFPs (Requests for Proposals) with user profiles, built with Firebase backend integration.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Copy the template
cp env.template .env.local

# Edit .env.local with your Firebase credentials
```

3. **Run the development server:**
```bash
npm run dev
```

4. **Open your browser:**

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📦 Tech Stack

- **Frontend:** Next.js 15 + React 18
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Document Processing:** PDF parsing, OCR (Tesseract.js)
- **AI Integration:** OpenAI API for document extraction
- **Testing:** Playwright
- **Deployment:** Vercel

## 🏗️ Project Structure

```
webapp/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   ├── documents/    # Document management
│   │   ├── login/        # Authentication
│   │   └── ...
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities & Firebase config
│   └── types/           # TypeScript definitions
├── public/              # Static assets
├── tests/              # Playwright tests
└── [config files]
```

## ⚙️ Configuration Files

- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `vercel.json` - Vercel deployment configuration
- `env.template` - Environment variables template
- `tsconfig.json` - TypeScript configuration

## 🔐 Environment Variables

Required environment variables (see `env.template` for complete list):

### Firebase Public Config
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Server-side)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Optional
- `OPENAI_API_KEY` (for AI document extraction)

## 🚢 Deployment

### Deploy to Vercel

**First-time deployment:**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Link your project:**
```bash
vercel link
```

3. **Add environment variables:**
```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# ... add all required variables
```

4. **Deploy:**
```bash
vercel --prod
```

### Detailed Deployment Guides

- 🆘 **Having deployment issues?** See `DEPLOYMENT_NOT_FOUND_FIX.md`
- 📖 **Step-by-step guide:** See `VERCEL_DEPLOYMENT_GUIDE.md`
- 🏛️ **Architecture overview:** See `DEPLOYMENT_ARCHITECTURE.md`

### Automatic Deployments

Connect your Git repository to Vercel for automatic deployments:
- Push to `main` → Production deployment
- Push to other branches → Preview deployments

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in UI mode
npm run test:ui

# Run tests in headed mode
npm run test:headed

# View test report
npm run test:report
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Playwright tests

## 🔧 Development

### Adding a New Page

1. Create a new folder in `src/app/`
2. Add a `page.tsx` file
3. Export a default React component

Example:
```typescript
// src/app/my-page/page.tsx
export default function MyPage() {
  return <div>My New Page</div>;
}
```

### Adding an API Route

1. Create a folder in `src/app/api/`
2. Add a `route.ts` file
3. Export HTTP method handlers

Example:
```typescript
// src/app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: 'Hello World' });
}
```

## 🐛 Troubleshooting

### Common Issues

**Build fails with canvas errors:**
- This is handled in `next.config.ts` - canvas is externalized for server-side rendering

**Firebase connection fails:**
- Check environment variables are set correctly
- Ensure Firebase private key includes proper newlines (`\n`)

**Deployment not found:**
- See `DEPLOYMENT_NOT_FOUND_FIX.md` for detailed troubleshooting

**TypeScript errors:**
- Run `npm run build` locally to catch issues before deploying

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Web Documentation](https://firebase.google.com/docs/web/setup)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🔗 Related Documentation

In this repository:
- `AI_EXTRACTION_IMPLEMENTATION.md` - AI document extraction setup
- `COMPLETE_DOCUMENT_EXTRACTION_SYSTEM.md` - Document processing system
- `DOCUMENT_MANAGEMENT_FEATURE.md` - Document management features
- `GET_SERVICE_ACCOUNT.md` - Firebase service account setup
- `FIREBASE_STORAGE_SECURITY_SETUP.md` - Storage security rules

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Create a preview deployment: `vercel`
5. Submit for review

## 📄 License

[Your License Here]

## 🆘 Support

For deployment issues, see the troubleshooting guides in the `webapp/` directory.

For general questions about Next.js:
- [Next.js GitHub](https://github.com/vercel/next.js)
- [Next.js Discord](https://discord.gg/nextjs)

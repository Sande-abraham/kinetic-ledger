# Kinetic Ledger - Deployment Guide

This project is a full-stack TypeScript application using React (Vite) and Express.

## 🚀 Deployment Options

### 1. Local Development (Node.js)
To run the app on your local machine:
```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build and start production server
npm run build
npm start
```

### 2. Vercel
This project includes a `vercel.json` configured for full-stack deployment.
- Push your code to a GitHub repository.
- Import the project into Vercel.
- Add your environment variables (from `.env.example`) in the Vercel dashboard.
- Vercel will automatically detect the configuration and deploy both the frontend and the API.

### 3. Netlify
This project includes a `netlify.toml` for the frontend.
- **Note**: Netlify is primarily for static sites. The Express backend will not run automatically on Netlify's standard hosting.
- To use the backend on Netlify, you would need to move the logic in `server.ts` into `netlify/functions`.
- For a full-stack experience, **Vercel** or **Render/Railway** is recommended over Netlify.

### 4. GitHub Pages
- GitHub Pages only supports **static** sites.
- You can deploy the frontend by running `npm run build` and pushing the `dist` folder to a `gh-pages` branch.
- **Warning**: The API routes (`/api/*`) will not work on GitHub Pages.

### 5. Render / Railway / Heroku
These platforms are excellent for full-stack Node.js apps.
- They will use the `start` script: `NODE_ENV=production node server.ts`.
- Ensure you set the `PORT` environment variable to `3000` (or the platform's default).

## 🔑 Environment Variables
Make sure to configure the following variables in your production environment:
- `FLUTTERWAVE_SECRET_KEY`: For real Mobile Money payments.
- `GEMINI_API_KEY`: For AI features.
- `FIREBASE_CONFIG`: Ensure your `firebase-applet-config.json` is correct for your production Firebase project.

## 📱 Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Google and Anonymous).
3. Create a **Firestore** database.
4. Update `firestore.rules` using the content of the `firestore.rules` file in this project.

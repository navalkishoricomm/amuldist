# Deployment Guide

Since we need a global server for the APK to work anywhere, we recommend deploying to **Render.com** (easiest, free tier available) or **Railway.app**.

## Option 1: Deploy to Render.com (Recommended)

1.  **Push to GitHub**:
    -   Create a new repository on GitHub.
    -   Push this `server` folder to the repository.

2.  **Create Service on Render**:
    -   Go to [dashboard.render.com](https://dashboard.render.com/).
    -   Click **New +** -> **Web Service**.
    -   Connect your GitHub repository.

3.  **Configure**:
    -   **Name**: `amul-dist-app` (or similar)
    -   **Runtime**: `Node`
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
    -   **Instance Type**: Free

4.  **Environment Variables** (Important!):
    -   Scroll down to "Environment Variables" and add:
        -   `MONGODB_URI`: `mongodb+srv://...` (Your Atlas Connection String)
        -   `JWT_SECRET`: `some_secure_random_string`
        -   `NODE_ENV`: `production`

5.  **Deploy**:
    -   Click **Create Web Service**.
    -   Wait for deployment to finish. You will get a URL like `https://amul-dist-app.onrender.com`.

## Option 2: Heroku

1.  Install Heroku CLI.
2.  Login: `heroku login`
3.  Create app: `heroku create amul-dist-app`
4.  Set Config:
    -   `heroku config:set MONGODB_URI="mongodb+srv://..."`
    -   `heroku config:set JWT_SECRET="..."`
5.  Deploy: `git push heroku main`

## After Deployment

1.  Copy the URL (e.g., `https://amul-dist-app.onrender.com`).
2.  Open the APK on your phone.
3.  On the Login screen, if it fails to connect, enter this URL in the **Server URL** field and click Save.

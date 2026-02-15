# Cloudflare Pages Deployment Guide

## Overview
This guide explains how to deploy your static portfolio to Cloudflare Pages and connect it to your custom domain `deepakkharol.com`.

## Prerequisites
1.  **Cloudflare Account**: Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2.  **GitHub Repository**: Ensure your code is pushed to your GitHub repository.
3.  **Domain**: Verify `deepakkharol.com` is active in your Cloudflare account.

## Step 1: Connect to Cloudflare Pages

1.  Log in to the Cloudflare Dashboard.
2.  Navigate to **Workers & Pages** > **Pages**.
3.  Click **Connect to Git**.
4.  Select the **GitHub** tab and authorize Cloudflare to access your repository if prompted.
5.  Select your portfolio repository from the list and click **Begin setup**.

## Step 2: Configure Build Settings

Since your site is now static (HTML/CSS/JS only) and in the **root** folder:

-   **Project Name**: `portfolio` (or your preferred name)
-   **Production branch**: `main`
-   **Framework preset**: `None`
-   **Build command**: `exit 0` (This prevents it from looking for a build script)
-   **Build output directory**: `.` (A single dot, meaning the root folder)
-   **Environment variables**: None needed for static site.

Click **Save and Deploy**.

## Step 3: Add Custom Domain

Once the deployment is successful (usually takes less than a minute):

1.  Go to your Pages project settings (`Settings` tab).
2.  Click **Custom Domains**.
3.  Click **Set up a custom domain**.
4.  Enter `deepakkharol.com` and click **Continue**.
5.  Cloudflare will automatically configure the DNS records (CNAME) for your domain.
6.  Click **Activate domain**.

Repeat the process for `www.deepakkharol.com` if desired.

## Continuous Deployment

Cloudflare Pages watches your GitHub repository. Every time you push changes to the `main` branch, Cloudflare will automatically:
1.  Detect the change.
2.  Pull the latest code.
3.  Deploy the new version to your domain.

## Verification

Visit [https://deepakkharol.com](https://deepakkharol.com) to see your live site.

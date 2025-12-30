# Firebase Cloud Functions Deployment Guide

## Overview
This guide explains how to set up automatic deployment of Firebase Cloud Functions using GitHub Actions. Once configured, Cloud Functions will be automatically deployed when code is pushed to the main branch.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Automatic Deployment](#automatic-deployment)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up automated deployments, ensure you have:
- A Firebase project (already set up)
- Admin access to the GitHub repository
- A Stripe account with API keys
- Firebase CLI installed locally (for initial setup only)

## Initial Setup

### Step 1: Generate Firebase CI Token

The Firebase CI token allows GitHub Actions to deploy on your behalf without requiring interactive login.

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Log in to Firebase**:
   ```bash
   firebase login
   ```
   
   This will open a browser window for you to authenticate with your Google account.

3. **Generate CI Token**:
   ```bash
   firebase login:ci
   ```
   
   This will:
   - Open a browser for authentication
   - Display a CI token in the terminal
   - **Important**: Copy this token - you'll need it in the next step

   Example output:
   ```
   ✔ Success! Use this token to login on a CI server:

   1//0example-firebase-ci-token-here-replace-with-actual-token

   Example: firebase deploy --token "$FIREBASE_TOKEN"
   ```

### Step 2: Get Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Test Mode** (toggle in top right) for testing
3. Navigate to **Developers** → **API keys**
4. Reveal and copy the **Secret key** (starts with `sk_test_...`)

**Important**: Keep your Stripe secret key secure. Never commit it to the repository.

## GitHub Secrets Configuration

GitHub Secrets allow you to securely store sensitive information that GitHub Actions can access during workflow runs.

### Adding Secrets via GitHub Web Interface

1. **Navigate to Repository Settings**:
   - Go to your repository on GitHub
   - Click **Settings** tab
   - In the left sidebar, click **Secrets and variables** → **Actions**

2. **Add FIREBASE_TOKEN Secret**:
   - Click **New repository secret**
   - Name: `FIREBASE_TOKEN`
   - Value: Paste the CI token from Step 1.3
   - Click **Add secret**

3. **Add STRIPE_SECRET_KEY Secret**:
   - Click **New repository secret**
   - Name: `STRIPE_SECRET_KEY`
   - Value: Paste your Stripe secret key from Step 2.4
   - Click **Add secret**

### Adding Secrets via GitHub Mobile App

Since you're working from a phone, here's how to add secrets using GitHub Mobile:

1. **Open GitHub Mobile App**
2. **Navigate to Repository**:
   - Find and open your repository
   
3. **Access Settings** (if available in mobile):
   - Look for repository settings/options
   
4. **Alternative - Use GitHub Web on Mobile Browser**:
   - Open browser and go to: `https://github.com/[username]/[repository]/settings/secrets/actions`
   - Tap **New repository secret**
   - Add `FIREBASE_TOKEN` and `STRIPE_SECRET_KEY` as described above

### Verifying Secrets

After adding secrets, you should see them listed under **Actions secrets**:
- ✅ `FIREBASE_TOKEN`
- ✅ `STRIPE_SECRET_KEY`

**Note**: Secret values are hidden and cannot be viewed after creation. If you need to update them, you must delete and recreate them.

## Automatic Deployment

### How It Works

The deployment workflow automatically runs when:

1. **Code is pushed to the main branch** AND
2. **Files in the `functions/` directory have changed**

This means:
- ✅ Merging a PR to main triggers deployment (if functions changed)
- ✅ Direct commits to main trigger deployment (if functions changed)
- ❌ Changes to other files don't trigger deployment
- ❌ Pushes to other branches don't trigger deployment

### What Happens During Deployment

When the workflow runs, it:

1. ✅ Checks out the latest code
2. ✅ Sets up Node.js 20 environment
3. ✅ Installs Firebase CLI
4. ✅ Installs function dependencies (`npm ci`)
5. ✅ Builds TypeScript functions (`npm run build`)
6. ✅ Configures Stripe secret key in Firebase
7. ✅ Deploys functions to Firebase
8. ✅ Shows deployment summary

### Deployed Functions

The following Cloud Functions are deployed:
- `cartReprice` - Calculate shipping costs and taxes
- `createPaymentIntent` - Create Stripe payment intents
- `handleStripeWebhook` - Process Stripe webhook events

### Monitoring Deployments

To check deployment status:

1. **GitHub Actions Tab**:
   - Go to repository → **Actions** tab
   - Click on the latest workflow run
   - View logs for each step

2. **Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Navigate to **Functions**
   - Verify functions are deployed and active

## Manual Deployment

You can manually trigger deployment from GitHub without making code changes.

### Using GitHub Web Interface

1. Go to repository on GitHub
2. Click **Actions** tab
3. In the left sidebar, click **Deploy Firebase Cloud Functions**
4. Click **Run workflow** button (on the right)
5. Select branch: `main`
6. Click **Run workflow** button

### Using GitHub Mobile

1. Open GitHub Mobile app
2. Navigate to repository
3. Go to **Actions** section
4. Find **Deploy Firebase Cloud Functions** workflow
5. Look for **Run workflow** option
6. Select `main` branch and trigger

### When to Use Manual Deployment

Manual deployment is useful when:
- You need to redeploy without code changes
- You want to update Firebase function configuration
- You're troubleshooting deployment issues
- You want to ensure latest code is deployed

## Deployment Workflow Details

### File Location
`.github/workflows/deploy-functions.yml`

### Workflow Configuration

```yaml
# Triggers
on:
  push:
    branches: [main]
    paths: ['functions/**']
  workflow_dispatch:

# Steps
- Checkout code
- Setup Node.js 20
- Install Firebase CLI
- Install dependencies (with caching)
- Build functions
- Configure Stripe
- Deploy to Firebase
```

### Caching

The workflow uses npm caching to speed up installations:
- First run: ~2-3 minutes
- Subsequent runs: ~1-2 minutes (with cache)

## Troubleshooting

### Deployment Fails: "Invalid Firebase token"

**Cause**: The `FIREBASE_TOKEN` secret is missing or invalid.

**Solution**:
1. Generate a new token: `firebase login:ci`
2. Update the `FIREBASE_TOKEN` secret in GitHub
3. Re-run the workflow

### Deployment Fails: "Stripe configuration error"

**Cause**: The `STRIPE_SECRET_KEY` secret is missing or invalid.

**Solution**:
1. Get your Stripe secret key from Stripe Dashboard
2. Update the `STRIPE_SECRET_KEY` secret in GitHub
3. Re-run the workflow

### Workflow Doesn't Trigger on Push

**Cause**: Changes weren't made to the `functions/` directory.

**Solution**:
- Verify that files in `functions/` were modified
- Or trigger workflow manually from GitHub Actions tab

### Build Fails: TypeScript Errors

**Cause**: TypeScript compilation errors in function code.

**Solution**:
1. Check the workflow logs for specific errors
2. Fix TypeScript errors in the code
3. Test locally: `cd functions && npm run build`
4. Commit and push fixes

### Functions Deploy But Don't Work

**Possible causes**:
1. **Stripe key not configured**: Check Firebase Functions config
2. **Environment mismatch**: Using test keys in production
3. **CORS issues**: Check function CORS configuration

**Debug steps**:
1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```
2. Verify function configuration:
   ```bash
   firebase functions:config:get
   ```
3. Test functions in Firebase Console

### Viewing Deployment Logs

1. **GitHub Actions**:
   - Repository → Actions → Click workflow run
   - Expand each step to view detailed logs

2. **Firebase Console**:
   - Firebase Console → Functions → Select function
   - Click **Logs** tab

## Security Best Practices

### Protecting Secrets

✅ **DO**:
- Use GitHub Secrets for all sensitive data
- Rotate tokens periodically (every 90 days)
- Use test keys for development
- Use production keys only in production

❌ **DON'T**:
- Commit secrets to the repository
- Share tokens in public channels
- Use production keys in test environments
- Log secret values in workflow outputs

### Access Control

- Limit who can modify GitHub Actions workflows
- Restrict access to repository secrets
- Review workflow runs regularly
- Enable branch protection on `main`

## Testing Deployment

### Test Workflow Locally (Optional)

You can test the workflow steps locally before pushing:

```bash
# 1. Install dependencies
cd functions
npm ci

# 2. Build functions
npm run build

# 3. Deploy manually (requires Firebase login)
firebase deploy --only functions
```

### Test After Deployment

After successful deployment:

1. **Check function URLs** in Firebase Console
2. **Test cart reprice**:
   - Call `cartReprice` function with test data
   - Verify shipping calculation

3. **Test payment intent**:
   - Create a test payment
   - Verify payment intent is created

4. **Check logs**:
   - Ensure no errors in function execution

## Additional Resources

- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)

## Summary

After completing this setup:

✅ **You have**:
- Automatic deployment on merge to main
- Manual deployment capability
- Secure credential management
- No need for PC/terminal access

✅ **Deployments are**:
- Automatic when functions change
- Triggered by PR merges
- Secure via GitHub Secrets
- Fast with dependency caching

✅ **You can**:
- Deploy from your phone
- Monitor deployments in GitHub
- Troubleshoot with detailed logs
- Update functions without CLI access

---

**Last Updated**: December 30, 2024  
**Status**: Production Ready  
**Contact**: Check GitHub Issues for support

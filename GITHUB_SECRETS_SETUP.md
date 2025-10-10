# GitHub Secrets Setup for Cloudflare Deployment

**Repository:** Life-Experimentalists/the-pensive-index
**Purpose:** Configure GitHub Actions for automated Cloudflare deployment

---

## Required Secrets

### 1. CLOUDFLARE_API_TOKEN

**Purpose:** Authenticate GitHub Actions to deploy to Cloudflare
**Permissions Required:**
- Account → D1 → Edit
- Account → Workers Scripts → Edit
- Account → Workers KV Storage → Edit
- Account → Pages → Edit

**How to Create:**

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Click "Create Custom Token"
4. Configure permissions:
   ```
   Account → D1 → Edit
   Account → Workers Scripts → Edit
   Account → Workers KV Storage → Edit
   Account → Pages → Edit
   Account → Account Settings → Read
   ```
5. Set account resources: Include → [Your Account]
6. Set zone resources: All zones (or specific zone if you have one)
7. Set TTL: No expiry (or set appropriate expiration)
8. Click "Continue to summary"
9. Click "Create Token"
10. **COPY THE TOKEN** (you won't see it again!)

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: CLOUDFLARE_API_TOKEN
Value: [paste your token]
```

---

### 2. CLOUDFLARE_ACCOUNT_ID

**Purpose:** Identify your Cloudflare account

**How to Find:**

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Select any domain (or Workers & Pages)
3. Look in the right sidebar for "Account ID"
4. OR: Check URL - it's the hex string after `/dash.cloudflare.com/` and before the next `/`
   ```
   Example: https://dash.cloudflare.com/1234567890abcdef/workers
                                           ^^^^^^^^^^^^^^^^
                                           Account ID
   ```

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: CLOUDFLARE_ACCOUNT_ID
Value: [paste your account ID]
```

---

### 3. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

**Purpose:** Clerk authentication (public key, safe to expose)

**How to Find:**

1. Go to Clerk Dashboard: https://dashboard.clerk.com/
2. Select your application: "The Pensieve Index"
3. Go to "API Keys" in sidebar
4. Copy "Publishable Key" (starts with `pk_test_` or `pk_live_`)

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: pk_test_... or pk_live_...
```

---

### 4. CLERK_SECRET_KEY (Optional but Recommended)

**Purpose:** Clerk authentication (secret key, keep private)

**How to Find:**

1. Go to Clerk Dashboard: https://dashboard.clerk.com/
2. Select your application
3. Go to "API Keys"
4. Copy "Secret Key" (starts with `sk_test_` or `sk_live_`)

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: CLERK_SECRET_KEY
Value: sk_test_... or sk_live_...
```

---

### 5. NEXT_PUBLIC_APP_URL

**Purpose:** Base URL for your deployed application

**Value:**
```
For Cloudflare Pages: https://the-pensive-index.pages.dev
For Custom Domain: https://your-domain.com
```

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: NEXT_PUBLIC_APP_URL
Value: https://the-pensive-index.pages.dev
```

---

### 6. GITHUB_TOKEN (Automatic - No Setup Needed)

**Purpose:** Authenticate GitHub Actions to GitHub API

**NOTE:** This is automatically provided by GitHub Actions. You don't need to create it!

---

## Optional Secrets (If Using Features)

### GITHUB_WEBHOOK_SECRET

**Purpose:** Verify webhook requests from GitHub for story submissions

**How to Create:**

```powershell
# Generate a random secret
openssl rand -hex 32
# OR
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: GITHUB_WEBHOOK_SECRET
Value: [your generated secret]
```

**Then configure in GitHub Webhook settings:**
1. Repository → Settings → Webhooks → Add webhook
2. Payload URL: `https://the-pensive-index.pages.dev/api/webhooks/github`
3. Content type: `application/json`
4. Secret: [same secret you used above]
5. Events: Select "Issues" and "Issue comments"

---

### GITHUB_ACCESS_TOKEN

**Purpose:** Create GitHub issues for story submissions

**How to Create:**

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "The Pensieve Index - Story Submissions"
4. Select scopes:
   - `public_repo` (for public repositories)
   - OR `repo` (for private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: GITHUB_ACCESS_TOKEN
Value: ghp_...
```

---

### POSTMAN_API_KEY (Optional)

**Purpose:** API testing and monitoring with Postman

**How to Create:**

1. Go to Postman: https://www.postman.com/
2. Sign in or create account
3. Click your avatar → Settings → API Keys
4. Click "Generate API Key"
5. Name: "The Pensieve Index - CI/CD"
6. Copy the key (starts with `PMAK-`)

**Add to GitHub:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
Name: POSTMAN_API_KEY
Value: PMAK-...
```

---

## Verification

After adding all secrets, verify in GitHub:

1. Go to: `https://github.com/Life-Experimentalists/the-pensive-index/settings/secrets/actions`
2. You should see:
   - ✅ CLOUDFLARE_API_TOKEN
   - ✅ CLOUDFLARE_ACCOUNT_ID
   - ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - ✅ NEXT_PUBLIC_APP_URL
   - ✅ CLERK_SECRET_KEY (optional)
   - ✅ GITHUB_WEBHOOK_SECRET (optional)
   - ✅ GITHUB_ACCESS_TOKEN (optional)
   - ✅ POSTMAN_API_KEY (optional)

---

## Testing the Workflow

Once secrets are configured:

1. Make a commit to `main` branch
2. Push to GitHub: `git push origin main`
3. Go to: `https://github.com/Life-Experimentalists/the-pensive-index/actions`
4. Watch the "Deploy to Cloudflare Pages" workflow run
5. Should see:
   - ✅ Deploy job
   - ✅ Database migration job
   - ✅ Post-deployment checks

---

## Troubleshooting

### Error: "Invalid API token"

**Solution:**
- Verify token has correct permissions (see step 1)
- Check token hasn't expired
- Regenerate token and update secret

### Error: "Account ID not found"

**Solution:**
- Double-check account ID from Cloudflare dashboard
- Ensure no extra spaces in the secret value

### Error: "Clerk authentication failed"

**Solution:**
- Verify you're using the correct environment keys (test vs live)
- Check keys are from the correct Clerk application
- Ensure no extra quotes or spaces

### Workflow doesn't trigger

**Solution:**
- Check `.github/workflows/deploy-cloudflare.yml` exists
- Verify you pushed to `main` branch
- Check Actions are enabled: Settings → Actions → General → Allow all actions

---

## Security Best Practices

1. **Never commit secrets to git**
   - Check `.gitignore` includes `.env`, `.dev.vars`
   - Use `git-secrets` or similar tools

2. **Rotate secrets regularly**
   - Update API tokens every 90 days
   - Rotate webhook secrets after any security incident

3. **Use environment-specific keys**
   - Test keys for development/preview
   - Live keys for production only

4. **Limit token permissions**
   - Only grant necessary permissions
   - Use resource-scoped tokens when possible

5. **Monitor secret usage**
   - Review Cloudflare audit logs
   - Check GitHub Actions usage logs

---

## Next Steps

After secrets are configured:

1. ✅ Verify secrets in GitHub repository settings
2. ✅ Make a test commit and push to trigger workflow
3. ✅ Monitor deployment in GitHub Actions
4. ✅ Verify app is live at: https://the-pensive-index.pages.dev
5. ✅ Check database is accessible and seeded
6. ✅ Test authentication with Clerk
7. ✅ Configure custom domain (optional)

---

**Last Updated:** January 10, 2025
**Maintained By:** The Pensieve Index Team

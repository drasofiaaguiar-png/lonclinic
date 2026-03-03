# Setting Up GitHub Repository

## Option 1: Create a New Repository on GitHub

1. **Go to GitHub:**
   - Visit [github.com](https://github.com) and sign in
   - Click the "+" icon in the top right → "New repository"

2. **Create Repository:**
   - Repository name: `longevity-clinic` (or any name you prefer)
   - Description: "Longevity Clinic website with booking system"
   - Choose: **Private** or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have code)
   - Click "Create repository"

3. **Copy the repository URL:**
   - GitHub will show you a URL like: `https://github.com/yourusername/longevity-clinic.git`
   - Copy this URL

4. **Update your remote and push:**
   ```bash
   git remote set-url origin https://github.com/yourusername/longevity-clinic.git
   git push -u origin main
   ```

## Option 2: If Repository Already Exists

If you already created a repository on GitHub:

1. **Get the repository URL:**
   - Go to your repository on GitHub
   - Click the green "Code" button
   - Copy the HTTPS URL

2. **Update remote:**
   ```bash
   git remote set-url origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

## Authentication

If you get authentication errors:

### Option A: Use GitHub CLI (Recommended)
```bash
# Install GitHub CLI if needed, then:
gh auth login
git push origin main
```

### Option B: Use Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Use token as password when pushing

### Option C: Use SSH (More secure)
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys
3. Change remote to SSH: `git remote set-url origin git@github.com:username/repo.git`

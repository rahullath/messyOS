# Git Best Practices for MessyOS

## ✅ What's Now Fixed

1. **Updated `.gitignore`** - Now excludes:
   - `.vercel/` directory (Vercel deployment files)
   - `dist/` directory (build output)
   - `.astro/` directory (generated types)
   - Environment files (`.env*`)
   - OS-specific files (Thumbs.db, .DS_Store)
   - Editor files (.vscode, .idea)
   - Temporary files (*.tmp, *.log)

2. **Added `.gitattributes`** - Handles line endings properly across platforms

3. **Removed build artifacts** - Cleaned up the 105+ unnecessary files

## 🚫 Files You Should NEVER Commit

### Build & Deployment Files
- `dist/` - Astro build output
- `.vercel/` - Vercel deployment artifacts
- `.astro/` - Generated type files
- `node_modules/` - Dependencies (already in .gitignore)

### Environment & Secrets
- `.env` - Environment variables
- `.env.local` - Local environment overrides
- `.env.production` - Production secrets
- Any file containing API keys or passwords

### OS & Editor Files
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)
- `.vscode/settings.json` (unless team-shared)
- `.idea/` (JetBrains IDEs)

### Temporary Files
- `*.log` - Log files
- `*.tmp` - Temporary files
- `*.cache` - Cache files

## ✅ Files You SHOULD Commit

### Source Code
- `src/` - All your source code
- `public/` - Static assets
- `package.json` - Dependencies and scripts
- `package-lock.json` - Exact dependency versions

### Configuration
- `astro.config.mjs` - Astro configuration
- `tailwind.config.mjs` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Git ignore rules
- `.gitattributes` - Git attributes

### Documentation
- `README.md` - Project documentation
- `*.md` files - Documentation and guides
- Database schema files (`.sql`)

## 🔄 Proper Git Workflow

### Before Committing
```bash
# Check what files are staged
git status

# Review changes before committing
git diff

# Only add source files, not build artifacts
git add src/ public/ package.json *.md *.sql
```

### Safe Commit Process
```bash
# Add specific files/directories
git add src/
git add package.json
git add README.md

# Or add all (but .gitignore will exclude unwanted files)
git add .

# Commit with descriptive message
git commit -m "feat: add AI agent chat interface"

# Push to remote
git push origin main
```

### If You Accidentally Commit Build Files
```bash
# Remove from Git tracking (but keep local files)
git rm -r --cached .vercel/
git rm -r --cached dist/

# Update .gitignore to exclude them
echo ".vercel/" >> .gitignore
echo "dist/" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "Remove build artifacts and update .gitignore"
```

## 🛠️ Useful Git Commands

### Check Repository Status
```bash
git status                    # See what's changed
git log --oneline -10        # See recent commits
git diff                     # See unstaged changes
git diff --cached            # See staged changes
```

### Undo Changes
```bash
git checkout -- filename    # Undo changes to a file
git reset HEAD filename      # Unstage a file
git reset --soft HEAD~1      # Undo last commit (keep changes)
git reset --hard HEAD~1      # Undo last commit (lose changes)
```

### Branch Management
```bash
git branch                   # List branches
git checkout -b feature-name # Create and switch to new branch
git merge feature-name       # Merge branch into current
git branch -d feature-name   # Delete merged branch
```

## 📝 Commit Message Best Practices

### Format
```
type(scope): description

feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Examples
```bash
git commit -m "feat(ai): add daily briefing component"
git commit -m "fix(tasks): resolve task creation API error"
git commit -m "docs: update setup guide with AI agent instructions"
git commit -m "chore: update dependencies and fix build warnings"
```

## 🚀 Deployment Workflow

### Local Development
```bash
npm run dev                  # Start development server
npm run build               # Test build locally
```

### Deployment to Vercel
```bash
git add .                   # Add changes
git commit -m "feat: ..."   # Commit changes
git push origin main        # Push to GitHub
# Vercel automatically deploys from GitHub
```

### Manual Vercel Deployment
```bash
npm run build              # Build the project
vercel deploy              # Deploy to preview
vercel deploy --prod       # Deploy to production
```

## 🔧 Configuration Files Explained

### `.gitignore`
- Tells Git which files to ignore
- Prevents accidental commits of build files
- Should include all generated/temporary files

### `.gitattributes`
- Handles line ending differences between Windows/Mac/Linux
- Ensures consistent file formatting across platforms
- Defines how Git should treat different file types

### `package.json`
- Lists project dependencies
- Defines build and development scripts
- Should always be committed

### Environment Files
- `.env` - Never commit (contains secrets)
- `.env.example` - Commit this (shows required variables)
- Use environment variables for API keys and secrets

## 🎯 Quick Checklist Before Each Commit

- [ ] Run `git status` to see what's being committed
- [ ] Ensure no build artifacts (`.vercel/`, `dist/`) are included
- [ ] Check that no secrets or API keys are in the files
- [ ] Test that the build works: `npm run build`
- [ ] Write a clear commit message
- [ ] Push to GitHub for automatic Vercel deployment

## 🆘 Emergency: "I Committed Something I Shouldn't Have"

### If you haven't pushed yet:
```bash
git reset --soft HEAD~1     # Undo commit, keep changes
# Fix .gitignore, then recommit
```

### If you already pushed:
```bash
git rm -r --cached .vercel/ # Remove from tracking
git commit -m "Remove build artifacts"
git push origin main        # Push the fix
```

### If you committed secrets:
1. Immediately revoke/regenerate the API keys
2. Remove them from Git history (complex - ask for help)
3. Update `.gitignore` to prevent future accidents

Remember: **When in doubt, ask before committing!** It's easier to prevent problems than fix them later.
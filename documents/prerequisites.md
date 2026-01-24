# S40G - Development Prerequisites

This guide covers everything you need to install before starting development on S40G, specifically for **WSL (Windows Subsystem for Linux)** on Windows.

---

## Quick Checklist

Run these commands in your WSL terminal to verify everything is installed:

```bash
# WSL (run in PowerShell, not WSL)
wsl --version

# Docker
docker --version
docker compose version

# Node.js
node --version    # Should be v22.x.x

# pnpm
pnpm --version    # Should be v9.x.x

# Git
git --version
```

If any command fails or shows the wrong version, follow the installation instructions below.

> **Note:** The Supabase CLI is installed as a project dependency via `pnpm install`. You don't need to install it globally. Verify it with `pnpm supabase --version` after project setup.

---

## 1. WSL (Windows Subsystem for Linux)

### What is it?
WSL lets you run a Linux environment directly on Windows. We'll use Ubuntu.

### Check if installed
Open **PowerShell** (not WSL) and run:
```powershell
wsl --version
```

You should see output like:
```
WSL version: 2.x.x.x
Kernel version: 5.15.x.x
...
```

### Install if needed
In **PowerShell as Administrator**:
```powershell
wsl --install -d Ubuntu
```

Restart your computer when prompted, then open "Ubuntu" from the Start menu to complete setup (create username/password).

### Verify
```powershell
wsl --list --verbose
```
Should show Ubuntu with VERSION 2.

---

## 2. Docker Desktop

### What is it?
Docker runs containers. Required for the **Supabase local emulator** which runs Postgres, Auth, Realtime, and Studio in containers on your machine.

### Check if installed
In your **WSL terminal**:
```bash
docker --version
```

Expected output:
```
Docker version 27.x.x, build xxxxxxx
```

Also verify Docker Compose:
```bash
docker compose version
```

Expected output:
```
Docker Compose version v2.x.x
```

### Install if needed

1. Download Docker Desktop for Windows from:
   https://www.docker.com/products/docker-desktop/

2. Run the installer. **Important:** During installation, ensure these options are checked:
   - "Use WSL 2 instead of Hyper-V"
   - "Add shortcut to desktop" (optional)

3. After installation, open Docker Desktop and go to:
   - **Settings → Resources → WSL Integration**
   - Enable integration with your Ubuntu distro

4. Restart WSL:
   ```powershell
   # In PowerShell
   wsl --shutdown
   ```

5. Open a new WSL terminal and verify:
   ```bash
   docker run hello-world
   ```

### Troubleshooting
If `docker` command not found in WSL:
- Ensure Docker Desktop is running (check system tray)
- Check WSL integration is enabled in Docker Desktop settings
- Restart WSL with `wsl --shutdown` in PowerShell

---

## 3. Node.js (v22 LTS)

### What is it?
JavaScript runtime. Required for Next.js and the Supabase CLI.

### Check if installed
```bash
node --version
```

Expected output:
```
v22.x.x
```

Also check npm (comes with Node):
```bash
npm --version
```

### Install if needed
We recommend using **nvm** (Node Version Manager) for easy version management.

#### Install nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Close and reopen your terminal, then verify:
```bash
nvm --version
```

#### Install Node.js 22 LTS
```bash
nvm install 22
nvm use 22
nvm alias default 22
```

#### Verify
```bash
node --version   # v22.x.x
npm --version    # 10.x.x
```

---

## 4. pnpm (v9)

### What is it?
Fast, disk-efficient package manager. Better than npm for monorepos and caching.

### Check if installed
```bash
pnpm --version
```

Expected output:
```
9.x.x
```

### Install if needed
With Node.js already installed:
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Or install directly:
```bash
npm install -g pnpm
```

#### Verify
```bash
pnpm --version
```

---

## 5. Git

### What is it?
Version control. Required for cloning the repo and managing code.

### Check if installed
```bash
git --version
```

Expected output:
```
git version 2.x.x
```

### Install if needed
```bash
sudo apt update
sudo apt install git
```

### Configure Git
Set your identity (use the email associated with your GitHub account):
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Verify:
```bash
git config --list
```

---

## 6. Supabase CLI

### What is it?
Runs the full Supabase stack locally (Postgres, Auth, Realtime, Studio) via Docker. Also handles migrations and type generation.

### How it's installed
The Supabase CLI is installed as a **project dev dependency** - you don't need to install it globally. It comes with `pnpm install`:

```json
// package.json
{
  "devDependencies": {
    "supabase": "^2.72.8"
  }
}
```

### Check if working (after project setup)
After running `pnpm install` in the project:
```bash
pnpm supabase --version
```

Expected output:
```
2.72.x Supabase CLI
```

### Verify Docker integration
The CLI needs Docker running to start the local stack:
```bash
# Make sure Docker Desktop is running, then:
pnpm supabase start
```

First run downloads images (~2-3 minutes). You should see:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbG...
service_role key: eyJhbG...
```

### Troubleshooting

**"Cannot connect to Docker daemon"**
- Make sure Docker Desktop is running
- Check WSL integration is enabled in Docker Desktop settings
- Restart WSL: `wsl --shutdown` (in PowerShell)

**Port conflicts**
If you see port binding errors, something else is using those ports. Either stop the conflicting service or configure different ports in `supabase/config.toml`.

---

## 7. VS Code with WSL Extension

### What is it?
Code editor with excellent WSL integration. Opens files directly in your Linux environment.

### Check if installed
In WSL terminal:
```bash
code --version
```

If it opens VS Code or shows a version number, you're set.

### Install if needed

1. Download VS Code for Windows:
   https://code.visualstudio.com/

2. Install and open VS Code

3. Install the **WSL extension**:
   - Press `Ctrl+Shift+X` to open Extensions
   - Search for "WSL"
   - Install "WSL" by Microsoft

4. Connect to WSL:
   - Press `Ctrl+Shift+P`
   - Type "WSL: Connect to WSL"
   - Select your Ubuntu distro

5. Or from WSL terminal, open a folder:
   ```bash
   code .
   ```

### Recommended Extensions
Once connected to WSL, install these extensions (they'll install in WSL context):
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features (built-in)

---

## 8. Strava API Application

### What is it?
You need Strava API credentials to test OAuth and webhook integration.

### Check if set up
You should have:
- Client ID
- Client Secret
- Webhook Verify Token (you create this)

### Create if needed

1. Go to https://www.strava.com/settings/api

2. Click "Create an App" (or "My API Application" if you have one)

3. Fill in the form:
   - **Application Name:** S40G (Dev)
   - **Category:** Training
   - **Club:** (leave blank)
   - **Website:** http://localhost:3000
   - **Authorization Callback Domain:** localhost

4. After creation, note down:
   - **Client ID** (a number)
   - **Client Secret** (keep this secret!)

5. Create a **Webhook Verify Token** - any random string you choose, e.g.:
   ```
   s40g-webhook-verify-token-abc123
   ```
   (You'll use this later when registering the webhook)

### Store credentials
You'll add these to `.env.local` during project setup:
```bash
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
STRAVA_VERIFY_TOKEN=s40g-webhook-verify-token-abc123
```

**Never commit these to Git!**

---

## 9. GitHub Account & SSH Key (Optional but Recommended)

### Check if SSH is set up
```bash
ssh -T git@github.com
```

If you see "Hi username!", you're good.

### Set up SSH key
```bash
# Generate key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start ssh-agent
eval "$(ssh-agent -s)"

# Add key
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
```

Then add the public key to GitHub:
https://github.com/settings/keys

---

## Summary

| Tool | Version | Command to Check |
|------|---------|------------------|
| WSL | 2.x | `wsl --version` (in PowerShell) |
| Docker | 27.x | `docker --version` |
| Docker Compose | 2.x | `docker compose version` |
| Node.js | 22.x | `node --version` |
| pnpm | 9.x | `pnpm --version` |
| Git | 2.x | `git --version` |
| Supabase CLI | 2.72.x | `pnpm supabase --version` * |
| VS Code | any | `code --version` |

\* Supabase CLI is installed with `pnpm install` - check after project setup.

---

## All Good?

Once everything is installed, you're ready to set up the project:

```bash
# Clone the repo (once it exists)
git clone git@github.com:your-username/s40g.git
cd s40g

# Install dependencies
pnpm install

# Start local Supabase
pnpm db:start

# Start dev server
pnpm dev
```

Then open http://localhost:3000 🎉

# AWS Docker CI/CD

This project deploys with GitHub Actions, Docker Hub, and an AWS host running Docker Compose.

## GitHub Secrets

Add these secrets in GitHub repository settings:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub username that can push `nurlannn/love-server` and `nurlannn/love-client` |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `AWS_HOST` | Public IP or domain of the AWS server |
| `AWS_USER` | SSH user, for example `ubuntu` |
| `AWS_SSH_KEY` | Private SSH key with access to the AWS server |
| `AWS_SSH_PORT` | Optional SSH port, usually `22` |
| `AWS_DEPLOY_PATH` | Absolute path to this repo on the AWS server |

## AWS Server Requirements

The AWS server must already have:

- Docker and Docker Compose installed.
- This repository checked out at `AWS_DEPLOY_PATH`.
- `server/.env` created with production values.
- The SSH user allowed to run `docker compose`.

Required `server/.env` values:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long-random-production-secret
JWT_EXPIRES_IN=7d
PORT=4000
CLIENT_ORIGIN=http://your-domain-or-ip:8080
GMAIL_USER=your-gmail@example.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

## Deploy Flow

On pushes to `main` or `master`, GitHub Actions will:

1. Build the Vite client.
2. Typecheck the Express server.
3. Build and push Docker images to Docker Hub.
4. SSH into AWS and run `scripts/deploy.sh`.

You can also run the workflow manually from the GitHub Actions tab.

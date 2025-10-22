# FinCorp Financial Reports CTF Challenge

A multi-stage Capture The Flag challenge designed to teach security concepts through practical exploitation.

## Challenge Overview

Navigate through interconnected vulnerabilities to capture both flags. The challenge requires discovering each vulnerability progressively—early stages provide access to later ones.

**Objective**: Find both flags by exploiting vulnerabilities in the web application.

## Getting Started

### Setup

1. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Main site: http://localhost:8080
   - Admin portal: http://localhost:8080/admin

### Rules

- No hints or walkthroughs provided
- Progression is sequential—each flag is necessary for the next stage
- You cannot skip stages or access later flags prematurely
- Both flags must be captured to complete the challenge

## Architecture

- **Web Server** (Port 8080): Public-facing application
- **API Server** (Port 3001): Internal service
- **Networking**: Docker network isolation between services

## Cleanup

To stop and remove containers:
```bash
docker-compose down
```

---

**This is an educational CTF challenge. The vulnerabilities are intentional and should never be replicated in production systems.**

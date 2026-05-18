# Linker — GitHub 연동 및 서버 배포 가이드

## 목차

1. [전체 흐름 개요](#1-전체-흐름-개요)
2. [사전 준비](#2-사전-준비)
3. [Git 초기화 및 GitHub 연동](#3-git-초기화-및-github-연동)
4. [GitHub Actions CI 파이프라인](#4-github-actions-ci-파이프라인)
5. [서버 환경 구성](#5-서버-환경-구성)
6. [GitHub Actions CD 파이프라인 추가](#6-github-actions-cd-파이프라인-추가)
7. [GitHub Secrets 등록](#7-github-secrets-등록)
8. [첫 배포 순서](#8-첫-배포-순서)
9. [이후 배포 (일상 운영)](#9-이후-배포-일상-운영)
10. [트러블슈팅](#10-트러블슈팅)

---

## 1. 전체 흐름 개요

```
개발자 PC                GitHub                    온프레미스 서버
─────────────────────────────────────────────────────────────────────
코드 변경
  │
  │  git push origin main
  ▼
              main 브랜치 push 이벤트 감지
              │
              ├─ Secret Scan (GitLeaks)
              ├─ Backend 빌드/테스트 (Java 21)
              ├─ Frontend 타입체크/린트 (Node.js 20)
              └─ Docker 이미지 빌드 → ghcr.io 푸시
                            │
                            │  SSH 접속 + docker compose pull
                            ▼
                                      컨테이너 재시작
                                      (무중단 롤링 업데이트)
```

**브랜치 전략**

| 브랜치 | 용도 | CI 실행 | CD 실행 |
|--------|------|---------|---------|
| `main` | 운영 배포용 | ✅ | ✅ |
| `develop` | 통합 개발용 | ✅ | ❌ |
| `feature/*` | 기능 개발 | PR 생성 시 | ❌ |

---

## 2. 사전 준비

### 2-1. 로컬 PC
- Git 설치 확인: `git --version`
- GitHub 계정 및 저장소(repo) 준비

### 2-2. 서버
- OS: Ubuntu 22.04 LTS 권장
- Docker Engine 설치
- Docker Compose Plugin 설치
- 방화벽: 80(HTTP), 443(HTTPS), 22(SSH) 포트 오픈

#### 서버에 Docker 설치 (Ubuntu)
```bash
# Docker 공식 저장소 등록
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 설치
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 명령 사용)
sudo usermod -aG docker $USER
newgrp docker

# 설치 확인
docker --version
docker compose version
```

---

## 3. Git 초기화 및 GitHub 연동

### 3-1. 로컬 저장소 초기화

프로젝트 루트(`C:\Users\jayje\linker`)에서 실행:

```bash
# Git 초기화
git init

# 사용자 정보 설정 (최초 1회)
git config user.name "이름"
git config user.email "이메일@example.com"

# GitHub 원격 저장소 등록
git remote add origin https://github.com/[계정명]/[저장소명].git

# 브랜치 이름을 main으로 설정
git branch -M main
```

### 3-2. 최초 커밋 및 푸시

```bash
# 모든 파일 스테이징 (.gitignore 에 의해 민감 파일은 자동 제외)
git add .

# 커밋
git commit -m "feat: initial commit"

# GitHub에 푸시
git push -u origin main
```

### 3-3. .gitignore 확인 — 절대 올라가면 안 되는 파일

현재 `.gitignore`에 이미 포함된 항목:

```
.env                    # 환경변수 파일 (DB 비밀번호, API 키 등)
.env.local
.env.production
*.secret
backend/build/          # 컴파일 결과물
node_modules/           # npm 패키지
frontend/web/dist/      # 프론트엔드 빌드 결과물
```

> ⚠️ `.env` 파일은 절대 커밋하지 않는다. 환경변수는 GitHub Secrets 또는 서버의 `.env` 파일로만 관리한다.

---

## 4. GitHub Actions CI 파이프라인

파일 위치: `.github/workflows/ci.yml`

### 4-1. 트리거 조건

```yaml
on:
  push:
    branches: [main, develop]     # main/develop 에 push 시
  pull_request:
    branches: [main, develop]     # PR 생성/업데이트 시
```

### 4-2. CI 단계별 설명

```
push 발생
  │
  ├─ [1] Secret Scan (GitLeaks)
  │       민감 정보(API 키, 비밀번호)가 코드에 포함됐는지 자동 검사
  │       → 실패 시 이후 단계 모두 중단
  │
  ├─ [2] Backend (Java 21)            ← Secret Scan 통과 후
  │       - Checkstyle 코드 스타일 검사
  │       - ./gradlew build (컴파일 + 단위 테스트)
  │       - PostgreSQL/Redis 서비스 컨테이너 사용
  │
  ├─ [3] Frontend Web (Node.js 20)    ← Secret Scan 통과 후
  │       - npm ci (의존성 설치)
  │       - npm run typecheck (TypeScript 타입 검사)
  │       - npm run lint (ESLint)
  │
  ├─ [4] Playwright E2E              ← Frontend 통과 후
  │       - 브라우저 자동화 테스트
  │
  ├─ [5] Commitlint                  ← PR 이벤트 한정
  │       - 커밋 메시지가 Conventional Commits 규칙에 맞는지 검사
  │       - 예: feat:, fix:, chore:, docs: 형식 필수
  │
  └─ [6] Docker Build & Push         ← main 브랜치 push + 2/3/4 모두 통과 시
          - Docker 이미지 빌드 (backend/Dockerfile)
          - ghcr.io (GitHub Container Registry) 에 푸시
          - 태그: latest, sha-{커밋해시}, main
```

### 4-3. Docker 이미지 이름

```
ghcr.io/[GitHub계정명]/[저장소명]/linker-backend:latest
ghcr.io/[GitHub계정명]/[저장소명]/linker-backend:sha-a1b2c3d
```

---

## 5. 서버 환경 구성

### 5-1. 배포 디렉토리 생성

```bash
# 서버에 SSH 접속 후
mkdir -p /opt/linker
cd /opt/linker
```

### 5-2. 환경변수 파일 생성

```bash
# /opt/linker/.env 생성 (서버에서 직접 작성, 절대 GitHub에 올리지 않음)
cat > /opt/linker/.env << 'EOF'
# ── 데이터베이스 ──────────────────────────────
POSTGRES_USER=linker
POSTGRES_PASSWORD=안전한_비밀번호

# ── Redis ─────────────────────────────────────
REDIS_HOST=linker-redis
REDIS_PORT=6379
REDIS_PASSWORD=안전한_비밀번호

# ── MinIO (파일 스토리지) ──────────────────────
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=안전한_비밀번호
MINIO_ENDPOINT=http://linker-minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=안전한_비밀번호
MINIO_BUCKET=linker-files

# ── 백엔드 앱 설정 ────────────────────────────
SPRING_PROFILES_ACTIVE=onprem
DB_HOST=linker-postgres
DB_PORT=5432
JWT_SECRET=최소_32자_이상의_랜덤_문자열
ENCRYPTION_KEY=64자리_16진수_문자열

# ── AI (Gemini) ───────────────────────────────
GEMINI_API_KEY=AIzaSy...
LLM_MODEL_NAME=gemini-2.5-flash

# ── CORS ──────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://linker.회사도메인.com

# ── 모니터링 ──────────────────────────────────
GRAFANA_USER=admin
GRAFANA_PASSWORD=안전한_비밀번호

# ── GitHub Container Registry (이미지 pull용) ──
GHCR_TOKEN=ghp_...  # GitHub Personal Access Token (read:packages 권한)
EOF

chmod 600 /opt/linker/.env   # 소유자만 읽기/쓰기
```

### 5-3. 서버용 docker-compose.yml 작성

```bash
cat > /opt/linker/docker-compose.yml << 'EOF'
# 이 파일은 서버에만 존재 — GitHub에는 올리지 않음

services:

  backend:
    image: ghcr.io/[GitHub계정]/[저장소명]/linker-backend:latest
    container_name: linker-backend
    restart: unless-stopped
    env_file: .env
    environment:
      SPRING_PROFILES_ACTIVE: onprem
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # ── 인프라 서비스들 (개발용 docker-compose.yml과 동일) ──
  postgres:
    image: pgvector/pgvector:pg16
    container_name: linker-postgres
    restart: unless-stopped
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d linker"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: linker-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    env_file: .env
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: linker-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    env_file: .env
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
EOF
```

### 5-4. GitHub Container Registry 로그인

서버에서 이미지를 pull하려면 로그인이 필요합니다:

```bash
# GitHub Personal Access Token으로 ghcr.io 로그인
echo $GHCR_TOKEN | docker login ghcr.io -u [GitHub계정명] --password-stdin
```

---

## 6. GitHub Actions CD 파이프라인 추가

`.github/workflows/ci.yml` 파일 하단에 deploy job을 추가합니다:

```yaml
  # ── 서버 배포 (main 브랜치, Docker 빌드 성공 후) ──────────────────────────
  deploy:
    name: Deploy to On-Premises
    runs-on: ubuntu-latest
    needs: docker                              # Docker 이미지 푸시 완료 후 실행
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}     # 서버 IP 주소
          username: ${{ secrets.SERVER_USER }} # SSH 접속 계정
          key: ${{ secrets.SERVER_SSH_KEY }}   # SSH 개인키
          port: 22
          script: |
            cd /opt/linker

            # ghcr.io 로그인
            echo "${{ secrets.GHCR_TOKEN }}" | \
              docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # 최신 이미지 pull
            docker compose pull backend

            # 백엔드 컨테이너만 재시작 (DB/Redis는 유지)
            docker compose up -d --no-deps backend

            # 헬스체크 대기 (최대 60초)
            timeout 60 bash -c \
              'until docker compose ps backend | grep -q "healthy"; do sleep 3; done'

            # 오래된 이미지 정리
            docker image prune -f
```

---

## 7. GitHub Secrets 등록

GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `SERVER_HOST` | `192.168.x.x` | 서버 IP 주소 |
| `SERVER_USER` | `ubuntu` | SSH 접속 계정명 |
| `SERVER_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH 개인키 전체 내용 |
| `GHCR_TOKEN` | `ghp_...` | GitHub PAT (read:packages, write:packages 권한) |

### SSH 키 생성 방법 (로컬 PC에서)

```bash
# 배포 전용 SSH 키 생성
ssh-keygen -t ed25519 -C "linker-deploy" -f ~/.ssh/linker_deploy

# 공개키 → 서버에 등록
cat ~/.ssh/linker_deploy.pub
# 위 내용을 서버의 ~/.ssh/authorized_keys 에 추가

# 개인키 → GitHub Secret 에 등록
cat ~/.ssh/linker_deploy
# 위 전체 내용을 SERVER_SSH_KEY 시크릿에 붙여넣기
```

---

## 8. 첫 배포 순서

```
1. 로컬: git init + remote 등록 + 최초 push
         ↓
2. GitHub Actions CI 자동 실행 (빌드/테스트/이미지 푸시)
         ↓
3. 서버: /opt/linker 디렉토리 생성
4. 서버: .env 파일 작성
5. 서버: docker-compose.yml 작성
6. 서버: ghcr.io 로그인
         ↓
7. GitHub: Secrets 등록 (SERVER_HOST, SERVER_USER, SERVER_SSH_KEY, GHCR_TOKEN)
         ↓
8. GitHub Actions Deploy job 자동 실행
         ↓
9. 서버에서 확인: docker compose ps
```

### 8-1. 서버에서 상태 확인

```bash
# 컨테이너 실행 상태
docker compose ps

# 백엔드 로그 실시간 확인
docker compose logs -f backend

# 헬스체크
curl http://localhost:8080/actuator/health
```

---

## 9. 이후 배포 (일상 운영)

### 코드 변경 → 자동 배포

```bash
# 기능 개발
git checkout -b feature/새기능명

# 작업 완료 후
git add .
git commit -m "feat: 새기능 설명"
git push origin feature/새기능명

# GitHub에서 main으로 Pull Request 생성
# → CI 자동 실행 (테스트/린트)
# → PR 승인 후 main에 머지
# → CD 자동 실행 (서버 배포)
```

### 긴급 핫픽스

```bash
git checkout main
git checkout -b hotfix/버그명
# 수정 작업
git add .
git commit -m "fix: 버그 설명"
git push origin hotfix/버그명
# PR → main 머지 → 자동 배포
```

### 배포 히스토리 확인

GitHub 저장소 → **Actions** 탭에서 각 배포의 성공/실패 및 로그 확인 가능

---

## 10. 트러블슈팅

### CI 빌드 실패 시

```bash
# Actions 탭에서 실패한 Step 클릭 → 로그 확인
# 주요 실패 원인:
# - 컴파일 에러: 로컬에서 먼저 빌드 확인 (.\gradlew.bat build)
# - 테스트 실패: 로컬 테스트 실행 후 확인
# - Checkstyle: 코드 스타일 규칙 위반
```

### 서버 배포 후 컨테이너 재시작 반복 시

```bash
# 에러 로그 확인
docker compose logs --tail=100 backend

# 환경변수 확인 (.env 파일 값 검토)
docker compose exec backend env | grep SPRING

# 수동 재시작
docker compose restart backend
```

### 이미지 pull 실패 (인증 오류)

```bash
# ghcr.io 재로그인
echo "GHCR_TOKEN값" | docker login ghcr.io -u GitHub계정명 --password-stdin

# 이미지가 public인지 확인
# GitHub → 저장소 → Packages → 이미지 → Package settings → Visibility
```

### 롤백 (이전 버전으로 복구)

```bash
# 특정 커밋 해시의 이미지로 롤백
docker compose pull backend  # 안됨 → 특정 태그 지정

# docker-compose.yml 에서 이미지 태그를 특정 sha로 변경
# image: ghcr.io/.../linker-backend:sha-abc1234
docker compose up -d --no-deps backend
```

---

## 참고: 프로젝트 디렉토리 구조

```
linker/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD 파이프라인
├── backend/
│   ├── Dockerfile          # 백엔드 이미지 빌드 설정
│   └── src/
├── frontend/
│   └── web/
├── docker-compose.yml      # 로컬 개발용 인프라 (DB, Redis, MinIO 등)
├── .gitignore
└── DEPLOY.md               # 이 문서
```

> 서버의 `/opt/linker/docker-compose.yml`은 **백엔드 앱 컨테이너**를 포함하는 운영용 파일로,  
> 로컬의 `docker-compose.yml`(인프라만 포함)과 별개로 서버에만 존재합니다.

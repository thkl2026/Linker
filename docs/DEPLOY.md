# Linker — GitHub 연동 및 서버 배포 가이드

## 목차

1. [전체 흐름 개요](#1-전체-흐름-개요)
2. [Git 초기화 및 GitHub 연동](#2-git-초기화-및-github-연동)
3. [GitHub Actions CI 파이프라인](#3-github-actions-ci-파이프라인)
4. [온프레미스 서버 구성 (Ubuntu)](#4-온프레미스-서버-구성-ubuntu)
5. [GitHub Actions CD 파이프라인](#5-github-actions-cd-파이프라인)
6. [GitHub Secrets 등록](#6-github-secrets-등록)
7. [첫 배포 체크리스트](#7-첫-배포-체크리스트)
8. [이후 배포 (일상 운영)](#8-이후-배포-일상-운영)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 전체 흐름 개요

```
개발자 PC                  GitHub                     온프레미스 서버 (Ubuntu)
────────────────────────────────────────────────────────────────────────────
코드 변경
  │
  │  git push origin main
  ▼
                main 브랜치 push 이벤트 감지
                │
                ├─ [1] Secret Scan (GitLeaks)
                ├─ [2] Backend 빌드/테스트 (Java 21)
                ├─ [3] Frontend 타입체크/린트 (Node.js 20)
                ├─ [4] Playwright E2E 테스트
                └─ [5] Docker 이미지 빌드 → ghcr.io 푸시
                                │
                                │  SSH 접속 + docker compose pull
                                ▼
                                           컨테이너 무중단 재시작
```

**브랜치 전략**

| 브랜치 | 용도 | CI 실행 | CD 실행 |
|--------|------|---------|---------|
| `main` | 운영 배포용 | ✅ | ✅ |
| `develop` | 통합 개발용 | ✅ | ❌ |
| `feature/*` | 기능 개발 | PR 생성 시 | ❌ |

---

## 2. Git 초기화 및 GitHub 연동

### 2-1. 로컬 저장소 초기화

프로젝트 루트에서 실행:

```bash
git init
git config user.name "이름"
git config user.email "이메일@example.com"
git remote add origin https://github.com/thkl2026/Linker.git
git branch -M main
```

### 2-2. 최초 커밋 및 푸시

```bash
git add .
git commit -m "feat: initial commit"
git push -u origin main
```

### 2-3. .gitignore — 절대 올라가면 안 되는 파일

```
.env                                          # 환경변수 (DB 비밀번호, API 키)
backend/src/main/resources/application-local.yml  # 로컬 개발 설정 (실제 시크릿 포함)
backend/build/                                # 컴파일 결과물
node_modules/                                 # npm 패키지
frontend/web/dist/                            # 프론트엔드 빌드 결과물
```

> ⚠️ 환경변수는 GitHub Secrets 또는 서버의 `.env` 파일로만 관리한다.

---

## 3. GitHub Actions CI 파이프라인

### CI/CD란?

**CI (Continuous Integration, 지속적 통합)**
코드를 GitHub에 푸시할 때마다 자동 실행되는 검사 파이프라인입니다.
빌드 오류, 테스트 실패, 코드 스타일 위반, 민감 정보 포함 여부를 자동으로 검사해
문제가 있는 코드가 서버에 올라가는 것을 방지합니다.

**CD (Continuous Deployment, 지속적 배포)**
CI가 통과되면 자동으로 서버에 새 버전을 배포합니다.
main 브랜치에 코드가 머지되면 수동 작업 없이 서버가 자동으로 최신 버전으로 업데이트됩니다.

```
코드 변경 → git push → CI 자동 검사 → 통과 시 CD 자동 배포
                         실패 시 서버 반영 안 됨 (안전장치)
```

파일 위치: `.github/workflows/ci.yml`

### CI 단계별 설명

```
push 발생
  │
  ├─ [1] Secret Scan (GitLeaks)
  │       API 키·비밀번호가 코드에 포함됐는지 자동 검사
  │       → 실패 시 이후 단계 모두 중단
  │
  ├─ [2] Backend (Java 21)            ← Secret Scan 통과 후
  │       - Checkstyle 코드 스타일 검사
  │       - ./gradlew build (컴파일 + 단위 테스트)
  │       - PostgreSQL / Redis 서비스 컨테이너 사용
  │
  ├─ [3] Frontend Web (Node.js 20)    ← Secret Scan 통과 후
  │       - npm ci (의존성 설치)
  │       - npm run typecheck (TypeScript 타입 검사)
  │       - npm run lint (ESLint)
  │
  ├─ [4] Playwright E2E               ← Frontend 통과 후
  │       - 브라우저 자동화 테스트
  │
  ├─ [5] Commitlint                   ← PR 이벤트 한정
  │       - 커밋 메시지 Conventional Commits 형식 검사
  │       - 예: feat:, fix:, chore:, docs:
  │
  └─ [6] Docker Build & Push          ← main 브랜치 push + 2/3/4 모두 통과 시
          - Docker 이미지 빌드 (backend/Dockerfile)
          - ghcr.io (GitHub Container Registry) 에 푸시
          - 태그: latest, sha-{커밋해시}, main
```

### Docker 이미지 이름

```
ghcr.io/thkl2026/linker/linker-backend:latest
ghcr.io/thkl2026/linker/linker-backend:sha-a1b2c3d
```

---

## 4. 온프레미스 서버 구성 (Ubuntu)

> 서버에 SSH로 접속한 후 아래 순서대로 진행합니다.

### 4-1. 서버 초기 설정

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw
```

### 4-2. 방화벽 설정

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 8080    # 백엔드 API (Nginx 구성 후 닫아도 됨)
sudo ufw enable
sudo ufw status
```

### 4-3. Docker 설치

```bash
# Docker 공식 GPG 키 등록
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 저장소 등록
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 설치
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# sudo 없이 docker 사용 (재로그인 필요)
sudo usermod -aG docker $USER
newgrp docker

# 확인
docker --version
docker compose version
```

### 4-4. 배포 디렉토리 생성

```bash
sudo mkdir -p /opt/linker
sudo chown $USER:$USER /opt/linker
cd /opt/linker
```

### 4-5. 환경변수 파일 작성

```bash
cat > /opt/linker/.env << 'EOF'
# ── 데이터베이스 ──────────────────────────────
POSTGRES_USER=linker
POSTGRES_PASSWORD=여기에_강력한_비밀번호

# ── Redis ─────────────────────────────────────
REDIS_HOST=linker-redis
REDIS_PORT=6379
REDIS_PASSWORD=여기에_강력한_비밀번호

# ── MinIO (파일 스토리지) ──────────────────────
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=여기에_강력한_비밀번호
MINIO_ENDPOINT=http://linker-minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=여기에_강력한_비밀번호
MINIO_BUCKET=linker-files

# ── 백엔드 ────────────────────────────────────
SPRING_PROFILES_ACTIVE=onprem
DB_HOST=linker-postgres
DB_PORT=5432
JWT_SECRET=최소_32자_이상_랜덤_문자열
ENCRYPTION_KEY=64자리_16진수_문자열

# ── AI (Gemini) ───────────────────────────────
GEMINI_API_KEY=AIzaSy...실제_키_입력
LLM_MODEL_NAME=gemini-2.5-flash

# ── CORS ──────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://서버IP,http://서버IP:5173

# ── 메일 (초대 이메일 발송) ───────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=발송용_이메일@gmail.com
MAIL_PASSWORD=Gmail_앱_비밀번호_16자리

# ── 앱 기본 URL (초대 링크 생성용) ──────────
APP_BASE_URL=http://서버IP

# ── 모니터링 ──────────────────────────────────
GRAFANA_USER=admin
GRAFANA_PASSWORD=여기에_강력한_비밀번호
EOF

chmod 600 /opt/linker/.env   # 소유자만 읽기/쓰기
```

### 4-6. 운영용 docker-compose.yml 작성

```bash
cat > /opt/linker/docker-compose.yml << 'EOF'
services:

  backend:
    image: ghcr.io/thkl2026/linker/linker-backend:latest
    container_name: linker-backend
    restart: unless-stopped
    env_file: .env
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
      start_period: 90s

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
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
EOF
```

> 이 파일은 서버에만 존재합니다. 로컬의 `docker-compose.yml`(인프라 전용)과 별개입니다.

### 4-7. GitHub Container Registry 로그인

GitHub에서 Personal Access Token 발급:
- Settings → Developer settings → Personal access tokens → Tokens (classic)
- 권한: `read:packages` 체크

```bash
echo "ghp_토큰값" | docker login ghcr.io -u thkl2026 --password-stdin
```

### 4-8. 첫 실행

```bash
cd /opt/linker

docker compose pull          # 이미지 다운로드
docker compose up -d         # 컨테이너 시작

# 상태 확인 (모두 healthy가 될 때까지 대기)
docker compose ps

# 백엔드 로그 확인
docker compose logs -f backend

# 헬스체크
curl http://localhost:8080/actuator/health
```

정상 기동 시:
```
linker-postgres   Up (healthy)
linker-redis      Up (healthy)
linker-minio      Up
linker-backend    Up (healthy)
```

### 4-9. Nginx 리버스 프록시 설정 (선택, 권장)

80 포트로 서비스하거나 도메인을 연결할 때 사용합니다.

```bash
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/linker << 'EOF'
server {
    listen 80;
    server_name 서버IP_또는_도메인;

    # 백엔드 API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 180s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 프론트엔드 정적 파일
    location / {
        root /opt/linker/frontend;
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/linker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. GitHub Actions CD 파이프라인

파일: `.github/workflows/ci.yml` (이미 추가됨)

```yaml
  deploy:
    name: Deploy to Server
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/linker
            echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker pull ghcr.io/${{ github.repository }}/linker-backend:latest
            docker compose up -d --no-deps --pull always backend
            docker image prune -f
```

---

## 6. GitHub Secrets 등록

GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `SERVER_HOST` | `192.168.x.x` | 서버 IP 주소 |
| `SERVER_USER` | `ubuntu` | SSH 접속 계정명 |
| `SERVER_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH 개인키 전체 내용 |
| `GHCR_TOKEN` | `ghp_...` | GitHub PAT (`read:packages`, `write:packages`) |

### SSH 키 생성 (Windows 로컬 PC에서)

```powershell
# 배포 전용 키 생성
ssh-keygen -t ed25519 -C "linker-deploy" -f "$HOME\.ssh\linker_deploy"

# 공개키 출력 → 서버의 ~/.ssh/authorized_keys 에 붙여넣기
cat "$HOME\.ssh\linker_deploy.pub"

# 개인키 출력 → GitHub Secret SERVER_SSH_KEY 에 등록
cat "$HOME\.ssh\linker_deploy"
```

서버에서:
```bash
echo "공개키_내용" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 7. 첫 배포 체크리스트

```
로컬
  ☐ git init + remote 등록 완료
  ☐ 최초 push → CI 자동 실행 확인 (Actions 탭)

서버 (Ubuntu)
  ☐ apt update + 필수 패키지 설치
  ☐ 방화벽(ufw) 설정
  ☐ Docker 설치 및 docker 그룹 추가
  ☐ /opt/linker 디렉토리 생성
  ☐ .env 파일 작성 (chmod 600)
  ☐ docker-compose.yml 작성
  ☐ ghcr.io 로그인
  ☐ docker compose up -d → healthy 확인

GitHub
  ☐ SERVER_HOST Secret 등록
  ☐ SERVER_USER Secret 등록
  ☐ SERVER_SSH_KEY Secret 등록 (개인키 전체)
  ☐ GHCR_TOKEN Secret 등록

완료
  ☐ main 브랜치에 push → Actions CD job 자동 실행 확인
  ☐ curl http://서버IP:8080/actuator/health → {"status":"UP"}
```

---

## 8. 이후 배포 (일상 운영)

### 기능 개발 → 자동 배포

```bash
# 기능 브랜치 생성
git checkout -b feature/새기능명

# 작업 후 커밋 (Conventional Commits 형식 필수)
git add .
git commit -m "feat: 새기능 설명"
git push origin feature/새기능명

# GitHub에서 main으로 Pull Request 생성
# → CI 자동 실행 (빌드/테스트/린트)
# → PR 승인 후 main 머지
# → CD 자동 실행 (서버 배포)
```

### 긴급 핫픽스

```bash
git checkout main
git checkout -b hotfix/버그명
git commit -m "fix: 버그 설명"
git push origin hotfix/버그명
# PR → main 머지 → 자동 배포
```

### 배포 히스토리 확인

GitHub 저장소 → **Actions** 탭에서 각 배포의 성공/실패 및 로그 확인

---

## 9. 트러블슈팅

### CI 빌드 실패

```
Actions 탭 → 실패한 Step 클릭 → 로그 확인

주요 원인:
- 컴파일 에러:  로컬에서 .\gradlew.bat build 먼저 확인
- 테스트 실패:  로컬 테스트 실행 후 원인 파악
- Checkstyle:  코드 스타일 규칙 위반
- ESLint:      npm run lint 로컬 실행 후 수정
```

### 컨테이너 재시작 반복 (CrashLoopBackOff)

```bash
# 에러 로그 확인
docker compose logs --tail=100 backend

# 환경변수 확인
docker compose exec backend env | grep SPRING

# 수동 재시작
docker compose restart backend
```

### 이미지 pull 실패 (인증 오류)

```bash
# ghcr.io 재로그인
echo "GHCR_TOKEN값" | docker login ghcr.io -u thkl2026 --password-stdin

# 패키지 공개 여부 확인
# GitHub → 저장소 → Packages → 이미지 → Package settings → Visibility
```

### 롤백 (이전 버전으로 복구)

```bash
# docker-compose.yml 에서 이미지 태그를 특정 커밋 해시로 변경
# image: ghcr.io/thkl2026/linker/linker-backend:sha-abc1234

docker compose up -d --no-deps backend
```

---

## 참고: 프로젝트 디렉토리 구조

```
linker/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD 파이프라인
├── backend/
│   ├── Dockerfile              # 백엔드 이미지 빌드 설정
│   ├── gradlew                 # Linux/Mac용 Gradle 실행 스크립트
│   └── src/
├── frontend/
│   └── web/
│       └── eslint.config.js    # ESLint v9 flat config
├── docker-compose.yml          # 로컬 개발용 인프라 (DB, Redis, MinIO)
├── .gitattributes              # 줄바꿈(LF) 설정
├── .gitignore
└── DEPLOY.md                   # 이 문서

서버 (/opt/linker/)             # GitHub에 올리지 않음
├── .env                        # 환경변수 (시크릿 포함)
└── docker-compose.yml          # 백엔드 앱 + 인프라 통합 운영 파일
```

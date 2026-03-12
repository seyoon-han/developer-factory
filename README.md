# Developer Factory

Developer Factory는 개발 요청을 보드에서 관리하고, 실제 작업 대상 저장소는 별도 `workspace/`에서 안전하게 다루도록 설계한 AI 중심 개발 운영 도구입니다. 작업 생성, 요구사항 정리, 실행 승인, 검토, 이력 관리, 문서 보관, 분석 화면까지 하나의 흐름으로 묶는 데 목적이 있습니다.

## 프로젝트 목적

- 개발 요청을 흩어진 채널이 아니라 하나의 작업 보드에서 관리합니다.
- 실제 제품 코드와 운영 보드 코드를 분리해 자동화 작업의 안전성을 높입니다.
- AI 실행 전후에 계획, 검토, 기록 단계를 두어 무분별한 변경을 줄입니다.
- 팀 규칙, 프로젝트 문서, 코멘트, 라벨, 분석 데이터를 같은 맥락에서 조회할 수 있게 합니다.

## 핵심 기능

- 칸반 보드 기반 작업 관리
- AI 기반 요구사항 보강 및 실행 흐름 관리
- 승인 후 구현, 검토, 이력 축적까지 이어지는 작업 파이프라인
- 여러 프로젝트 저장소를 `workspace/`에 연결해 분리 운영
- 프로젝트 문서 및 업로드 파일 보관
- 댓글, 라벨, 설정, 웹훅, 통합 관리
- 토큰 사용량과 작업 상태를 확인하는 분석 화면
- 브라우저 IDE 연동용 구성 포함
- 팀 규칙셋과 자동화 규칙 저장

## 포함 범위

이 저장소에는 실제 실행에 필요한 소스, 설정, 테스트, Docker 구성, 자동화 스크립트만 포함했습니다. 아래 항목은 의도적으로 제외했습니다.

- 로컬 환경 파일
- 데이터베이스 파일과 로그
- 빌드 산출물
- 임시 보고서와 상태 메모

## 빠른 시작

### 1. Docker로 실행

가장 간단한 방법입니다.

```bash
cp .env.example .env
docker-compose up -d --build
```

기본 접속 주소:

- 보드: `http://localhost:3001`
- IDE 연동 포트: `http://localhost:3101`

실행 후 해야 할 일:

1. 설정 화면에서 AI 기능에 사용할 키를 입력합니다.
2. 프로젝트를 생성하거나 저장소를 연결합니다.
3. 작업을 등록하고 승인 기반 자동화 흐름을 시작합니다.

### 2. 로컬 개발로 실행

```bash
npm install
cp .env.example .env
npm run dev
```

기본 접속 주소:

- 로컬 개발 서버: `http://localhost:3000`

브라우저 IDE를 별도로 확인하려면:

```bash
cd theia-ide
npm install
npm run build
npm start
```

## 권장 사용 흐름

1. 프로젝트 저장소를 `workspace/` 아래로 연결합니다.
2. 보드에서 새 작업을 생성하고 설명을 입력합니다.
3. AI가 요구사항을 정리하거나 실행 계획을 보강하도록 합니다.
4. 승인 후 구현 또는 자동화 단계를 실행합니다.
5. 결과를 검토하고 코멘트, 라벨, 문서를 함께 정리합니다.
6. 필요한 경우 보고서와 분석 화면에서 이력을 확인합니다.

## 환경 변수

기본 예시는 `.env.example`, 추가 통합 예시는 `.env.local.example`에 정리돼 있습니다.

필수에 가까운 항목:

- `ANTHROPIC_API_KEY`: AI 기능 사용 시 필요

자주 사용하는 항목:

- `PORT`: 애플리케이션 내부 포트
- `THEIA_PORT`: IDE 연동 포트
- `GIT_USER_NAME`: 자동 커밋/작업 시 기본 작성자명
- `GIT_USER_EMAIL`: 자동 커밋/작업 시 기본 이메일

선택 항목 예시:

- `NEXT_PUBLIC_APP_URL`
- `GITHUB_ACCESS_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `GITLAB_ACCESS_TOKEN`
- `GITLAB_WEBHOOK_SECRET`

## 주요 명령어

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run test
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
npm run docker:test
```

Docker를 빠르게 다시 올릴 때:

```bash
./scripts/docker-quick-rebuild.sh
```

## 디렉터리 구조

```text
developer-factory/
├── app/              # 화면 및 API 라우트
├── components/       # UI 컴포넌트
├── lib/              # 도메인 로직, 저장소, 유틸리티
├── types/            # 공용 타입 정의
├── docker/           # 컨테이너 시작 및 초기화 스크립트
├── scripts/          # 개발/운영 보조 스크립트
├── theia-ide/        # 브라우저 IDE 연동 설정
├── __tests__/        # 테스트 코드
├── workspace/        # 연결된 실제 프로젝트 저장소 위치
├── data/             # 런타임 데이터 저장 위치
├── logs/             # 런타임 로그 저장 위치
└── reports/          # 실행 결과 보고서 저장 위치
```

## 운영 메모

- `workspace/`는 실제 작업 대상 코드를 위한 공간이며, 저장소 본문과 분리해서 다루는 것이 전제입니다.
- `data/`, `logs/`, `reports/`는 런타임 생성물이므로 Git 추적 대상에서 제외됩니다.
- `.claude/`에는 자동화 흐름에서 참조하는 로컬 커맨드와 스킬 구성이 포함됩니다.
- Docker 기준으로 초기 데이터베이스와 필수 디렉터리는 컨테이너 시작 시 자동 준비됩니다.

## 검증 체크리스트

배포 전 최소 권장 확인:

```bash
docker-compose config
npm run lint
npm run type-check
npm run test
```

## 트러블슈팅

### Docker 빌드가 오래 걸리거나 실패하는 경우

- Docker에 메모리와 CPU를 충분히 할당했는지 확인합니다.
- 첫 빌드는 시간이 오래 걸릴 수 있으므로 `docker-compose up -d --build`로 다시 시도합니다.

### 포트 충돌이 나는 경우

- `docker-compose.yml`의 `3001:3000`, `3101:3100` 매핑을 다른 포트로 바꿉니다.
- 로컬 개발 모드에서는 `PORT`, `THEIA_PORT` 값을 변경할 수 있습니다.

### IDE 연동이 바로 올라오지 않는 경우

- `theia-ide/`에서 별도 빌드가 필요한지 확인합니다.
- IDE 기능이 필수라면 `cd theia-ide && npm install && npm run build`를 먼저 수행합니다.

## 라이선스

별도 라이선스 정책이 필요하면 `LICENSE` 파일을 추가해 관리할 수 있습니다.


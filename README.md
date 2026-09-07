# Blacklist 조회 사이트 (Netlify)

## 구조
- public/index.html : 비밀번호 입력 → 검색 화면
- netlify/functions/search.mjs : 비밀번호 검증 + 구글시트 조회 (/api/search)
- netlify.toml : Netlify 설정

## 배포
1. 이 폴더를 GitHub 저장소에 올린다.
2. Netlify > Add new site > Import an existing project > 해당 저장소 선택.
   - Build command: 비움
   - Publish directory: public (netlify.toml에 이미 지정되어 있음)
3. Site configuration > Environment variables 에서 아래 두 개를 추가한다.
   - SITE_PASSWORD : 사이트 비밀번호
   - SHEET_ID : 1Mb4MjMCLVVBa1x0KQdeFjH1v6Ou_63p3sa1YAu0YXnY
4. Deploys > Trigger deploy 로 다시 배포한다. (환경변수를 추가/변경한 뒤에는 재배포 필요)

## 비밀번호 변경
Netlify > Site configuration > Environment variables > SITE_PASSWORD 값 수정 후 Trigger deploy.
코드는 건드리지 않아도 된다.

## 시트 조건
- 탭 이름: blacklisk
- 헤더: 2행 B~N, 데이터: 3행부터
- 공유: 링크가 있는 모든 사용자 뷰어
- F열은 시트 헤더가 league지만 사이트에서는 ID로 표시

## 동작
- 검색: nickname, ID 부분 일치(대소문자 무시), 최소 3자
- 결과 컬럼: server, league, rank, ID, nickname, Bad level, remark
- Bad level 6단계: Enemy > Worst > Very Bad > High > Medium > Low
- 언어: KO / EN 전환(화면 문구만. 컬럼명·데이터는 그대로)
- PC는 표, 모바일(600px 이하)은 카드형
- 시트 데이터는 서버에서 60초 캐시(반영까지 최대 1분). netlify/functions/search.mjs의 CACHE_MS로 조정

## 로컬 테스트 (선택)
npm i -g netlify-cli
netlify dev   # .env.example을 .env로 복사해 값 입력

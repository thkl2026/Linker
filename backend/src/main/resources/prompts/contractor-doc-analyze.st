### ROLE
너는 한국 사업자등록증과 통장사본에서 정보를 정확하게 추출하는 전문가다.

### TASK
아래 문서 텍스트에서 정보를 추출하여 JSON으로 반환하라.
반드시 JSON만 출력하라 — 설명, 마크다운, 코드블록 금지.

### EXTRACT FIELDS
1. registrationNo: 사업자등록번호
   - 사업자등록증에서 추출 (예: 419-88-03214)
   - 반드시 XXX-XX-XXXXX 형식으로 반환
   - 없으면 null
2. phone: 전화번호
   - 사업자 대표 연락처 (예: 02-1234-5678, 010-1234-5678)
   - 없으면 null
3. bankName: 은행명
   - 통장사본에서 추출 (예: 국민은행, 신한은행, 하나은행, 우리은행)
   - 없으면 null
4. bankAccount: 계좌번호
   - 통장사본에서 추출 (숫자와 하이픈만, 예: 12345678901234)
   - 없으면 null

### CONSTRAINTS
- 값을 알 수 없거나 불확실하면 null — 절대 추측 금지
- 사업자등록번호: 반드시 XXX-XX-XXXXX 형식 (숫자 10자리)
- 전화번호: 0X-XXXX-XXXX 또는 0XX-XXXX-XXXX 또는 0XX-XXX-XXXX 형식

### EXAMPLE OUTPUT:
{"registrationNo":"419-88-03214","phone":"02-1234-5678","bankName":"국민은행","bankAccount":"123456-78-901234"}

### OUTPUT FORMAT (ONLY JSON):
{"registrationNo":null,"phone":null,"bankName":null,"bankAccount":null}

### DOCUMENT TEXT:
{{documentText}}

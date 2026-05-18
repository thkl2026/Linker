# 전문가 이력서(Resume) 인식 고도화 및 최적화 상세 전략 (Ver 2.0)

본 문서는 이력서 데이터 추출의 정확도를 99% 이상으로 끌어올리기 위한 구체적인 기술 스택, 알고리즘 아키텍처 및 상세 구현 방안을 다룹니다.

---

## 1. 전처리 단계 (Pre-processing Pipeline)
데이터 추출 전, 원본 파일의 품질을 최적화하여 인식률의 기초를 다집니다.

### 1.1 이미지 품질 개선 (Image Enhancement)
- **Denoising & Binarization**: 스캔된 이미지의 노이즈를 제거하고 이진화(Binarization)를 통해 텍스트 대조를 극대화합니다. (`OpenCV` 활용)
- **Deskewing**: 기울어진 문서를 수평으로 자동 보정합니다.
- **Super-Resolution**: 저해상도 이미지는 `SRCNN` 등의 모델을 사용하여 텍스트 가독성을 높입니다.

### 1.2 포맷별 맞춤형 파싱 로직 (Multi-Format Support)
- **DOCX (Word)**: 단순 텍스트 추출(`python-docx`)은 텍스트 박스나 표의 순서를 뒤섞을 수 있습니다. `Mammoth` 라이브러리를 사용하여 **HTML 스타일로 변환** 후, 문서의 계층 구조(Heading, Paragraph, Table)를 유지한 상태에서 파싱합니다.
- **PPTX (PowerPoint)**: 슬라이드 내 텍스트는 좌표 기반으로 파싱하며, 시각적 레이아웃이 중요한 경우 슬라이드 전체를 **고해상도 이미지로 렌더링**하여 비전 모델(GPT-4o Vision)에 전달합니다.
- **XLSX (Excel)**: `Pandas` 또는 `Openpyxl`을 사용하여 데이터를 추출하고, 각 시트(Sheet)와 테이블 헤더의 연관 관계를 분석하여 구조화된 JSON으로 변환합니다.

---

## 2. 레이아웃 분석 및 영역 분할 (Document Layout Analysis)
단순한 줄 단위 읽기가 아닌, 문서의 '의미적 덩어리'를 파악합니다.

### 2.1 Deep Learning Layout Analysis
- **Model**: `LayoutLMv3` (Microsoft) 또는 `DocParser` 기반 모델 사용.
- **Segmenting**: 문서를 다음 영역으로 강제 분할합니다.
    - **Header**: 이름, 연락처, 링크(Github/Portfolio), 주소
    - **Experience**: 회사명, 기간, 직무, 주요 성과 (리스트 형태)
    - **Education**: 학교명, 전공, 학위, 졸업 상태
    - **Skills**: 기술 스택, 자격증, 언어 능력

### 2.3 MS Office 특화 레이아웃 복원
- **Shape-to-Text Mapping (PPTX)**: PPT 내의 도형(Shape)들 간의 거리를 계산하여 동일한 맥락의 텍스트 그룹으로 묶습니다.
- **Grid-based Extraction (XLSX)**: 엑셀의 빈 셀과 병합된 셀을 처리하여 데이터의 연속성을 확보합니다.

---

## 3. LLM 기반 초정밀 데이터 추출 (Semantic Extraction)
가장 핵심적인 단계로, 문맥을 이해하여 데이터를 정형화합니다.

### 3.1 LLM 프롬프트 엔지니어링 (Detailed)
단순 요청이 아닌 **시스템 프롬프트**와 **제약 사항**을 엄격히 정의합니다.

**[System Prompt Example]**
> "너는 세계 최고의 이력서 분석 전문가야. 입력된 텍스트에서 다음 JSON 스키마에 맞춰 정보를 추출해. 
> 1. 날짜는 반드시 'YYYY-MM' 형식으로 통일할 것 (현재 진행 중이면 'Present').
> 2. 기술 스택은 공식 명칭으로 정규화할 것 (예: 'js' -> 'JavaScript').
> 3. 경력 기술서에서 'I', 'me'와 같은 1인칭 주어는 제거하고 개조식으로 변환할 것.
> 4. 불확실한 정보는 null로 반환하되 추측하지 말 것."

### 3.2 Chain-of-Thought (CoT) 적용
- 모델에게 "먼저 이 사람의 총 경력 연차를 계산해봐. 그 다음 각 경력의 시작/종료일이 겹치는지 확인해."와 같은 중간 사고 단계를 거치게 하여 논리적 오류를 방지합니다.

---

## 4. 데이터 사후 처리 및 검증 (Post-processing & QA)

### 4.1 데이터 정규화 (Normalization)
- **Job Title Mapping**: 추출된 직무명을 사내 표준 직무 체계(예: Backend Engineer, Product Manager)로 매핑합니다.
- **Organization DB**: 회사명을 DB와 대조하여 정식 명칭으로 보정합니다. (예: '삼성' -> '삼성전자')

### 4.2 신뢰도 점수(Confidence Score) 산출
- LLM이 반환한 데이터의 신뢰도를 0~1 사이로 측정합니다.
- 특정 필드(예: 전화번호)가 누락되거나 날짜 형식이 틀린 경우 점수를 감점합니다.
- **Threshold**: 점수가 0.85 미만인 경우 '수동 검수 필요' 플래그를 생성합니다.

---

## 5. 인프라 및 운영 아키텍처

### 5.1 처리 파이프라인 (Async Pipeline)
- 유저가 파일을 업로드하면 `Celery` 또는 `RabbitMQ`를 통해 비동기로 처리하여 UX 지연을 방지합니다.
- **Caching**: 동일한 파일이 재업로드될 경우 파싱 결과를 캐싱하여 비용을 절감합니다.

### 5.2 모니터링 및 피드백 루프
- **A/B Testing**: 프롬프트 버전을 지속적으로 업데이트하며 인식률 변화를 트래킹합니다.
- **User Feedback**: 유저가 수정한 데이터를 학습 데이터(Fine-tuning)로 활용하여 점진적으로 성능을 개선합니다.

---

## 6. 핵심 체크리스트 (Summary)
1. **[ ]** OCR 전처리(OpenCV)가 적용되었는가?
2. **[ ]** LayoutLMv3를 통한 영역 분할이 수행되었는가?
3. **[ ]** LLM 결과값이 JSON Schema로 엄격히 관리되는가?
4. **[ ]** 신뢰도 기반 수동 검수 프로세스가 존재하는가?

---
> [!IMPORTANT]
> 이력서 인식의 '완벽함'은 한 번의 개발이 아닌, **실제 데이터 기반의 지속적인 프롬프트 튜닝과 피드백 루프**를 통해서만 달성 가능합니다. 위 로드맵에 따라 단계별로 고도화를 진행하십시오.

import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
    checkstyle
}

group = "kr.co.linker"
version = "1.0.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

val langchain4jVersion = "0.35.0"
val jjwtVersion = "0.12.6"
val springdocVersion = "2.5.0"

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // DB
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")

    // LangChain4j
    implementation("dev.langchain4j:langchain4j:$langchain4jVersion")
    implementation("dev.langchain4j:langchain4j-google-ai-gemini:$langchain4jVersion")

    // MinIO (S3 호환)
    implementation("io.minio:minio:8.5.10")

    // Firebase Admin SDK (FCM 푸시 알림)
    implementation("com.google.firebase:firebase-admin:9.3.0")

    // Monitoring
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.micrometer:micrometer-tracing-bridge-brave")

    // API 문서
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:$springdocVersion")

    // TOTP (2FA)
    implementation("com.warrenstrange:googleauth:1.5.0")

    // PDF 생성 (계약서 — OpenPDF, LGPL)
    implementation("com.github.librepdf:openpdf:1.3.30")

    // 이력서 파싱 — PDF 텍스트 추출
    implementation("org.apache.pdfbox:pdfbox:3.0.3")
    // 이력서 파싱 — DOCX 텍스트 추출
    implementation("org.apache.poi:poi-ooxml:5.3.0")
    // 이력서 파싱 — DOC(구형 Word) 텍스트 추출
    implementation("org.apache.poi:poi-scratchpad:5.3.0")

    // Elasticsearch
    implementation("org.springframework.boot:spring-boot-starter-data-elasticsearch")

    // Logstash Logback Encoder (logback-spring.xml에서 사용)
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")

    // 유틸
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // 테스트
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("com.github.tomakehurst:wiremock-standalone:3.0.1")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("-parameters")
}

// Virtual Thread 활성화를 위한 빌드 시 추가 설정 없음 (application.yml에서 관리)

// ── 개발용 시드 데이터 실행 태스크 ────────────────────────────────────────────
tasks.register<Exec>("seedData") {
    group = "database"
    description = "개발·데모 환경 초기 데이터를 DB에 삽입합니다."

    val url = System.getenv("SPRING_DATASOURCE_URL") ?: "jdbc:postgresql://localhost:5432/linker"
    val user = System.getenv("SPRING_DATASOURCE_USERNAME") ?: "linker"
    val pass = System.getenv("SPRING_DATASOURCE_PASSWORD") ?: "linker_password"

    // jdbc:postgresql://host:port/db → psql 형식으로 변환
    val jdbcRegex = Regex("jdbc:postgresql://([^/]+)/(.+)")
    val match = jdbcRegex.find(url)
    val hostPort = match?.groupValues?.get(1) ?: "localhost:5432"
    val dbName = match?.groupValues?.get(2) ?: "linker"
    val (host, port) = if (hostPort.contains(':')) {
        hostPort.split(':').let { it[0] to it[1] }
    } else {
        hostPort to "5432"
    }

    environment("PGPASSWORD", pass)
    commandLine(
        "psql",
        "-h", host, "-p", port,
        "-U", user, "-d", dbName,
        "-f", "src/main/resources/db/seed/seed_data.sql"
    )
    doFirst { logger.lifecycle("시드 데이터 삽입: $host:$port/$dbName") }
}

checkstyle {
    toolVersion = "10.17.0"
    configFile = file("config/checkstyle/checkstyle.xml")
    isIgnoreFailures = false
}

tasks.register<JavaExec>("dbQuery") {
    mainClass.set("kr.co.linker.DbQueryTool")
    classpath = sourceSets["main"].runtimeClasspath
}


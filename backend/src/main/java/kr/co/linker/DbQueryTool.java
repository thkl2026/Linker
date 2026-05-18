package kr.co.linker;

import java.sql.*;

public class DbQueryTool {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://100.80.66.80:5432/linker";
        String user = "postgres";
        String password = "linker123";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String sql = "SELECT file_name, created_at, raw_content FROM resume_analysis_logs ORDER BY created_at DESC LIMIT 1";
            try (PreparedStatement pstmt = conn.prepareStatement(sql);
                 ResultSet rs = pstmt.executeQuery()) {
                
                if (rs.next()) {
                    String content = rs.getString("raw_content");
                    java.nio.file.Files.writeString(java.nio.file.Path.of("db_dump.json"), content);
                    System.out.println("DB 데이터를 db_dump.json 파일로 저장했습니다.");
                } else {
                    System.out.println("DB에 저장된 분석 로그가 없습니다.");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

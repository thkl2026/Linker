package kr.co.linker;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@Disabled("Developer tool for local database table count checking")
public class DbTableCheckTest {

    @Test
    public void printTableCounts() {
        System.out.println("=== DB TABLE COUNT CHECK (DIRECT JDBC) ===");
        
        String url = "jdbc:postgresql://100.80.66.80:5432/linker";
        String user = "postgres";
        String password = "linker123";

        String[] tables = {
            "users",
            "identity_verifications",
            "partner_companies",
            "talent_profiles",
            "talent_experiences",
            "projects",
            "project_opportunities",
            "project_members",
            "contracts",
            "evaluations",
            "interview_records",
            "match_proposals",
            "notices",
            "notifications",
            "peer_reviews",
            "platform_settings",
            "resume_analysis_logs"
        };

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Successfully connected to the database: " + url);

            for (String table : tables) {
                try {
                    String countSql = "SELECT COUNT(*) FROM public." + table;
                    try (ResultSet rs = stmt.executeQuery(countSql)) {
                        if (rs.next()) {
                            int count = rs.getInt(1);
                            System.out.println(String.format("Table [public.%s]: %d rows", table, count));
                            
                            if (count > 0) {
                                System.out.println("  Samples:");
                                String sampleSql = "SELECT * FROM public." + table + " LIMIT 3";
                                try (ResultSet sampleRs = stmt.executeQuery(sampleSql)) {
                                    ResultSetMetaData metaData = sampleRs.getMetaData();
                                    int columnCount = metaData.getColumnCount();
                                    int sampleIdx = 1;
                                    final int maxSamples = 3;
                                    while (sampleRs.next() && sampleIdx <= maxSamples) {
                                        Map<String, Object> row = new HashMap<>();
                                        for (int i = 1; i <= columnCount; i++) {
                                            String columnName = metaData.getColumnName(i);
                                            Object value = sampleRs.getObject(i);
                                            row.put(columnName, value);
                                        }
                                        System.out.println("    " + row.toString());
                                        sampleIdx++;
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    System.out.println(String.format("Table [public.%s]: Failed to query (error: %s)", table, e.getMessage()));
                }
            }
        } catch (Exception e) {
            System.err.println("Database connection failed: " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("=== END OF TABLE CHECK ===");
    }
}


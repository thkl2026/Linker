package kr.co.linker.talent.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

import java.util.List;

@Document(indexName = "talents", createIndex = false)
@Setting(settingPath = "elasticsearch/talent-index-settings.json")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TalentDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer", searchAnalyzer = "korean_analyzer")
    private String name;

    @Field(type = FieldType.Text)
    private String nameEn;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Keyword)
    private String field;

    @Field(type = FieldType.Keyword)
    private String skillGrade;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private String title;

    @Field(type = FieldType.Boolean)
    private boolean deleted;

    @Field(type = FieldType.Boolean)
    private boolean isBlacklisted;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> skills;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> companyNames;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> projectNames;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> roles;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> techStacks;

    @Field(type = FieldType.Text, analyzer = "korean_analyzer")
    private List<String> descriptions;
}

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  User,
  MapPin,
  Briefcase,
  TrendingUp,
  FileText,
  Plus,
  Check,
  ChevronDown,
} from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useJobs } from "@/providers/JobProvider";
import { SkillPill } from "@/components/SkillPill";
import { UserProfile, ExperienceLevel } from "@/types";
import { extractResumeFirstName } from "@/utils/profile";

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useJobs();
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [newSkill, setNewSkill] = useState("");
  const [showResumePaste, setShowResumePaste] = useState(false);
  const [resumeInput, setResumeInput] = useState("");
  const [showExpDropdown, setShowExpDropdown] = useState(false);

  const handleEdit = useCallback(() => {
    setDraft(profile);
    setEditMode(true);
  }, [profile]);

  const handleSave = useCallback(() => {
    updateProfile(draft);
    setEditMode(false);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [draft, updateProfile]);

  const handleCancel = useCallback(() => {
    setDraft(profile);
    setEditMode(false);
  }, [profile]);

  const addSkill = useCallback(() => {
    const trimmed = newSkill.trim();
    if (trimmed && !draft.skills.includes(trimmed)) {
      setDraft((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setNewSkill("");
    }
  }, [newSkill, draft.skills]);

  const removeSkill = useCallback((skill: string) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  }, []);

  const parseResume = useCallback(() => {
    if (!resumeInput.trim()) return;

    const text = resumeInput.toLowerCase();
    const parsedProfile: Partial<UserProfile> = {
      firstName: extractResumeFirstName(resumeInput),
    };

    const techSkills = [
      "React",
      "React Native",
      "TypeScript",
      "JavaScript",
      "Python",
      "Java",
      "Swift",
      "Kotlin",
      "Node.js",
      "GraphQL",
      "SQL",
      "PostgreSQL",
      "MongoDB",
      "AWS",
      "Docker",
      "Kubernetes",
      "Git",
      "CI/CD",
      "HTML",
      "CSS",
      "Vue.js",
      "Angular",
      "Flutter",
      "Go",
      "Rust",
      "C++",
      "Ruby",
      "Redis",
      "Elasticsearch",
      "Terraform",
      "Linux",
      "Figma",
    ];

    const foundSkills = techSkills.filter((skill) =>
      text.includes(skill.toLowerCase()),
    );
    if (foundSkills.length > 0) {
      parsedProfile.skills = foundSkills;
    }

    const titlePatterns = [
      /senior\s+[\w\s]+(?:developer|engineer|designer)/i,
      /lead\s+[\w\s]+(?:developer|engineer|designer)/i,
      /(?:junior|mid|senior)\s+[\w\s]+(?:developer|engineer)/i,
      /(?:software|frontend|backend|full.?stack|mobile|ios|android)\s+(?:developer|engineer)/i,
      /(?:product|ux|ui)\s+designer/i,
      /(?:data|ml|machine learning)\s+(?:scientist|engineer|analyst)/i,
      /devops\s+engineer/i,
      /engineering\s+manager/i,
    ];

    for (const pattern of titlePatterns) {
      const match = resumeInput.match(pattern);
      if (match) {
        parsedProfile.jobTitle = match[0]
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        break;
      }
    }

    if (
      text.includes("senior") ||
      text.includes("5+ years") ||
      text.includes("7+ years")
    ) {
      parsedProfile.experienceLevel = "senior";
    } else if (
      text.includes("lead") ||
      text.includes("manager") ||
      text.includes("10+ years")
    ) {
      parsedProfile.experienceLevel = "lead";
    } else if (
      text.includes("junior") ||
      text.includes("entry") ||
      text.includes("1+ year")
    ) {
      parsedProfile.experienceLevel = "entry";
    } else {
      parsedProfile.experienceLevel = "mid";
    }

    setDraft((prev) => ({
      ...prev,
      ...parsedProfile,
      resumeText: resumeInput,
    }));

    setShowResumePaste(false);
    setResumeInput("");
    setEditMode(true);

    Alert.alert(
      "Resume Parsed",
      `Found ${foundSkills.length} skills${parsedProfile.jobTitle ? ` and detected title: ${parsedProfile.jobTitle}` : ""}. Review and save your profile.`,
    );
  }, [resumeInput]);

  const hasProfile =
    profile.firstName || profile.jobTitle || profile.skills.length > 0;
  const showEmptyProfile = !hasProfile && !editMode && !showResumePaste;

  const expLabel =
    EXPERIENCE_OPTIONS.find(
      (o) =>
        o.value ===
        (editMode ? draft.experienceLevel : profile.experienceLevel),
    )?.label ?? "Select";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={[
          styles.scrollContent,
          showEmptyProfile && styles.emptyScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!editMode ? (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setShowResumePaste(true)}
                style={styles.resumeBtn}
              >
                <FileText size={16} color={Colors.dark.accent} />
                <Text style={styles.resumeBtnText}>Paste Resume</Text>
              </Pressable>
              <Pressable onPress={handleEdit} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerActions}>
              <Pressable onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Check size={16} color={Colors.dark.background} />
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        {showResumePaste && (
          <View style={styles.resumeSection}>
            <Text style={styles.resumeTitle}>Paste Your Resume</Text>
            <Text style={styles.resumeSubtitle}>
              We'll extract your job title, skills, and experience level
            </Text>
            <TextInput
              style={styles.resumeInput}
              multiline
              numberOfLines={8}
              placeholder="Paste your resume text here..."
              placeholderTextColor={Colors.dark.textMuted}
              value={resumeInput}
              onChangeText={setResumeInput}
              textAlignVertical="top"
            />
            <View style={styles.resumeActions}>
              <Pressable
                onPress={() => {
                  setShowResumePaste(false);
                  setResumeInput("");
                }}
                style={styles.resumeCancelBtn}
              >
                <Text style={styles.resumeCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={parseResume}
                style={[
                  styles.resumeParseBtn,
                  !resumeInput.trim() && styles.resumeParseBtnDisabled,
                ]}
                disabled={!resumeInput.trim()}
              >
                <Text style={styles.resumeParseText}>Parse Resume</Text>
              </Pressable>
            </View>
          </View>
        )}

        {showEmptyProfile ? (
          <View style={styles.emptyProfile}>
            <View style={styles.emptyIcon}>
              <User size={40} color={Colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Set Up Your Profile</Text>
            <Text style={styles.emptySubtitle}>
              Add your job preferences to see personalized results, or paste
              your resume to auto-fill your info.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable onPress={handleEdit} style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>Enter Manually</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowResumePaste(true)}
                style={styles.secondaryAction}
              >
                <FileText size={16} color={Colors.dark.tint} />
                <Text style={styles.secondaryActionText}>Paste Resume</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <User size={16} color={Colors.dark.tint} />
                <Text style={styles.labelText}>First Name</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={draft.firstName}
                  onChangeText={(firstName) =>
                    setDraft((p) => ({ ...p, firstName }))
                  }
                  placeholder="Your first name"
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  testID="first-name-input"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.firstName || "Not set"}
                </Text>
              )}
            </View>
            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Briefcase size={16} color={Colors.dark.tint} />
                <Text style={styles.labelText}>Job Title</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={draft.jobTitle}
                  onChangeText={(t) => setDraft((p) => ({ ...p, jobTitle: t }))}
                  placeholder="e.g. Senior React Native Developer"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.jobTitle || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <MapPin size={16} color={Colors.dark.tint} />
                <Text style={styles.labelText}>Location</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={draft.location}
                  onChangeText={(t) => setDraft((p) => ({ ...p, location: t }))}
                  placeholder="e.g. San Francisco, CA"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.location || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <TrendingUp size={16} color={Colors.dark.tint} />
                <Text style={styles.labelText}>Experience Level</Text>
              </View>
              {editMode ? (
                <View>
                  <Pressable
                    onPress={() => setShowExpDropdown(!showExpDropdown)}
                    style={styles.dropdown}
                  >
                    <Text style={styles.dropdownText}>{expLabel}</Text>
                    <ChevronDown size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                  {showExpDropdown && (
                    <View style={styles.dropdownMenu}>
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => {
                            setDraft((p) => ({
                              ...p,
                              experienceLevel: opt.value,
                            }));
                            setShowExpDropdown(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            draft.experienceLevel === opt.value &&
                              styles.dropdownItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              draft.experienceLevel === opt.value &&
                                styles.dropdownItemTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{expLabel}</Text>
              )}
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Text style={styles.labelText}>Skills</Text>
              </View>
              <View style={styles.skillsWrap}>
                {(editMode ? draft.skills : profile.skills).map((skill) => (
                  <SkillPill
                    key={skill}
                    label={skill}
                    onRemove={editMode ? () => removeSkill(skill) : undefined}
                  />
                ))}
                {(editMode ? draft.skills : profile.skills).length === 0 && (
                  <Text style={styles.emptySkills}>No skills added</Text>
                )}
              </View>
              {editMode && (
                <View style={styles.addSkillRow}>
                  <TextInput
                    style={styles.addSkillInput}
                    value={newSkill}
                    onChangeText={setNewSkill}
                    placeholder="Add a skill..."
                    placeholderTextColor={Colors.dark.textMuted}
                    onSubmitEditing={addSkill}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={addSkill}
                    style={[
                      styles.addSkillBtn,
                      !newSkill.trim() && styles.addSkillBtnDisabled,
                    ]}
                    disabled={!newSkill.trim()}
                  >
                    <Plus size={18} color={Colors.dark.background} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  editBtn: {
    backgroundColor: Colors.dark.tintLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.tint,
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resumeBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.accent,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
  resumeSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  resumeTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  resumeSubtitle: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  resumeInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.dark.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  resumeActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  resumeCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resumeCancelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  resumeParseBtn: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resumeParseBtnDisabled: {
    opacity: 0.4,
  },
  resumeParseText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#fff",
  },
  emptyProfile: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyActions: {
    gap: 12,
    width: "100%",
  },
  primaryAction: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.dark.tint,
  },
  form: {
    paddingHorizontal: 16,
    gap: 20,
  },
  field: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.dark.text,
    fontWeight: "500" as const,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  dropdownItemActive: {
    backgroundColor: Colors.dark.tintLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  dropdownItemTextActive: {
    color: Colors.dark.tint,
    fontWeight: "600" as const,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  emptySkills: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
  },
  addSkillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  addSkillInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  addSkillBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  addSkillBtnDisabled: {
    opacity: 0.4,
  },
});

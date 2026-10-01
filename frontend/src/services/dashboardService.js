// Dashboard service

import { get } from "./api";

const withExamId = (exam) => {
  if (!exam || typeof exam !== "object") {
    return exam;
  }

  const id = exam.id || exam._id;

  return id ? { ...exam, id: String(id) } : exam;
};

const normalizeStudentDashboard = (response) => {
  const payload = response?.data ?? response;

  return {
    student: payload?.student ?? null,

    summary: {
      creditsCompleted:
        typeof payload?.student?.creditsCompleted === "number"
          ? payload.student.creditsCompleted
          : "N/A",

      totalCredits:
        typeof payload?.student?.totalCredits === "number"
          ? payload.student.totalCredits
          : "N/A",

      creditsDelta: "",

      gpa:
        typeof payload?.student?.gpa === "number"
          ? payload.student.gpa
          : "N/A",

      maxGpa: "N/A",

      gpaDelta: "",

      activeExamsCount:
        payload?.upcomingExams?.length ?? 0,

      totalEnrolledCourses: "N/A"
    },

    nextExam:
      payload?.upcomingExams?.[0] ?? null,

    upcomingExams:
      Array.isArray(payload?.upcomingExams)
        ? payload.upcomingExams.map(withExamId)
        : [],

    recentResults:
      Array.isArray(payload?.recentResults)
        ? payload.recentResults.map(withExamId)
        : [],

    performanceHistory: [],

    recentAnnouncements:
      Array.isArray(payload?.announcements)
        ? payload.announcements.map(withExamId)
        : []
  };
};

const normalizeAdminDashboard = (response) => {
  const payload = response?.data ?? response;
  const statistics = payload?.statistics ?? {};

  return {
    stats: {
      totalStudents:
        statistics.totalStudents ?? 0,

      totalStudentsDelta: "",

      totalExams:
        statistics.totalExams ?? 0,

      totalExamsDelta: "",

      upcomingExams:
        statistics.upcomingExams ?? 0,

      upcomingDelta: "",

      completedExams:
        statistics.completedExams ?? 0,

      completedDelta: "",

      resultsPublished:
        statistics.publishedResults ?? 0,

      resultsTotal:
        statistics.publishedResults ?? 0,

      resultsDelta: "",

      totalAnnouncements:
        statistics.totalAnnouncements ?? 0,

      activeAnnouncementsDelta: "",

      totalSubjects: typeof statistics.totalSubjects === "number" ? statistics.totalSubjects : undefined,
      totalRooms: typeof statistics.totalRooms === "number" ? statistics.totalRooms : undefined,
      subjectsScheduled: typeof statistics.subjectsScheduled === "number" ? statistics.subjectsScheduled : undefined,
      conflicts: typeof statistics.conflicts === "number" ? statistics.conflicts : undefined,
      roomsAllocated: typeof statistics.roomsAllocated === "number" ? statistics.roomsAllocated : undefined,
      currentExamination: statistics.currentExamination || null,
    },

    recentExams:
      Array.isArray(payload?.recentExams)
        ? payload.recentExams.map(withExamId)
        : [],

    recentResults:
      Array.isArray(payload?.recentResults)
        ? payload.recentResults.map(withExamId)
        : [],

    recentAnnouncements:
      Array.isArray(payload?.recentAnnouncements)
        ? payload.recentAnnouncements
        : [],

    recentActivities:
      Array.isArray(payload?.recentActivities)
        ? payload.recentActivities.map((act) => ({
            id: act.id || act._id,
            action: act.action,
            entity: act.entity,
            description: act.description,
            actor: act.user?.name || "System",
            timestamp: act.createdAt,
            status: "Completed",
          }))
        : [],

    examTrends:
      Array.isArray(payload?.examTrends)
        ? payload.examTrends.map((trend) => ({
            term: trend.label,
            scheduled: trend.scheduled,
            completed: trend.completed,
          }))
        : [],

    upcomingSchedule: Array.isArray(payload?.upcomingExams)
      ? payload.upcomingExams.map(withExamId)
      : []
  };
};

export const dashboardService = {
  // Get student dashboard
  async getStudentDashboard() {
    const response = await get("/dashboard/student");

    return {
      success: true,
      data: normalizeStudentDashboard(response),
      message: response?.message || ""
    };
  },

  // Get admin dashboard
  async getAdminDashboard() {
    const response = await get("/dashboard/admin");

    return {
      success: true,
      data: normalizeAdminDashboard(response),
      message: response?.message || ""
    };
  }
};
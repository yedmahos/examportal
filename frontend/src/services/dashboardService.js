// Dashboard service

import { get } from "./api";

const normalizeStudentDashboard = (response) => {
  const payload = response?.data ?? response;

  return {
    student: payload?.student ?? null,

    summary: {
      creditsCompleted:
        payload?.student?.creditsCompleted || "N/A",

      totalCredits:
        payload?.student?.totalCredits || "N/A",

      creditsDelta: "",

      gpa: "N/A",

      maxGpa: 4,

      gpaDelta: "",

      activeExamsCount:
        payload?.upcomingExams?.length ?? 0,

      totalEnrolledCourses: 0
    },

    nextExam:
      payload?.upcomingExams?.[0] ?? null,

    upcomingExams:
      Array.isArray(payload?.upcomingExams)
        ? payload.upcomingExams
        : [],

    recentResults:
      Array.isArray(payload?.recentResults)
        ? payload.recentResults
        : [],

    performanceHistory: [],

    recentAnnouncements:
      Array.isArray(payload?.announcements)
        ? payload.announcements
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

      activeAnnouncementsDelta: ""
    },

    recentExams:
      Array.isArray(payload?.recentExams)
        ? payload.recentExams
        : [],

    recentResults:
      Array.isArray(payload?.recentResults)
        ? payload.recentResults
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

    upcomingSchedule: []
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
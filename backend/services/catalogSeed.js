const ExamType = require("../models/ExamType");
const ExamSession = require("../models/ExamSession");

const BUILT_IN_EXAM_TYPES = [
    {
        name: "Internal Assessment",
        code: "IA",
        description: "Internal assessment examination"
    },
    {
        name: "Mid-Term",
        code: "MID",
        description: "Mid-term examination"
    },
    {
        name: "End Semester",
        code: "END",
        description: "End semester examination"
    },
    {
        name: "Practical Examination",
        code: "PRAC",
        description: "Practical examination"
    },
    {
        name: "Viva",
        code: "VIVA",
        description: "Viva examination"
    },
    {
        name: "Supplementary Examination",
        code: "SUPP",
        description: "Supplementary examination"
    },
    {
        name: "Backlog Examination",
        code: "BACK",
        description: "Backlog examination"
    },
    {
        name: "Re-examination",
        code: "REEX",
        description: "Re-examination"
    },
    {
        name: "Model Examination",
        code: "MODEL",
        description: "Model examination"
    }
];

const BUILT_IN_SESSIONS = [
    {
        name: "Morning",
        code: "MORNING",
        reportingTime: "08:30",
        startTime: "09:00",
        endTime: "12:00",
        duration: 180
    },
    {
        name: "Afternoon",
        code: "AFTERNOON",
        reportingTime: "13:30",
        startTime: "14:00",
        endTime: "17:00",
        duration: 180
    }
];

const ensureCatalog = async () => {
    for (const item of BUILT_IN_EXAM_TYPES) {
        const existing = await ExamType.findOne({ code: item.code });

        if (!existing) {
            await ExamType.create({
                ...item,
                isCustom: false,
                status: "active"
            });
        }
    }

    for (const item of BUILT_IN_SESSIONS) {
        const existing = await ExamSession.findOne({ code: item.code });

        if (!existing) {
            await ExamSession.create({
                ...item,
                isCustom: false,
                status: "active",
                availability: {
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                }
            });
        }
    }
};

module.exports = {
    ensureCatalog,
    BUILT_IN_EXAM_TYPES,
    BUILT_IN_SESSIONS
};

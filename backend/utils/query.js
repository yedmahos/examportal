const parseSemester = (value) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
};

const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parsePagination = (query = {}, defaultLimit = 10) => {
    const parsedPage = parseInt(query.page, 10);
    const parsedLimit = parseInt(query.limit, 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    let limit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : defaultLimit;

    if (limit > 100) {
        limit = 100;
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
};

const paginationMeta = ({ page, limit, total }) => {
    const safeTotal = Number.isFinite(total) ? total : 0;

    return {
        page,
        limit,
        total: safeTotal,
        count: safeTotal,
        totalPages: Math.max(1, Math.ceil(safeTotal / limit) || 1)
    };
};

module.exports = {
    parseSemester,
    escapeRegex,
    parsePagination,
    paginationMeta
};

export class QueryBuilderError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "QueryBuilderError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Builds search queries from a resume's profile fields.
 * Never sends resume text, name, email or phone to any provider.
 *
 * @param {Object} resume - Resume document or profile projection
 * @returns {Array<{ what: string, where: string, level: string, isRemote: boolean }>}
 */
export function buildQueries(resume) {
  if (!resume) {
    throw new QueryBuilderError("NOT_FOUND", "Resume not found", 404);
  }

  const roleTitles = Array.isArray(resume.roleTitles)
    ? resume.roleTitles.map((r) => String(r || "").trim()).filter(Boolean)
    : [];

  const skills = Array.isArray(resume.skills)
    ? resume.skills.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

  if (roleTitles.length === 0 && skills.length === 0) {
    throw new QueryBuilderError(
      "NO_CRITERIA",
      "Add skills or role titles to this resume first",
      400
    );
  }

  const rawLocation = String(resume.locationPreference || "").trim();
  const isRemote = /remote/i.test(rawLocation);
  const where = isRemote ? "" : rawLocation;

  const isFresherOrStudent =
    resume.experienceYears === 0 ||
    resume.experienceYears === null ||
    resume.experienceYears === undefined;

  const queries = [];

  if (roleTitles.length > 0) {
    const firstRole = roleTitles[0];
    const secondRole = roleTitles[1] || null;

    if (isFresherOrStudent) {
      const alreadyHasEntryWord = /\b(intern|internship|fresher|junior|trainee|graduate)\b/i.test(firstRole);
      const entryVariant = alreadyHasEntryWord ? firstRole : `${firstRole} intern`;

      queries.push({
        what: entryVariant,
        where,
        level: "fresher",
        isRemote,
      });

      if (secondRole) {
        queries.push({
          what: secondRole,
          where,
          level: "all",
          isRemote,
        });
      } else if (!alreadyHasEntryWord) {
        queries.push({
          what: `${firstRole} fresher`,
          where,
          level: "fresher",
          isRemote,
        });
      }
    } else {
      queries.push({
        what: firstRole,
        where,
        level: "experienced",
        isRemote,
      });

      if (secondRole) {
        queries.push({
          what: secondRole,
          where,
          level: "experienced",
          isRemote,
        });
      }
    }
  } else {
    // Fallback: up to 3 top skills
    const fallbackQuery = skills.slice(0, 3).join(" ");
    queries.push({
      what: fallbackQuery,
      where,
      level: isFresherOrStudent ? "fresher" : "experienced",
      isRemote,
    });
  }

  // Cap queries to max provider capacity (2 queries)
  return queries.slice(0, 2);
}

export default {
  buildQueries,
  QueryBuilderError,
};

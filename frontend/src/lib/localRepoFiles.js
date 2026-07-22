const FILE_COUNT_FORMATTER = new Intl.NumberFormat('en-US');

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function nonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * Read the advisory max_files value from a scan configuration draft.
 *
 * CreateScan stores the draft as JSON text, while callers that already parsed
 * configuration may provide an object. Invalid JSON and non-positive or
 * non-integer values intentionally mean "no comparable limit".
 */
export function configuredMaxFiles(configuration) {
  let parsed = configuration;
  if (typeof configuration === 'string') {
    if (!configuration.trim()) return null;
    try {
      parsed = JSON.parse(configuration);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return positiveSafeInteger(parsed.max_files);
}

/**
 * Derive copy and comparison metadata for a selected local repository.
 *
 * max_files is workflow guidance rather than an engine-enforced limit, so all
 * returned language remains advisory. When complete is false, fileCount is a
 * lower bound: it can prove that a repository is over the configured value,
 * but it cannot prove that the repository is within it.
 */
export function localRepoFilePreflight(fileCount, maxFiles, { complete = true } = {}) {
  const count = nonNegativeSafeInteger(fileCount);
  if (count === null) return null;

  const limit = positiveSafeInteger(maxFiles);
  const countText = FILE_COUNT_FORMATTER.format(count);
  const exact = complete === true;
  const countLabel = exact ? countText : `At least ${countText}`;

  if (limit === null) {
    return {
      kind: 'advisory',
      fileCount: count,
      maxFiles: null,
      complete: exact,
      isOverLimit: false,
      remaining: null,
      overBy: null,
      summary: `${countLabel} files`,
      detail: exact
        ? 'Set a positive whole-number max_files value in Configuration to compare this count.'
        : 'The count stopped early. Set a positive whole-number max_files value in Configuration to compare its lower bound.',
    };
  }

  const limitText = FILE_COUNT_FORMATTER.format(limit);
  const summary = `${countLabel} / ${limitText} files`;

  if (!exact && count <= limit) {
    return {
      kind: 'advisory',
      fileCount: count,
      maxFiles: limit,
      complete: false,
      isOverLimit: false,
      remaining: null,
      overBy: null,
      summary,
      detail:
        count === limit
          ? 'The count stopped at the configured max_files value, so this folder may be over it.'
          : 'The count stopped early, so this lower bound cannot confirm that the folder is within max_files.',
    };
  }

  if (count > limit) {
    const overBy = count - limit;
    const overText = FILE_COUNT_FORMATTER.format(overBy);
    return {
      kind: 'over_limit',
      fileCount: count,
      maxFiles: limit,
      complete: exact,
      isOverLimit: true,
      remaining: null,
      overBy,
      summary,
      detail: exact
        ? `This folder is ${overText} files over max_files. Workflows that treat it as a limit may fail or skip files.`
        : `This folder is at least ${overText} files over max_files. Workflows that treat it as a limit may fail or skip files.`,
    };
  }

  if (count === limit) {
    return {
      kind: 'at_limit',
      fileCount: count,
      maxFiles: limit,
      complete: true,
      isOverLimit: false,
      remaining: 0,
      overBy: null,
      summary,
      detail: 'This folder is at the configured max_files advisory.',
    };
  }

  const remaining = limit - count;
  return {
    kind: 'within',
    fileCount: count,
    maxFiles: limit,
    complete: true,
    isOverLimit: false,
    remaining,
    overBy: null,
    summary,
    detail: `${FILE_COUNT_FORMATTER.format(remaining)} files remain below the configured max_files advisory.`,
  };
}

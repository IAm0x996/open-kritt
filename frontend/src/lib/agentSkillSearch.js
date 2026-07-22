function searchableText(skill) {
  return [skill?.name, skill?.description, skill?.slug, skill?.licenseSpdx]
    .filter((value) => typeof value === 'string' && value)
    .join('\n')
    .toLowerCase();
}

export function filterAgentSkills(skills, query) {
  const collection = Array.isArray(skills) ? skills : [];
  const terms = `${query ?? ''}`.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) return collection;
  return collection.filter((skill) => {
    const text = searchableText(skill);
    return terms.every((term) => text.includes(term));
  });
}

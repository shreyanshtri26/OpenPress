const EDITORIAL = ['Raise a story', 'Ideas', 'In progress', 'In review', 'Ready to publish', 'Published'];
const LIBRARY = ['Media upload', 'Media access'];
const ADMIN = ['Users', 'Roles'];
const grant = (rows, actions) => Object.fromEntries(rows.map((r) => [r, Object.fromEntries(['Create', 'Open', 'Edit', 'Decide'].map((a) => [a, actions.includes(a)]))]));
const ALL = ['Create', 'Open', 'Edit', 'Decide'];
export const ROLES = {
  'Super User': { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL), admin: grant(ADMIN, ALL) },
  Admin: { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL), admin: grant(ADMIN, ALL) },
  Editor: { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL) },
  Reporter: { editorial: grant(['Raise a story', 'Ideas', 'In progress'], ['Create', 'Open', 'Edit']), library: grant(LIBRARY, ['Create', 'Open']) },
};


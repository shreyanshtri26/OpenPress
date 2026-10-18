import {
  ACTION_FIELDS,
  DEFAULT_ROLE_PERMISSION_SELECTIONS,
  ROLE_TABS,
  SECTION_ROWS,
  TAXONOMY_STATUSES,
} from "./constants";

export const createSectionState = (rows, defaults = {}) =>
  rows.reduce((rowAcc, row) => {
    const defaultRow = defaults[row] || {};
    rowAcc[row] = ACTION_FIELDS.reduce((fieldAcc, field) => {
      fieldAcc[field] = Boolean(defaultRow[field]);
      return fieldAcc;
    }, {});
    return rowAcc;
  }, {});

export const createInitialRolePermissions = (tabs = ROLE_TABS) =>
  tabs.reduce((roleAcc, tab) => {
    const roleDefaults = DEFAULT_ROLE_PERMISSION_SELECTIONS[tab.key] || {};
    roleAcc[tab.key] = Object.entries(SECTION_ROWS).reduce(
      (sectionAcc, [sectionId, rows]) => {
        sectionAcc[sectionId] = createSectionState(rows, roleDefaults[sectionId]);
        return sectionAcc;
      },
      {}
    );
    return roleAcc;
  }, {});

export const createEmptyTaxonomySelection = (
  statuses = TAXONOMY_STATUSES
) =>
  statuses.reduce((acc, status) => {
    acc[status.key] = false;
    return acc;
  }, {});

export const createInitialTaxonomySelections = (
  groups,
  statuses = TAXONOMY_STATUSES
) =>
  groups.reduce((acc, group) => {
    acc[group.id] = createEmptyTaxonomySelection(statuses);
    return acc;
  }, {});

// src/components/settings/constants.js
export const SETTINGS_TABS = [
  { key: "users", label: "Users" },
  { key: "authors", label: "Authors" },
  { key: "roles", label: "Roles" },
  { key: "taxonomy", label: "Taxonomy" },
  { key: "placement", label: "Placement" },
];

export const TAXONOMY_STATUSES = [
  { key: "raise-a-story", label: "Raise a story" },
  { key: "ideas", label: "Ideas" },
  { key: "in-progress", label: "In progress" },
  { key: "in-review", label: "In review" },
  { key: "ready-to-publish", label: "Ready to publish" },
  { key: "published", label: "Published" },
  { key: "more-story-card", label: "More Story Card" },
  { key: "thumbnail-grid", label: "Thumbnail Grid" },
];

export const DEFAULT_TAXONOMY_GROUPS = [
  {
    id: "category",
    name: "Category",
    values: [
      "Category 1",
      "Category 2",
      "Category 3",
      "Category 4",
      "Category 5",
      "Category 6",
      "Category 7",
    ],
  },
  {
    id: "section",
    name: "Section",
    values: ["Section 1", "Section 2", "Section 3", "Section 4"],
  },
  {
    id: "author",
    name: "Author",
    values: ["Author 1", "Author 2", "Author 3", "Author 4"],
  },
];

export const ROLE_TABS = [
  { key: "editor", label: "Editor" },
  { key: "reporter", label: "Reporter" },
  { key: "super-user", label: "Super user" },
];

export const ROLE_ACCORDION_ITEMS = [
  { id: "editorial", title: "Editorial" },
  { id: "library", title: "Media" },
  { id: "admin", title: "Admin" },
];

export const ROLE_ACCORDION_TITLES = ROLE_ACCORDION_ITEMS.reduce((acc, item) => {
  acc[item.id] = item.title;
  return acc;
}, {});

export const PERMISSION_FIELDS = [
  "Status",
  "Create",
  "Open",
  "Edit",
  // "Collaborate",
  "Decide",
  // "Delete",
];

export const ACTION_FIELDS = PERMISSION_FIELDS.slice(1);

const EDITORIAL_ROWS = [
  "Raise a story",
  "Ideas",
  "In progress",
  "In review",
  "Ready to publish",
  "Published",
];

const LIBRARY_ROWS = ["Media upload", "Media access"];

const ADMIN_ROWS = ["Users", "Roles"];

export const SECTION_ROWS = {
  editorial: EDITORIAL_ROWS,
  library: LIBRARY_ROWS,
  admin: ADMIN_ROWS,
};

export const DEFAULT_ROLE_PERMISSION_SELECTIONS = {
  editor: {
    editorial: {
      "Raise a story": {
        Create: true,
      },
    },
  },
};

export const ROLE_OPTIONS = ["Admin", "Editor", "Journalist", "Viewer"].map((value) => ({
  value,
  label: value,
}));

export const STATUS_OPTIONS = ["Active", "Inactive"].map((value) => ({
  value,
  label: value,
}));

const now = Date.now();
const baseUsers = [
  { id: 1, name: "Alice Johnson", email: "alice.johnson@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Brandon Lee", email: "brandon.lee@example.com", role: "Editor", status: "Active" },
  { id: 3, name: "Chloe Rivera", email: "chloe.rivera@example.com", role: "Journalist", status: "Inactive" },
  { id: 4, name: "Derrick Chen", email: "derrick.chen@example.com", role: "Viewer", status: "Active" },
  { id: 5, name: "Evelyn Smith", email: "evelyn.smith@example.com", role: "Editor", status: "Active" },
];

export const SEED_USERS = baseUsers.map((user, index) => ({
  ...user,
  createdAt: now - index,
}));

export const SEED_PLACEMENTS = [
  { id: 1, name: "Leaderboard", type: "Display", dimension: "728x90", fillPriority: 1, status: "Active" },
  { id: 2, name: "Sidebar Rectangle", type: "Display", dimension: "300x250", fillPriority: 2, status: "Active" },
  { id: 3, name: "In-Story Ad", type: "Display", dimension: "728x90", fillPriority: 3, status: "Active" },
  { id: 4, name: "Mobile Leaderboard", type: "Display", dimension: "320x50", fillPriority: 1, status: "Active" },
];

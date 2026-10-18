import { prioritizeMostReadStories } from '../mostReadStories';
import { ColorSelect } from '../fields/ColorSelect';
import {
  getStoryOptions,
  getStories,
  getMoreStoryCardTaxonomyGroups,
  initializeMoreStoryCardTaxonomyOptions,
  findStoryById,
  type Story,
} from '../storyData';
import PopularBlogCard from './blogPopularCard';
import BlogRecomCard from './BlogRecomCard';
import BlogShowcaseCard from './BlogShowcaseCard';
import blogHeading, { type HeadingProps } from './blogHeading';
import BlogTitle from './BlogTitle';
import { BlogImageCard } from './BlogImageCard';
import { BlogGrid } from './BlogGrid';
import ShareCard from './ShareCard';
import { BlogBodyCard } from './BlogBodyCard';
import BlogSubHeading from './BlogSubHeading';
import type { BlogSubHeadingProps } from './BlogSubHeading';
import BlogMainTitle from './BlogMainTitle';
import type { BlogMainTitleProps } from './BlogMainTitle';
import { BlogPostCard } from './BlogPostCard';
import BlogMoreStoriesCard from './BlogMoreStoriesCard';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isAllSelection(value: unknown): boolean {
  const normalized = normalizeString(value);
  return !normalized || normalized === 'all' || normalized.startsWith('all ');
}

function taxonomyFieldKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `autoTaxonomy_${slug || 'unknown'}`;
}

function storyMatchesMoreStoryTaxonomy(
  story: Story,
  selectedTaxonomyName: string,
  selectedTaxonomyValue: string
): boolean {
  const taxonomyName = normalizeString(selectedTaxonomyName);
  const selectedValue = normalizeString(selectedTaxonomyValue);
  if (!taxonomyName || isAllSelection(selectedTaxonomyValue) || !selectedValue) return true;

  const candidateValues = new Set<string>();
  const addCandidate = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = normalizeString(item);
        if (normalized) candidateValues.add(normalized);
      });
      return;
    }
    const normalized = normalizeString(value);
    if (normalized) candidateValues.add(normalized);
  };

  if (taxonomyName === 'section') {
    addCandidate(story.section);
  } else if (taxonomyName === 'category') {
    addCandidate(story.taxonomyCategories);
    addCandidate(story.taxonomyCategory);
    addCandidate(story.category);
  } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
    addCandidate(story.authorName);
    addCandidate(story.author);
    addCandidate(story.byLine);
    addCandidate((story as Record<string, unknown>).byline);
  }

  const rawStory = story as Record<string, unknown>;
  const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
  Object.entries(rawStory).forEach(([key, value]) => {
    if (key.replace(/\s+/g, '').toLowerCase() === normalizedTaxonomyKey) addCandidate(value);
  });

  return candidateValues.has(selectedValue);
}


const blogCardConfig = {
  label: 'Popular Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    items: {
      label: 'Card Items',
      type: 'array',
      arrayFields: {
        number: {
          label: 'Rank Number',
          type: 'number'
        },
        storyId: {
          label: 'Select Story',
          type: 'select',
          get options() {
            return getStoryOptions();
          },
        },
        text: {
          label: 'Fallback Text',
          type: 'textarea',
          placeholder: 'Enter fallback text (used if no story selected)',
        },
      },
    },
  },
  defaultProps: {
    id: 'popular-single-column-card',
    items: [
      {
        number: 1,
        storyId: getStoryOptions()[0]?.value || '',
        text: 'A Government Shutdown, Weaponized',
      },
      {
        number: 2,
        storyId: getStoryOptions()[1]?.value || '',
        text: 'New Frontiers of AI',
      },
      {
        number: 3,
        storyId: getStoryOptions()[2]?.value || '',
        text: 'The Future of Work',
      },
      {
        number: 4,
        storyId: getStoryOptions()[3]?.value || '',
        text: 'Climate Change and Our Future',
      },
    ],
  },
  render: (props: {
    id?: string;
    items?: Array<{ number: number; text: string; storyId?: string }>;
  }) => <PopularBlogCard {...props} />,
};


const blogRecomCardConfig = {
  label: 'Recommend Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
  },
  defaultProps: {
    id: 'blog-recommend-card',
    storyId: getStoryOptions()[0]?.value || '',
  },
  render: (props: {
    id?: string;
    storyId?: string;
  }) => <BlogRecomCard {...props} />,
};

const blogShowcaseCardConfig = {
  label: 'Showcase Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    items: {
      label: 'Showcase Items',
      type: 'array',
      arrayFields: {
        storyId: {
          label: 'Select Story',
          type: 'select',
          get options() {
            return getStoryOptions();
          },
        },
        title: {
          label: 'Title',
          type: 'text',
          placeholder: 'Enter title (optional, will use story title if empty)',
        },
        category: {
          label: 'Category',
          type: 'text',
          placeholder: 'Enter category (optional)',
        },
      },
    },
  },
  defaultProps: {
    id: 'blog-showcase-card',
    items: [
      {
        storyId: getStoryOptions()[0]?.value || '',
        title: 'Featured Story',
        category: 'Category',
      },
    ],
  },
  render: (props: {
    id?: string;
    items?: Array<{ storyId?: string; title?: string; category?: string }>;
  }) => <BlogShowcaseCard {...props} />,
};

const blogHeadingConfig = {
  label: 'Heading',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    text: {
      label: 'Heading text',
      type: 'textarea',
      placeholder: 'Enter heading text',
      contentEditable: true
    },
    size: {
      label: 'Text size',
      type: 'select',
      options: [
        { label: 'XXXL', value: 'xxxl' },
        { label: 'XXL', value: 'xxl' },
        { label: 'XL', value: 'xl' },
        { label: 'L', value: 'l' },
        { label: 'M', value: 'm' },
        { label: 'S', value: 's' },
        { label: 'XS', value: 'xs' },
      ],
    },
    level: {
      label: 'Heading level',
      type: 'select',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
        { label: '5', value: '5' },
        { label: '6', value: '6' },
      ],
    },
    align: {
      label: 'Alignment',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
  },
  defaultProps: {
    id: 'blog-heading',
    text: 'Heading',
    align: 'left',
    level: '2',
    size: 'l'
  } as HeadingProps,
  render: (props: HeadingProps) => {
    const BlogHeadingComponent = blogHeading;
    return <BlogHeadingComponent {...props} />;
  },
};

const blogTitleConfig = {
  label: 'Blog Title Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    text: {
      label: 'Fallback Title Text',
      type: 'textarea',
      placeholder: 'Enter blog title text (used if no story selected)',
      contentEditable: true
    },
    author: {
      label: 'Fallback Author Name',
      type: 'text',
      placeholder: 'Enter author name (used if no story selected)',
      contentEditable: true
    },
  },
  defaultProps: {
    id: 'blog-title-card',
    storyId: getStoryOptions()[0]?.value || '',
    text: "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.",
    author: "AUTHOR NAME"
  },
  render: (props: { id?: string; storyId?: string; text?: string; author?: string }) => (
    <BlogTitle {...props} />
  ),
};

const blogImageCardConfig = {
  label: 'Blog Image Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    imageUrl: {
      label: 'Fallback Image URL',
      type: 'text',
      placeholder: 'Enter image URL (used if no story selected)',
    },
    title: {
      label: 'Fallback Title',
      type: 'textarea',
      placeholder: 'Enter title (used if no story selected)',
      contentEditable: true
    },
  },
  defaultProps: {
    id: 'blog-image-card',
    storyId: getStoryOptions()[0]?.value || '',
    imageUrl: "/story-images/default.png",
    title: "Lorem ipsum dolor sit amet adipiscing elit",
  },
  render: (props: { id?: string; storyId?: string; imageUrl?: string; title?: string }) => (
    <BlogImageCard {...props} />
  ),
};


const blogGridConfig = {
  label: 'Blog Grid',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    className: {
      label: 'Additional CSS Classes',
      type: 'text',
      placeholder: 'Add custom CSS classes (space separated)'
    }
  },
  defaultProps: {
    id: 'blog-grid',
    className: ''
  },
  render: (props: { id?: string; className?: string; puck?: any }) =>
    <BlogGrid {...props} />
};

const shareCardConfig = {
  label: 'Share Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    title: {
      label: 'Title',
      type: 'text',
      placeholder: 'Enter title to share',
    },
    url: {
      label: 'URL to Share',
      type: 'text',
      placeholder: 'Enter URL to share',
    },
  },
  defaultProps: {
    id: 'share-card',
    title: 'OpenPress | News and Identity for Indians in India',
    url: typeof window !== 'undefined' ? window.location.href : '',
  },
  render: (props: { id?: string; title: string; url: string }) => (
    <ShareCard {...props} />
  ),
};

const blogBodyCardConfig = {
  label: 'Blog Body Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    bodyText: {
      label: 'Fallback Body Text',
      type: 'textarea',
      placeholder: 'Enter body text (used if no story selected)',
      contentEditable: true
    },
  },
  defaultProps: {
    id: 'blog-body-card',
    storyId: getStoryOptions()[0]?.value || '',
    bodyText: `Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.
In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.
Pulvinar vivamus fringilla lacus nec metus bibendum egestas.`,
  },
  render: (props: { id?: string; storyId?: string; bodyText?: string }) => (
    <BlogBodyCard {...props} />
  ),
};

const blogSubHeadingConfig = {
  label: 'Blog Subheading',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    time: {
      label: 'Time',
      type: 'text',
      placeholder: 'e.g., 18 minutes ago',
    },
    category: {
      label: 'Category',
      type: 'text',
      placeholder: 'e.g., TECHNOLOGY',
    },
    className: {
      label: 'Additional CSS Classes',
      type: 'text',
      placeholder: 'Add custom classes (optional)',
    },
  },
  defaultProps: {
    id: 'blog-subheading',
    storyId: getStoryOptions()[0]?.value || '',
    time: '18 minutes ago',
    category: 'CATEGORY',
  },
  render: (props: BlogSubHeadingProps) => <BlogSubHeading {...props} />,
};


const blogMainTitleConfig = {
  label: 'Blog Main Title',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    fallbackTitle: {
      label: 'Fallback Title',
      type: 'text',
      placeholder: 'Enter fallback title (used if no story selected)',
    },
  },
  defaultProps: {
    id: 'blog-main-title',
    storyId: getStoryOptions()[0]?.value || '',
    fallbackTitle: 'Story Title',
  },
  render: (props: BlogMainTitleProps) => <BlogMainTitle {...props} />,
};

const blogPostCardConfig = {
  label: 'Blog Post Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    storyId: {
      label: 'Select Story',
      type: 'select',
      get options() {
        return getStoryOptions();
      },
    },
    title: {
      label: 'Title',
      type: 'text',
      placeholder: 'Enter blog post title',
    },
    author: {
      label: 'Author',
      type: 'text',
      placeholder: 'Enter author name',
    },
    time: {
      label: 'Time',
      type: 'text',
      placeholder: 'e.g., 2 hours ago',
    },
    category: {
      label: 'Category',
      type: 'text',
      placeholder: 'Enter category',
    },
    imageUrl: {
      label: 'Image URL',
      type: 'text',
      placeholder: 'Enter image URL (optional, will use story image if available)',
    },
    bodyText: {
      label: 'Body Text',
      type: 'textarea',
      placeholder: 'Enter blog post content',
    },
  },
  defaultProps: {
    id: 'blog-post-card',
    title: 'Blog Post Title',
    author: 'Author Name',
    time: 'Just now',
    category: 'CATEGORY',
    bodyText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  render: (props: any) => <BlogPostCard {...props} />,
};

const blogMoreStoriesConfig = {
  label: 'More Stories Card',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    headingColor: {
      label: 'Heading & Underline Colour',
      type: 'custom',
      render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
        <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#e5e7eb" label="Heading & Underline Colour" />
      ),
    },
    insertAfterParagraph: {
      label: 'Insert After Paragraph #',
      type: 'number',
    },
    mode: {
      label: 'Mode',
      type: 'radio',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Automatic', value: 'automatic' },
      ],
    },
    displayCount: {
      label: 'Number of Stories',
      type: 'select',
      options: [
        { label: '1 Story', value: '1' },
        { label: '2 Stories', value: '2' },
        { label: '3 Stories', value: '3' },
        { label: '4 Stories', value: '4' },
        { label: '6 Stories', value: '6' },
        { label: '8 Stories', value: '8' },
      ],
    },
    // We will dynamically inject manualStory_X or autoTaxonomy_X fields via resolveFields.
    autoRecency: {
      label: 'Published In (Auto Mode)',
      type: 'select',
      options: [
        { label: 'Any time', value: 'all' },
        { label: 'Last 24 hours', value: '24h' },
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
      ],
    },
    autoMostRead: {
      label: 'Most Read Filter (Auto Mode)',
      type: 'radio',
      options: [
        { label: 'Off', value: 'off' },
        { label: 'Prioritize Most Read', value: 'on' },
      ],
    },
  },
  defaultProps: {
    id: 'blog-more-stories',
    headingColor: '',
    mode: 'automatic',
    displayCount: '3',
    insertAfterParagraph: 0,
    autoRecency: 'all',
    autoMostRead: 'off',
    stories: [],
  },
  resolveFields: async (data: any, { fields }: any) => {
    const newFields = { ...fields };
    const count = parseInt(data.props.displayCount || '3', 10);
    
    if (data.props.mode === 'manual') {
      delete newFields.autoRecency;
      delete newFields.autoMostRead;
      
      // Inject N select fields based on displayCount
      for (let i = 0; i < count; i++) {
        newFields[`manualStory_${i}`] = {
          label: `Story ${i + 1}`,
          type: 'select',
          get options() {
            return getStoryOptions();
          },
        };
      }
    } else {
      // Keep taxonomy dropdown in sync with latest Settings toggles.
      await initializeMoreStoryCardTaxonomyOptions();

      // Reinsert Most Read at the end so it appears below taxonomy filters.
      const mostReadField = newFields.autoMostRead;
      delete newFields.autoMostRead;

      const taxonomyGroups = getMoreStoryCardTaxonomyGroups();
      taxonomyGroups.forEach((group) => {
        const key = taxonomyFieldKey(group.taxonomyName);
        const hasValues = group.values && group.values.length > 0;
        newFields[key] = {
          label: `${group.taxonomyName} (Auto Mode)`,
          type: 'select',
          options: hasValues
            ? [
                { label: `All ${group.taxonomyName}`, value: '' },
                ...group.values.map((value) => ({ label: value, value })),
              ]
            : [
                { label: `All ${group.taxonomyName} (No values available)`, value: '' },
              ],
        };
      });

      if (mostReadField) {
        newFields.autoMostRead = mostReadField;
      }
    }
    
    return newFields;
  },
  resolveData: async (data: any) => {
    let resolvedStories: Story[] = [];
    const count = parseInt(data.props.displayCount || '3', 10);

    if (data.props.mode === 'manual') {
      const manualIds: string[] = [];
      for (let i = 0; i < count; i++) {
        const val = data.props[`manualStory_${i}`];
        if (val) manualIds.push(val);
      }
      resolvedStories = manualIds
        .map((id: string) => findStoryById(id))
        .filter((story): story is Story => story !== undefined);
    } else {
      let pool = [...getStories()];

      await initializeMoreStoryCardTaxonomyOptions();
      const taxonomyGroups = getMoreStoryCardTaxonomyGroups();

      // Apply all selected taxonomy filters (e.g., Section + Category together).
      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesMoreStoryTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      // Backward compatibility for older saved pages that still have autoCategory.
      if (data.props.autoCategory) {
        pool = pool.filter((story) =>
          storyMatchesMoreStoryTaxonomy(story, 'Category', data.props.autoCategory)
        );
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;

        pool = pool.filter(s => {
          const pubTime = new Date(s.publishedAt || s.createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      // Most Read: fetch analytics top-content, match to candidate pool by
      // headline, and surface those stories first in analytics score order.
      resolvedStories = await prioritizeMostReadStories(
        pool,
        count,
        data.props.autoMostRead === 'on',
        data.props.autoRecency
      );
    }

    return {
      props: {
        ...data.props,
        stories: resolvedStories,
      },
    };
  },
  render: (props: any) => {
    const selectedTaxonomies: Array<{ taxonomyName: string; taxonomyValue: string }> = [];
    Object.keys(props).forEach((key) => {
      if (key.startsWith('auto') && key !== 'autoRecency' && key !== 'autoMostRead') {
        const val = props[key];
        if (val) {
          const rawName = key.replace(/^auto/, '');
          selectedTaxonomies.push({
            taxonomyName: rawName,
            taxonomyValue: val,
          });
        }
      }
    });

    return <BlogMoreStoriesCard {...props} selectedTaxonomies={selectedTaxonomies} />;
  },
};

export default {
  PopularBlogCard: blogCardConfig,
  BlogRecomCard: blogRecomCardConfig,
  BlogShowcaseCard: blogShowcaseCardConfig,
  BlogHeading: blogHeadingConfig,
  BlogTitle: blogTitleConfig,
  BlogImageCard: blogImageCardConfig,
  BlogGrid: blogGridConfig,
  ShareCard: shareCardConfig,
  BlogBodyCard: blogBodyCardConfig,
  BlogSubHeading: blogSubHeadingConfig,
  BlogMainTitle: blogMainTitleConfig,
  BlogPostCard: blogPostCardConfig,
  BlogMoreStoriesCard: blogMoreStoriesConfig,
};

import ShowcaseCardLayout, { type ShowcaseCardProps } from './blocks/ShowcaseCard'
import HoverCardLayout, { type HoverCardProps } from './blocks/HoverCard'
import { StoryCard, type StoryCardProps } from './blocks/StoryCard'
import { SidebarStoryCard } from './blocks/sidebarCard'
import AdCard from './blocks/AdCard'
import { adProducts, adProductOptions, findAdProductById } from './adProducts'
import { RecommendCard, type RecommendCardProps } from './blocks/RecommendCard'
import MostPopularTable from './blocks/MostPopularCard'
import { MainCard, type MainCardProps } from './blocks/MainCard'
import FeaturedCardLayout, { type FeaturedCardProps } from './blocks/FeaturedCard'
import StorySubCard from './blocks/StorySubCard'
import { MultimediaCard, type MultimediaCardProps } from './blocks/MultimediaCard'
import { getStories, getStoryOptions, findStoryById } from './storyData'
import blogBlocks from './blogBuilder/BlogCardConfig'
import Border, { type BorderProps } from './blocks/border'
import { ErrorCard, type ErrorCardProps } from './blocks/ErrorCard'
import SectionBottomGrid, { type SectionBottomGridProps } from './blocks/section/SectionBottomGrid';
import { SectionGrid, type SectionGridProps } from './blocks/section/SectionGrid'
import { withAccentColor } from './accentColor'
import { AuthorProfile, type AuthorProfileProps } from './blocks/author/AuthorProfile';
import { AuthorsGrid } from './blocks/author/AuthorsGrid';
import { AuthorsGridManual } from './blocks/author/AuthorsGridManual';
import { AuthorCard, type AuthorCardProps } from './blocks/author/AuthorCard';
import { getAuthorOptions, findAuthorById } from './authorData';

const automaticGridNotice = {
  label: '',
  type: 'custom' as const,
  render: () => (
    <div style={{ padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', color: '#92400e', fontSize: '13px', lineHeight: '1.5' }}>
      <strong>Automatic mode</strong>
      <br />
      Stories in this grid are selected automatically. Individual cards cannot be changed here.
    </div>
  ),
};

const isParentAutomatic = (parent: any): boolean =>
  parent?.props?.mode === 'automatic';

const storyCountField = {
  label: 'Number of Stories',
  type: 'select' as const,
  options: Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
};

const rawCardBlocks: Record<string, any> = {
  ...blogBlocks,
  AuthorProfile: {
    label: 'Author Profile',
    fields: {
      name: { type: 'text', label: 'Name Override' },
      bio: { type: 'textarea', label: 'Bio Override' },
      role: { type: 'text', label: 'Role Override' },
      image: { type: 'text', label: 'Image URL Override' },
      twitter: { type: 'text', label: 'Twitter Handle' },
      linkedin: { type: 'text', label: 'LinkedIn URL' },
    },
    defaultProps: {
    },
    resolveData: async (
      { props }: { props: AuthorProfileProps }
    ) => {
      // Since authorId is now context-driven, we don't need to resolve based on it here
      // unless we still want to allow overrides.
      return { props };
    },
    render: (props: AuthorProfileProps) => <AuthorProfile {...props} />
  },
  AuthorsGrid: {
    label: 'All Authors Grid',
    fields: {
      title: {
        label: 'Title',
        type: 'text'
      }
    },
    defaultProps: {
      title: 'The Voices\nBehind OpenPress'
    },
    render: (props: any) => <AuthorsGrid {...props} />
  },
  AuthorsGridManual: {
    label: 'Manual Authors Grid',
    fields: {
      rowCount: {
        label: 'Number of Rows (4 cards per row)',
        type: 'select',
        options: [
          { label: '1 Row (4 Authors)', value: 1 },
          { label: '2 Rows (8 Authors)', value: 2 },
          { label: '3 Rows (12 Authors)', value: 3 },
          { label: '4 Rows (16 Authors)', value: 4 },
          { label: '5 Rows (20 Authors)', value: 5 },
          { label: '6 Rows (24 Authors)', value: 6 },
        ]
      },
      title: {
        label: 'Title',
        type: 'text'
      }
    },
    defaultProps: {
      rowCount: 3,
      title: 'The Voices Behind OpenPress'
    },
    render: (props: any) => <AuthorsGridManual {...props} />
  },
  AuthorCard: {
    label: 'Author Card',
    fields: {
      authorId: {
        label: 'Select Author',
        type: 'select',
        get options() {
          return getAuthorOptions();
        }
      },
      name: { type: 'text', label: 'Name Override' },
      bio: { type: 'textarea', label: 'Bio Override' },
      image: { type: 'text', label: 'Image URL Override' },
      role: { type: 'text', label: 'Role Override' },
      twitter: { type: 'text', label: 'Twitter Handle' },
      linkedin: { type: 'text', label: 'LinkedIn URL' },
    },
    defaultProps: {
      authorId: getAuthorOptions()[0]?.value || '',
    },
    resolveData: async (
      { props }: { props: AuthorCardProps }
    ) => {
      if (props.authorId) {
        const author = findAuthorById(props.authorId);
        if (author) {
          return {
            props: {
              ...props,
              name: author.name,
              bio: author.bio,
              image: author.image,
            },
          };
        }
      }
      return { props };
    },
    render: (props: AuthorCardProps) => <AuthorCard {...props} />
  },
  SectionGrid: {
    label: 'Section Grid',
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
      id: 'section-grid',
      className: ''
    },
    render: (props: SectionGridProps) =>
      <SectionGrid {...props} />
  },
  AdCard: {
    label: 'Ad card',
    fields: {
      id: { label: 'Card ID', type: 'text', placeholder: 'Optional card anchor' },
      productId: { label: 'Select product', type: 'select', options: adProductOptions },
    },
    defaultProps: { id: 'ad-card', productId: adProducts[0].id },
    render: (props: { id?: string; productId?: string }) => {
      const product = findAdProductById(props.productId ?? '') ?? adProducts[0]
      return <AdCard {...props} product={product} />
    },
  },

  ShowcaseCard: {
    label: 'Showcase Card',
    fields: {
      items: {
        label: 'Showcase Cards',
        type: 'array',
        arrayFields: {
          storyId: {
            label: 'Select Story',
            type: 'select',
            get options() {
              return getStoryOptions()
            },
          },
          title: { label: 'Fallback Title', type: 'text', placeholder: 'Enter card title' },
          category: { label: 'Fallback Category', type: 'text', placeholder: 'Enter category' },
        },
      },
    },
    defaultProps: {
      items: [
        {
          storyId: getStoryOptions()[0]?.value || '',
          title: 'Headline goes here',
          category: 'WORLD',
        },
        {
          storyId: getStoryOptions()[1]?.value || '',
          title: 'New Frontiers of AI',
          category: 'TECH',
        },
      ],
    } as ShowcaseCardProps,
    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { storyCount: storyCountField, _automaticNotice: automaticGridNotice };
      return fields;
    },
    resolveData: async ({ props }: any) => {
      const currentCount = props.items?.length ?? 2;
      const targetCount = Number(props.storyCount) || currentCount;
      const newProps: any = { ...props, storyCount: targetCount };
      if (targetCount !== currentCount) {
        newProps.items = Array.from({ length: targetCount }, () => ({ storyId: '', title: '', category: '' }));
      }
      return { props: newProps };
    },
    render: (props: ShowcaseCardProps) => <ShowcaseCardLayout {...props} />,
  },

  HoverCard: {
    label: 'Hover Card',
    fields: {
      items: {
        label: 'Hover Cards',
        type: 'array',
        arrayFields: {
          storyId: {
            label: 'Select Story',
            type: 'select',
            get options() {
              return getStoryOptions()
            },
          },
          hoverBgColor: {
            label: 'Select Color',
            type: 'select',
            options: [
              { label: 'Null', value: '' },
              { label: 'Slate', value: '#d1d5db' },
              { label: 'Steel Blue', value: '#bfdbfe' },
              { label: 'Sage', value: '#bbf7d0' },
              { label: 'Amber', value: '#fde68a' },
              { label: 'Rose', value: '#fecdd3' },
              { label: 'Lavender Gray', value: '#ddd6fe' },
            ],
          },
          defaultOpenState: {
            label: 'Open or Close',
            type: 'select',
            options: [
              { label: 'Close', value: 'close' },
              { label: 'Open', value: 'open' },
            ],
          },
          title: { label: 'Fallback Title', type: 'text', placeholder: 'Enter card title' },
          category: { label: 'Fallback Category', type: 'text', placeholder: 'Enter category' },
        },
      },
    },
    defaultProps: {
      items: [
        {
          storyId: getStoryOptions()[0]?.value || '',
          hoverBgColor: '#ffffff',
          defaultOpenState: 'close',
          title: 'Headline goes here',
          category: 'WORLD',
        },
        {
          storyId: getStoryOptions()[1]?.value || '',
          hoverBgColor: '#ffffff',
          defaultOpenState: 'close',
          title: 'New Frontiers of AI',
          category: 'TECH',
        },
      ],
    } as HoverCardProps,
    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { storyCount: storyCountField, _automaticNotice: automaticGridNotice };
      return fields;
    },
    resolveData: async ({ props }: any) => {
      const currentCount = props.items?.length ?? 2;
      const targetCount = Number(props.storyCount) || currentCount;
      const newProps: any = { ...props, storyCount: targetCount };
      if (targetCount !== currentCount) {
        newProps.items = Array.from({ length: targetCount }, () => ({ storyId: '', hoverBgColor: '', defaultOpenState: 'close', title: '', category: '' }));
      }
      return { props: newProps };
    },
    render: (props: HoverCardProps) => <HoverCardLayout {...props} />,
  },

  StoryCard: {
    label: "Story Card",
    fields: {
      storyId: {
        label: "Select Story",
        type: "select",
        get options() {
          const stories = getStories()
          return stories.length
            ? stories.map((s) => ({
              label: s.headline,
              value: s.id,
            }))
            : [{ label: "Loading stories...", value: "" }]
        },
      },
      label: {
        label: 'Label',
        type: 'text',
      },
      title: {
        label: 'Title',
        type: 'text',
      },
      description: {
        label: 'Description',
        type: 'textarea',
      },
    },
    defaultProps: {} as StoryCardProps,

    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },

    resolveData: async (
      { props }: { props: StoryCardProps }
    ) => {
      if (props.storyId) {
        const story = findStoryById(props.storyId);

        if (story) {
          return {
            props: {
              ...props,
              label: story.category,
              title: story.headline,
              description: story.summary,
            },
          };
        }
      }

      return { props };
    },

    render: (props: StoryCardProps) => <StoryCard {...props} />,
  },




  MultimediaCard: {
    label: "Multimedia Card",
    fields: {
      storyId: {
        label: "Select Story",
        type: "select",
        get options() {
          return getStoryOptions();
        },
      },
      title: {
        label: 'Title',
        type: 'text',
      },
      description: {
        label: 'Description',
        type: 'textarea',
      },
    },
    defaultProps: {} as MultimediaCardProps,

    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },

    resolveData: async (
      { props }: { props: MultimediaCardProps }
    ) => {
      if (props.storyId) {
        const story = findStoryById(props.storyId);

        if (story) {
          return {
            props: {
              ...props,
              title: story.headline,
              description: story.summary,
            },
          };
        }
      }

      return { props };
    },

    render: (props: MultimediaCardProps) => {
      const story = findStoryById(props.storyId || '');

      return (
        <MultimediaCard
          imageUrl={story?.imageUrl}
          label={props.label || story?.category}
          title={props.title || story?.headline}
          description={props.description || story?.summary}
          author={story?.author}
        />
      );
    },

  },

  MainCard: {
    label: 'Main Card',
    fields: {
      storyId: {
        label: 'Select Story',
        type: 'select',
        get options() {
          return getStoryOptions();
        },
      },

      label: {
        label: 'Label',
        type: 'text',
      },

      title: {
        label: 'Title',
        type: 'text',
      },

      description: {
        label: 'Description',
        type: 'textarea',
      },
    },

    defaultProps: {
      storyId: getStoryOptions()[0]?.value || '',
      imageUrl:
        findStoryById(getStoryOptions()[0]?.value)?.imageUrl ??
        '/openpress-share.png',

      label:
        findStoryById(getStoryOptions()[0]?.value)?.category ??
        'NEWS',

      title:
        findStoryById(getStoryOptions()[0]?.value)?.headline ??
        'Headline goes here',

      description:
        findStoryById(getStoryOptions()[0]?.value)?.summary ??
        'A short summary of the story appears here...',
    } as MainCardProps,

    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },

    resolveData: async (
      { props }: { props: MainCardProps }
    ) => {
      if (props.storyId) {
        const story = findStoryById(props.storyId);

        if (story) {
          return {
            props: {
              ...props,
              imageUrl: story.imageUrl,
              label: story.category,
              title: story.headline,
              description: story.summary,
            },
          };
        }
      }

      return { props };
    },


    render: (props: MainCardProps) => <MainCard {...props} />,
  },



  RecommendCard: {
    label: 'Recommendation Card',
    fields: {
      storyId: {
        label: 'Select Story',
        type: 'select',
        get options() {
          const stories = getStories();
          return stories.length
            ? stories.map((s) => ({
              label: s.headline,
              value: s.id,
            }))
            : [{ label: 'Loading stories...', value: '' }];
        },
      },
      label: {
        label: 'Label',
        type: 'text',
      },
      title: {
        label: 'Title',
        type: 'text',
      },
    },
    defaultProps: {} as RecommendCardProps,

    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },

    resolveData: async (
      { props }: { props: RecommendCardProps }
    ) => {
      if (props.storyId) {
        const story = findStoryById(props.storyId);

        if (story) {
          return {
            props: {
              ...props,
              label: story.category,
              title: story.headline,
            },
          };
        }
      }

      return { props };
    },

    render: (props: RecommendCardProps) => <RecommendCard {...props} />,
  },


  MostPopularTable: {
    label: 'Most Popular Table',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      items: {
        label: 'Table Items',
        type: 'array',
        arrayFields: {
          number: { label: 'Rank Number', type: 'number' },
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
      id: 'most-popular-table',
      items: Array.from({ length: 8 }, (_, i) => ({
        number: i + 1,
        storyId: getStoryOptions()[0]?.value || '',
        text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque.',
      })),
    },
    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { id: fields.id, storyCount: storyCountField, _automaticNotice: automaticGridNotice };
      return fields;
    },
    resolveData: async ({ props }: any) => {
      const currentCount = props.items?.length ?? 8;
      const targetCount = Number(props.storyCount) || currentCount;
      const newProps: any = { ...props, storyCount: targetCount };
      if (targetCount !== currentCount) {
        newProps.items = Array.from({ length: targetCount }, (_, i) => ({ number: i + 1, storyId: '', text: '' }));
      }
      return { props: newProps };
    },
    render: (props: {
      id?: string;
      items?: Array<{ number: number; text: string; storyId?: string }>;
    }) => <MostPopularTable {...props} />,
  },


  StorySubCard: {
    label: 'Story Sub Card',
    fields: {
      storyId: {
        label: 'Select Story',
        type: 'select',
        get options() {
          return getStoryOptions()
        },
      },
    },
    defaultProps: {
      storyId: getStoryOptions()[0]?.value || '',
    },
    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },
    render: (props: { storyId?: string }) => <StorySubCard {...props} />,
  },


  FeaturedCard: {
    label: 'Featured Card',
    fields: {
      items: {
        label: 'Featured Cards',
        type: 'array',
        arrayFields: {
          storyId: {
            label: 'Select Story',
            type: 'select',
            get options() {
              return getStoryOptions()
            },
          },
          title: { label: 'Fallback Title', type: 'text', placeholder: 'Enter card title' },
          category: { label: 'Fallback Category', type: 'text', placeholder: 'Enter category' },
        },
      },
    },
    defaultProps: {
      items: [
        {
          storyId: getStoryOptions()[0]?.value || '',
          title: 'Headline goes here',
          category: 'WORLD',
        },
        {
          storyId: getStoryOptions()[1]?.value || '',
          title: 'New Frontiers of AI',
          category: 'TECH',
        },
      ],
    } as FeaturedCardProps,
    resolveFields: async (_data: any, { fields, parent }: any) => {
      if (isParentAutomatic(parent)) return { _automaticNotice: automaticGridNotice };
      return fields;
    },
    render: (props: FeaturedCardProps) => <FeaturedCardLayout {...props} />,
  },


  SidebarStoryCard: {
    label: 'Side Card',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      storyId: {
        label: 'Select story',
        type: 'select',
        get options() {
          return getStoryOptions()
        },
      },
      isFirst: {
        type: 'select',
        label: 'First Card',
        options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
      },
      isLast: {
        type: 'select',
        label: 'Last Card',
        options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
      },
    },
    defaultProps: {
      storyId: getStoryOptions()[0]?.value || '',
      isFirst: 'false',
      isLast: 'false',
    },
    render: (props: { storyId?: string; isFirst?: string; isLast?: string }) => {
      const storyId = props.storyId || getStories()[0]?.id || ''
      return <SidebarStoryCard storyId={storyId} isFirst={props.isFirst === 'true'} isLast={props.isLast === 'true'} />
    },
  },

  Border: {
    label: 'Border Line',
    fields: {
      id: {
        label: 'Section ID',
        type: 'text',
        placeholder: 'Optional anchor for in-page links',
      },
    },
    defaultProps: {
      id: 'border-line',
    } as BorderProps,
    render: (props: BorderProps) => <Border {...props} />,
  },

  ErrorCard: {
    label: 'Error Card (404)',
    fields: {
      title: {
        label: 'Title',
        type: 'text',
        placeholder: 'Page not found',
      },
      description: {
        label: 'Description',
        type: 'text',
        placeholder: "We're sorry we seem to have lost this page.",
      },
      linkText: {
        label: 'Link Text',
        type: 'text',
        placeholder: 'GO TO HOMEPAGE',
      },
      linkUrl: {
        label: 'Link URL',
        type: 'text',
        placeholder: '/',
      },
    },
    defaultProps: {
      title: 'Page not found',
      description: "We're sorry we seem to have lost this page.",
      linkText: 'GO TO HOMEPAGE',
      linkUrl: '/',
    } as ErrorCardProps,
    render: (props: ErrorCardProps) => <ErrorCard {...props} />,
  },

  SectionBottomCard: {
    label: 'Section Bottom Grid',
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
      id: 'section-bottom-grid',
      className: ''
    },
    render: (props: SectionBottomGridProps) => <SectionBottomGrid {...props} />,
  },

}

export const cardBlocks: Record<string, any> = withAccentColor(rawCardBlocks)

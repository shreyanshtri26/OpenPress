// CommonBlocksConfig.tsx
import { MastheadNavbarBlock, type MastheadNavbarProps } from './blocks/MastheadNavbarBlock'
import { AdvertisementGridBlock, type AdvertisementGridProps } from './blocks/AdvertisementGridBlock'
import { ThumbnailGridBlock, type ThumbnailGridProps } from './blocks/ThumbnailGridBlock'
import { HeroGridBlock, type HeroGridProps } from './blocks/HeroGridBlock'
import { PopularGridBlock, type PopularGridProps } from './blocks/PopularGridBlock'
import { MultimediaGridBlock, type MultimediaGridProps } from './blocks/multimediaGridBlock'
import { AllStoriesGrid, type AllStoriesGridProps } from './blocks/AllStoriesGrid'
import { HeadingBlock, type HeadingProps } from './blocks/HeadingBlock'
import { FooterBlock, type FooterProps } from './blocks/FooterBlock'
import { AboutUs } from '../AboutUs/AboutUs'
import { SupportUs } from '../SupportUs/SupportUs'
import { SUPPORT_US_DEFAULTS } from '../../helpers/renderers/renderSupportUs'
import { PrivacyPolicy } from '../PrivacyPolicy/PrivacyPolicy'
import { MediaCouncil } from '../MediaCouncil/MediaCouncil'
import { ContactUs } from '../ContactUs/ContactUs'
import { LeaderboardAdBlock } from './blocks/LeaderboardAdBlock'
import { InStoryAdBlock } from './blocks/InStoryAdBlock'
import { SidebarAdBlock } from './blocks/SidebarAdBlock'
import { SpotlightAdBlock } from './blocks/SpotlightAdBlock'

import { getLeaderboardAdOptions, getSidebarAdOptions, getInStoryAdOptions, getSpotlightAdOptions, findAdById, getLiveAd, getAdOptions, getPlacementDimensions } from './campaignData'

import { FallbackStorySelect } from './fields/FallbackStorySelect'
import { ThumbnailGridCategorySelect } from './fields/ThumbnailGridCategorySelect'
import { ColorSelect } from './fields/ColorSelect'
import { DynamicAdBlock } from './blocks/DynamicAdBlock'
import { type ApiPlacement } from './apiService'
import { getStories, getThumbnailGridTaxonomyGroups, initializeThumbnailGridTaxonomyOptions } from './storyData'
import { prioritizeMostReadStories } from './mostReadStories'

const autoMostReadField = {
  label: 'Most Read Filter (Auto Mode)',
  type: 'radio',
  options: [
    { label: 'Off', value: 'off' },
    { label: 'Prioritize Most Read', value: 'on' },
  ],
}

const autoRecencyField = {
  label: 'Published In (Auto Mode)',
  type: 'select',
  options: [
    { label: 'Any time', value: 'all' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
  ],
}

function getTaxonomyFieldSelectOptions(groupName: string, values?: string[]) {
  const hasValues = values && values.length > 0;
  return hasValues
    ? [
        { label: `All ${groupName}`, value: '' },
        ...values.map((value) => ({ label: value, value })),
      ]
    : [
        { label: `All ${groupName} (No values available)`, value: '' },
      ];
}

const autoSidebarSpacerField = {
  label: '',
  type: 'custom',
  render: () => <div aria-hidden style={{ height: '3rem' }} />,
}

// The "Fallback Story" picker on ad blocks only makes sense when the ad sits
// inside one of the automatic-capable grids — that's the only context where
// an ad slot's manual/leftover story fallback is ever actually rendered in
// place of the ad (see automaticGridZones.ts / renderCampaign.ts). A
// standalone ad placed directly on the page (e.g. a popup ad) has no such
// grid context, so the picker is dropped for it entirely.
const GRID_BLOCK_TYPES = new Set(['HeroGrid', 'ThumbnailGrid', 'PopularGrid', 'MultimediaGrid', 'AllStoriesGrid'])
const isInsideGrid = (parent: any): boolean => GRID_BLOCK_TYPES.has(parent?.type)

function withoutFallbackStoryOutsideGrid(fields: Record<string, any>, parent: any): Record<string, any> {
  if (isInsideGrid(parent)) return fields
  const rest = { ...fields }
  delete rest.fallbackStoryId
  return rest
}

export const commonBlocks: Record<string, any> = {
  LeaderboardAd: {
    label: 'Leaderboard Ad',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      adId: {
        label: 'Select Campaign Ad',
        type: 'select',
        get options() {
          return getLeaderboardAdOptions();
        }
      },
      fallbackStoryId: {
        label: 'Fallback Story',
        type: 'custom',
        render: ({ value, onChange }: any) => (
          <FallbackStorySelect value={value ?? ''} onChange={onChange} label="Fallback Story" />
        ),
      },
      desktopDimensions: {
        label: 'Desktop Dimensions (width*height)',
        type: 'text',
        placeholder: 'e.g. 728*90 or 970*90'
      },
      mobileDimensions: {
        label: 'Mobile Dimensions (width*height)',
        type: 'text',
        placeholder: 'e.g. 320*50 or 300*250'
      }
    },
    resolveFields: (_data: any, { fields, parent }: any) => withoutFallbackStoryOutsideGrid(fields, parent),
    defaultProps: {
      id: 'leaderboard-ad',
      adId: 'auto',
      fallbackStoryId: '',
      fallbackAllowed: true,
      desktopDimensions: '',
      mobileDimensions: '',
    },
    render: (props: { id?: string; adId?: string; fallbackStoryId?: string; fallbackAllowed?: boolean; fallbackBlock?: any; desktopDimensions?: string; mobileDimensions?: string }) => {
      const liveAd = getLiveAd('Leaderboard');
      const selectedAd = props.adId === 'auto' ? liveAd : findAdById(props.adId ?? '');
      const placementDims = getPlacementDimensions('Leaderboard');

      return <LeaderboardAdBlock
        id={props.id}
        desktopImageUrl={selectedAd?.desktopImageUrl}
        mobileImageUrl={selectedAd?.mobileImageUrl}
        linkUrl={selectedAd?.linkUrl}
        altText={selectedAd?.altText}
        desktopDimensions={props.desktopDimensions || selectedAd?.desktopDimensions || placementDims.desktopDimensions}
        mobileDimensions={props.mobileDimensions || selectedAd?.mobileDimensions || placementDims.mobileDimensions}
        fallbackBlock={props.fallbackBlock}
      />;
    },
  },
  InStoryAd: {
    label: 'In-Story Ad (300x250)',
    fields: {
      id: { label: 'Section ID', type: 'text' },
      adId: {
        label: 'Select Campaign Ad',
        type: 'select',
        get options() {
          return getInStoryAdOptions();
        }
      },
      fallbackStoryId: {
        label: 'Fallback Story',
        type: 'custom',
        render: ({ value, onChange }: any) => (
          <FallbackStorySelect value={value ?? ''} onChange={onChange} label="Fallback Story" />
        ),
      },
    },
    resolveFields: (_data: any, { fields, parent }: any) => withoutFallbackStoryOutsideGrid(fields, parent),
    defaultProps: {
      id: 'instory-ad',
      adId: 'auto',
      fallbackStoryId: '',
      fallbackAllowed: true,
    },
    render: (props: { id?: string; adId?: string; fallbackStoryId?: string; fallbackAllowed?: boolean; fallbackBlock?: any }) => {
      const liveAd = getLiveAd('In-Story');
      const selectedAd = props.adId === 'auto' ? liveAd : findAdById(props.adId ?? '');

      return <InStoryAdBlock
        id={props.id}
        desktopImageUrl={selectedAd?.desktopImageUrl}
        mobileImageUrl={selectedAd?.mobileImageUrl}
        linkUrl={selectedAd?.linkUrl}
        altText={selectedAd?.altText}
        fallbackBlock={props.fallbackBlock}
      />;
    },
  },
  SidebarAd: {
    label: 'Sidebar Ad (300x250)',
    fields: {
      id: { label: 'Section ID', type: 'text' },
      adId: {
        label: 'Select Campaign Ad',
        type: 'select',
        get options() {
          return getSidebarAdOptions();
        }
      },
      fallbackStoryId: {
        label: 'Fallback Story',
        type: 'custom',
        render: ({ value, onChange }: any) => (
          <FallbackStorySelect value={value ?? ''} onChange={onChange} label="Fallback Story" />
        ),
      },
    },
    resolveFields: (_data: any, { fields, parent }: any) => withoutFallbackStoryOutsideGrid(fields, parent),
    defaultProps: {
      id: 'sidebar-ad',
      adId: 'auto',
      storyId: '',
      fallbackStoryId: '',
      fallbackAllowed: true,
    },
    render: (props: { id?: string; adId?: string; storyId?: string; fallbackStoryId?: string; fallbackAllowed?: boolean; fallbackBlock?: any }) => {
      const liveAd = getLiveAd('Sidebar');
      const selectedAd = props.adId === 'auto' ? liveAd : findAdById(props.adId ?? '');

      return <SidebarAdBlock
        id={props.id}
        adId={props.adId}
        desktopImageUrl={selectedAd?.desktopImageUrl}
        mobileImageUrl={selectedAd?.mobileImageUrl}
        linkUrl={selectedAd?.linkUrl}
        altText={selectedAd?.altText}
        storyId={props.storyId || props.fallbackStoryId}
        fallbackBlock={props.fallbackBlock}
      />;
    },
  },
  AtlanticNavbar: {
    label: 'Masthead navbar',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      showSignIn: {
        label: 'Show Sign In Button',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      showBanner: {
        label: 'Show Top Banner',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      showSupportUs: {
        label: 'Show Support Us Button (Banner)',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      showBecomeMember: {
        label: 'Show Become a Member Button (Navbar)',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      showFacebook: {
        label: 'Show Facebook Icon',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      showLinkedIn: {
        label: 'Show LinkedIn Icon',
        type: 'radio',
        options: [
          { label: 'Hide', value: false },
          { label: 'Show', value: true },
        ],
      },
      // Top Banner config
      bannerText: { label: 'Top Banner Text', type: 'text' },
      bannerBgColor: {
        label: 'Banner Background Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#F1EDFF" label="Banner Background Color" />
        ),
      },
      bannerTextColor: {
        label: 'Banner Text Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#000000" label="Banner Text Color" />
        ),
      },
      // Buttons Config
      supportUsText: { label: 'Support Us Button Text', type: 'text' },
      supportUsBgColor: {
        label: 'Support Us Background Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#0057FF" label="Support Us Background Color" />
        ),
      },
      supportUsTextColor: {
        label: 'Support Us Text Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#FFFFFF" label="Support Us Text Color" />
        ),
      },
      signInText: { label: 'Sign In Button Text', type: 'text' },
      signInBgColor: {
        label: 'Sign In Background Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#FFFFFF" label="Sign In Background Color" />
        ),
      },
      signInTextColor: {
        label: 'Sign In Text Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#0057FF" label="Sign In Text Color" />
        ),
      },
      becomeMemberText: { label: 'Become a Member Button Text', type: 'text' },
      becomeMemberBgColor: {
        label: 'Become a Member Background Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#0057FF" label="Become a Member Background Color" />
        ),
      },
      becomeMemberTextColor: {
        label: 'Become a Member Text Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#FFFFFF" label="Become a Member Text Color" />
        ),
      },
      themeColor: {
        label: 'Primary Theme / Button Color',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#0057FF" label="Primary Theme / Button Color" />
        ),
      },
    },
    defaultProps: {
      id: 'atlantic-navbar',
      showSignIn: true,
      showBanner: true,
      showSupportUs: false,
      showBecomeMember: false,
      showFacebook: true,
      showLinkedIn: true,
      bannerText: 'Our journalism is free. It needs your support. Consider becoming a member?',
      bannerBgColor: '#F1EDFF',
      bannerTextColor: '',
      supportUsText: 'SUPPORT US',
      supportUsBgColor: '',
      supportUsTextColor: '',
      signInText: 'SIGN IN',
      signInBgColor: '',
      signInTextColor: '',
      becomeMemberText: 'BECOME A MEMBER',
      becomeMemberBgColor: '',
      becomeMemberTextColor: '',
      themeColor: '#0057FF',
    },
    render: (props: MastheadNavbarProps) => (
      <MastheadNavbarBlock {...props} />
    ),
  },
  AdvertisementGrid: {
    label: 'Advertisement grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      heading: { label: 'Heading', type: 'text', placeholder: 'ADVERTISEMENT' },
      infoLabel: { label: 'Info label', type: 'text', placeholder: 'About this advertisement' },
      brandName: { label: 'Brand name', type: 'text', placeholder: 'PROFERLO' },
      items: { label: 'Grid items', type: 'slot' },
    },
    defaultProps: {
      id: 'advertisement-grid',
      heading: 'ADVERTISEMENT',
      infoLabel: 'About this advertisement',
      brandName: 'PROFERLO',
    } as AdvertisementGridProps,
    render: (props: AdvertisementGridProps) => <AdvertisementGridBlock {...props} />,
  },
  ThumbnailGrid: {
    label: 'Thumbnail grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      mode: {
        label: 'Mode',
        type: 'radio',
        options: [
          { label: 'Off', value: 'manual' },
          { label: 'Automatic', value: 'automatic' },
        ],
      },
      autoMostRead: autoMostReadField,
      autoRecency: autoRecencyField,
      automaticCategory: {
        label: 'Automatic',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ThumbnailGridCategorySelect value={value ?? ''} onChange={onChange} />
        ),
      },
      children: {
        label: 'Grid Items',
        type: 'array',
        arrayFields: {
          type: 'component',
          allowedComponents: ['StoryCard', 'RecommendCard', 'ShowcaseCard'],
          defaultItem: {
            type: 'StoryCard',
            props: {
              title: 'New Card',
              description: 'Add your content here',
            },
          },
        },
      },
    },
    defaultProps: { id: 'thumbnail-grid', mode: 'manual', automaticCategory: '', autoMostRead: 'off', children: [], autoStoryIds: [] } as ThumbnailGridProps,
    resolveFields: async (data: any, { fields }: any) => {
      const newFields = { ...fields };

      Object.keys(newFields).forEach((key) => {
        if (key.startsWith('autoTaxonomy_')) {
          delete newFields[key];
        }
      });

      if (data?.props?.mode === 'automatic') {
        // Hide manual slot editor and legacy single automatic selector in automatic mode.
        delete newFields.children;
        delete newFields.automaticCategory;

        await initializeThumbnailGridTaxonomyOptions();
        const mostReadField = newFields.autoMostRead;
        delete newFields.autoMostRead;
        const taxonomyGroups = getThumbnailGridTaxonomyGroups();
        taxonomyGroups.forEach((group) => {
          const key = `autoTaxonomy_${group.taxonomyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'}`;
          newFields[key] = {
            label: `${group.taxonomyName} (Auto Mode)`,
            type: 'select',
            options: getTaxonomyFieldSelectOptions(group.taxonomyName, group.values),
          };
        });
        if (mostReadField) newFields.autoMostRead = mostReadField;
        if (newFields.autoRecency) newFields.autoRecency = newFields.autoRecency;
        newFields.autoSidebarSpacer = autoSidebarSpacerField;
      } else {
        // Manual mode: only keep manual controls.
        delete newFields.automaticCategory;
        delete newFields.autoMostRead;
        delete newFields.autoRecency;
        delete newFields.autoSidebarSpacer;
      }

      return newFields;
    },
    resolveData: async (data: any) => {
      if (data?.props?.mode !== 'automatic') {
        return {
          props: {
            ...data.props,
            autoStoryIds: [],
          },
        };
      }

      const normalizeString = (value: unknown): string =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';

      const taxonomyFieldKey = (name: string): string => {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return `autoTaxonomy_${slug || 'unknown'}`;
      };

      const isAllSelection = (value: unknown): boolean => {
        const normalized = normalizeString(value);
        return !normalized || normalized === 'all' || normalized.startsWith('all ');
      };

      const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
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
          addCandidate(story.Section);
        } else if (taxonomyName === 'category') {
          addCandidate(story.taxonomyCategories);
          addCandidate(story.Category);
          addCandidate(story.taxonomyCategory);
          addCandidate(story.category);
        } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
          addCandidate(story.authorName);
          addCandidate(story.author);
          addCandidate(story.byLine);
          addCandidate(story.byline);
          addCandidate(story.Editor);
          addCandidate(story.editorName);
        }

        const rawStory = story as Record<string, unknown>;
        const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
        Object.entries(rawStory).forEach(([key, value]) => {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTaxonomyKey) {
            addCandidate(value);
          }
        });

        return candidateValues.has(selectedValue);
      };

      const getStoryTimestamp = (story: any): number => {
        const rawDate =
          story.proposedFilingDate ||
          story.publishDate ||
          story.publishedAt ||
          story.createdAt ||
          story.updatedAt ||
          '';

        const timestamp = new Date(rawDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      await initializeThumbnailGridTaxonomyOptions();
      const taxonomyGroups = getThumbnailGridTaxonomyGroups();
      let pool = [...getStories()];

      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      // Backward compatibility for legacy single automatic category values.
      if (data.props.automaticCategory) {
        const [taxonomyName, ...rest] = String(data.props.automaticCategory).split('::');
        const taxonomyValue = rest.join('::');
        if (taxonomyValue) {
          pool = pool.filter((story) =>
            storyMatchesTaxonomy(story, taxonomyName, taxonomyValue)
          );
        }
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;
        pool = pool.filter(s => {
          const pubTime = new Date((s as any).publishedAt || (s as any).publishDate || (s as any).proposedFilingDate || (s as any).createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      const sortedPool = pool.sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));
      const selectedStories = await prioritizeMostReadStories(sortedPool, 50, data.props.autoMostRead === 'on', data.props.autoRecency);
      const autoStoryIds = selectedStories
        .map((story) => story.id)
        .filter(Boolean);

      return {
        props: {
          ...data.props,
          autoStoryIds,
        },
      };
    },
    render: ({ id, mode, automaticCategory, autoStoryIds, children, puck }: { id?: string; mode?: 'manual' | 'automatic'; automaticCategory?: string; autoStoryIds?: string[]; children?: any; puck?: any }) => (
      <ThumbnailGridBlock id={id} mode={mode} automaticCategory={automaticCategory} autoStoryIds={autoStoryIds} puck={puck}>
        {children}
      </ThumbnailGridBlock>
    ),
  },

  HeroGrid: {
    label: 'Hero Grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      mode: {
        label: 'Mode',
        type: 'radio',
        options: [
          { label: 'Off', value: 'manual' },
          { label: 'Automatic', value: 'automatic' },
        ],
      },
      autoMostRead: autoMostReadField,
      autoRecency: autoRecencyField,
      automaticCategory: {
        label: 'Automatic',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ThumbnailGridCategorySelect value={value ?? ''} onChange={onChange} />
        ),
      },
      children: {
        label: 'Grid Items',
        type: 'array',
        arrayFields: {
          type: 'component',
          allowedComponents: ['ShowcaseCard', 'StoryCard', 'RecommendCard', 'MainCard', 'HoverCard'],
          defaultItem: {
            type: 'ShowcaseCard',
            props: {
              title: 'New Card',
              description: 'Add your content here',
              imageUrl: 'https://via.placeholder.com/600x400',
            },
          },
        },
      },
    },
    defaultProps: { id: 'hero-grid', mode: 'manual', automaticCategory: '', autoMostRead: 'off', children: [], autoStoryIds: [] } as HeroGridProps,
    resolveFields: async (data: any, { fields }: any) => {
      const newFields = { ...fields };

      Object.keys(newFields).forEach((key) => {
        if (key.startsWith('autoTaxonomy_')) {
          delete newFields[key];
        }
      });

      if (data?.props?.mode === 'automatic') {
        delete newFields.automaticCategory;
        delete newFields.children;

        await initializeThumbnailGridTaxonomyOptions();
        const mostReadField = newFields.autoMostRead;
        delete newFields.autoMostRead;
        const taxonomyGroups = getThumbnailGridTaxonomyGroups();
        taxonomyGroups.forEach((group) => {
          const key = `autoTaxonomy_${group.taxonomyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'}`;
          newFields[key] = {
            label: `${group.taxonomyName} (Auto Mode)`,
            type: 'select',
            options: getTaxonomyFieldSelectOptions(group.taxonomyName, group.values),
          };
        });
        if (mostReadField) newFields.autoMostRead = mostReadField;
        if (newFields.autoRecency) newFields.autoRecency = newFields.autoRecency;
        newFields.autoSidebarSpacer = autoSidebarSpacerField;
      } else {
        delete newFields.automaticCategory;
        delete newFields.autoMostRead;
        delete newFields.autoRecency;
        delete newFields.autoSidebarSpacer;
      }

      return newFields;
    },
    resolveData: async (data: any) => {
      if (data?.props?.mode !== 'automatic') {
        return {
          props: {
            ...data.props,
            autoStoryIds: [],
          },
        };
      }

      const normalizeString = (value: unknown): string =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';

      const taxonomyFieldKey = (name: string): string => {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return `autoTaxonomy_${slug || 'unknown'}`;
      };

      const isAllSelection = (value: unknown): boolean => {
        const normalized = normalizeString(value);
        return !normalized || normalized === 'all' || normalized.startsWith('all ');
      };

      const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
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
          addCandidate(story.Section);
        } else if (taxonomyName === 'category') {
          addCandidate(story.taxonomyCategories);
          addCandidate(story.Category);
          addCandidate(story.taxonomyCategory);
          addCandidate(story.category);
        } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
          addCandidate(story.authorName);
          addCandidate(story.author);
          addCandidate(story.byLine);
          addCandidate(story.byline);
          addCandidate(story.Editor);
          addCandidate(story.editorName);
        }

        const rawStory = story as Record<string, unknown>;
        const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
        Object.entries(rawStory).forEach(([key, value]) => {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTaxonomyKey) {
            addCandidate(value);
          }
        });

        return candidateValues.has(selectedValue);
      };

      const getStoryTimestamp = (story: any): number => {
        const rawDate =
          story.proposedFilingDate ||
          story.publishDate ||
          story.publishedAt ||
          story.createdAt ||
          story.updatedAt ||
          '';

        const timestamp = new Date(rawDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      await initializeThumbnailGridTaxonomyOptions();
      const taxonomyGroups = getThumbnailGridTaxonomyGroups();
      let pool = [...getStories()];

      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      if (data.props.automaticCategory) {
        const [taxonomyName, ...rest] = String(data.props.automaticCategory).split('::');
        const taxonomyValue = rest.join('::');
        if (taxonomyValue) {
          pool = pool.filter((story) =>
            storyMatchesTaxonomy(story, taxonomyName, taxonomyValue)
          );
        }
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;
        pool = pool.filter(s => {
          const pubTime = new Date((s as any).publishedAt || (s as any).publishDate || (s as any).proposedFilingDate || (s as any).createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      const sortedPool = pool.sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));
      const selectedStories = await prioritizeMostReadStories(sortedPool, 50, data.props.autoMostRead === 'on', data.props.autoRecency);
      const autoStoryIds = selectedStories
        .map((story) => story.id)
        .filter(Boolean);

      return {
        props: {
          ...data.props,
          autoStoryIds,
        },
      };
    },
    render: ({ id, mode, automaticCategory, autoStoryIds, children, puck }: { id?: string; mode?: 'manual' | 'automatic'; automaticCategory?: string; autoStoryIds?: string[]; children?: any; puck?: any }) => (
      <HeroGridBlock id={id} mode={mode} automaticCategory={automaticCategory} autoStoryIds={autoStoryIds} puck={puck}>
        {children}
      </HeroGridBlock>
    ),
  },
  PopularGrid: {
    label: 'Popular Grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      mode: {
        label: 'Mode',
        type: 'radio',
        options: [
          { label: 'Off', value: 'manual' },
          { label: 'Automatic', value: 'automatic' },
        ],
      },
      autoMostRead: autoMostReadField,
      autoRecency: autoRecencyField,
      automaticCategory: {
        label: 'Automatic',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ThumbnailGridCategorySelect value={value ?? ''} onChange={onChange} />
        ),
      },
      children: {
        label: 'Grid Items',
        type: 'array',
        arrayFields: {
          type: 'component',
          allowedComponents: ['MostPopularTable', 'RecommendCard'],
          defaultItem: { type: 'MostPopularTable', props: {} },
        },
      },
    },
    defaultProps: { id: 'popular-grid', mode: 'manual', automaticCategory: '', autoMostRead: 'off', children: [], autoStoryIds: [] } as PopularGridProps,
    resolveFields: async (data: any, { fields }: any) => {
      const newFields = { ...fields };

      Object.keys(newFields).forEach((key) => {
        if (key.startsWith('autoTaxonomy_')) {
          delete newFields[key];
        }
      });

      if (data?.props?.mode === 'automatic') {
        delete newFields.automaticCategory;
        delete newFields.children;

        await initializeThumbnailGridTaxonomyOptions();
        const mostReadField = newFields.autoMostRead;
        delete newFields.autoMostRead;
        const taxonomyGroups = getThumbnailGridTaxonomyGroups();
        taxonomyGroups.forEach((group) => {
          const key = `autoTaxonomy_${group.taxonomyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'}`;
          newFields[key] = {
            label: `${group.taxonomyName} (Auto Mode)`,
            type: 'select',
            options: getTaxonomyFieldSelectOptions(group.taxonomyName, group.values),
          };
        });
        if (mostReadField) newFields.autoMostRead = mostReadField;
        if (newFields.autoRecency) newFields.autoRecency = newFields.autoRecency;
        newFields.autoSidebarSpacer = autoSidebarSpacerField;
      } else {
        delete newFields.automaticCategory;
        delete newFields.autoMostRead;
        delete newFields.autoRecency;
        delete newFields.autoSidebarSpacer;
      }

      return newFields;
    },
    resolveData: async (data: any) => {
      if (data?.props?.mode !== 'automatic') {
        return {
          props: {
            ...data.props,
            autoStoryIds: [],
          },
        };
      }

      const normalizeString = (value: unknown): string =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';

      const taxonomyFieldKey = (name: string): string => {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return `autoTaxonomy_${slug || 'unknown'}`;
      };

      const isAllSelection = (value: unknown): boolean => {
        const normalized = normalizeString(value);
        return !normalized || normalized === 'all' || normalized.startsWith('all ');
      };

      const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
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
          addCandidate(story.Section);
        } else if (taxonomyName === 'category') {
          addCandidate(story.taxonomyCategories);
          addCandidate(story.Category);
          addCandidate(story.taxonomyCategory);
          addCandidate(story.category);
        } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
          addCandidate(story.authorName);
          addCandidate(story.author);
          addCandidate(story.byLine);
          addCandidate(story.byline);
          addCandidate(story.Editor);
          addCandidate(story.editorName);
        }

        const rawStory = story as Record<string, unknown>;
        const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
        Object.entries(rawStory).forEach(([key, value]) => {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTaxonomyKey) {
            addCandidate(value);
          }
        });

        return candidateValues.has(selectedValue);
      };

      const getStoryTimestamp = (story: any): number => {
        const rawDate =
          story.proposedFilingDate ||
          story.publishDate ||
          story.publishedAt ||
          story.createdAt ||
          story.updatedAt ||
          '';

        const timestamp = new Date(rawDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      await initializeThumbnailGridTaxonomyOptions();
      const taxonomyGroups = getThumbnailGridTaxonomyGroups();
      let pool = [...getStories()];

      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      if (data.props.automaticCategory) {
        const [taxonomyName, ...rest] = String(data.props.automaticCategory).split('::');
        const taxonomyValue = rest.join('::');
        if (taxonomyValue) {
          pool = pool.filter((story) =>
            storyMatchesTaxonomy(story, taxonomyName, taxonomyValue)
          );
        }
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;
        pool = pool.filter(s => {
          const pubTime = new Date((s as any).publishedAt || (s as any).publishDate || (s as any).proposedFilingDate || (s as any).createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      const sortedPool = pool.sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));
      const selectedStories = await prioritizeMostReadStories(sortedPool, 50, data.props.autoMostRead === 'on', data.props.autoRecency);
      const autoStoryIds = selectedStories
        .map((story) => story.id)
        .filter(Boolean);

      return {
        props: {
          ...data.props,
          autoStoryIds,
        },
      };
    },
    render: ({ id, mode, automaticCategory, autoStoryIds, children, puck }: { id?: string; mode?: 'manual' | 'automatic'; automaticCategory?: string; autoStoryIds?: string[]; children?: any; puck?: any }) => (
      <PopularGridBlock id={id} mode={mode} automaticCategory={automaticCategory} autoStoryIds={autoStoryIds} puck={puck}>
        {children}
      </PopularGridBlock>
    ),
  },
  MultimediaGrid: {
    label: 'Multimedia Grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      mode: {
        label: 'Mode',
        type: 'radio',
        options: [
          { label: 'Off', value: 'manual' },
          { label: 'Automatic', value: 'automatic' },
        ],
      },
      autoMostRead: autoMostReadField,
      autoRecency: autoRecencyField,
      automaticCategory: {
        label: 'Automatic',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ThumbnailGridCategorySelect value={value ?? ''} onChange={onChange} />
        ),
      },
      children: {
        label: 'Grid Items',
        type: 'array',
        arrayFields: {
          type: 'component',
          allowedComponents: ['StoryCard', 'RecommendCard'],
          defaultItem: { type: 'StoryCard', props: {} },
        },
      },
    },
    defaultProps: { id: 'multimedia-grid', mode: 'manual', automaticCategory: '', autoMostRead: 'off', children: [], autoStoryIds: [] } as MultimediaGridProps,
    resolveFields: async (data: any, { fields }: any) => {
      const newFields = { ...fields };

      Object.keys(newFields).forEach((key) => {
        if (key.startsWith('autoTaxonomy_')) {
          delete newFields[key];
        }
      });

      if (data?.props?.mode === 'automatic') {
        delete newFields.automaticCategory;
        delete newFields.children;

        await initializeThumbnailGridTaxonomyOptions();
        const mostReadField = newFields.autoMostRead;
        delete newFields.autoMostRead;
        const taxonomyGroups = getThumbnailGridTaxonomyGroups();
        taxonomyGroups.forEach((group) => {
          const key = `autoTaxonomy_${group.taxonomyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'}`;
          newFields[key] = {
            label: `${group.taxonomyName} (Auto Mode)`,
            type: 'select',
            options: getTaxonomyFieldSelectOptions(group.taxonomyName, group.values),
          };
        });
        if (mostReadField) newFields.autoMostRead = mostReadField;
        if (newFields.autoRecency) newFields.autoRecency = newFields.autoRecency;
        newFields.autoSidebarSpacer = autoSidebarSpacerField;
      } else {
        delete newFields.automaticCategory;
        delete newFields.autoMostRead;
        delete newFields.autoRecency;
        delete newFields.autoSidebarSpacer;
      }

      return newFields;
    },
    resolveData: async (data: any) => {
      if (data?.props?.mode !== 'automatic') {
        return {
          props: {
            ...data.props,
            autoStoryIds: [],
          },
        };
      }

      const normalizeString = (value: unknown): string =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';

      const taxonomyFieldKey = (name: string): string => {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return `autoTaxonomy_${slug || 'unknown'}`;
      };

      const isAllSelection = (value: unknown): boolean => {
        const normalized = normalizeString(value);
        return !normalized || normalized === 'all' || normalized.startsWith('all ');
      };

      const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
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
          addCandidate(story.Section);
        } else if (taxonomyName === 'category') {
          addCandidate(story.taxonomyCategories);
          addCandidate(story.Category);
          addCandidate(story.taxonomyCategory);
          addCandidate(story.category);
        } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
          addCandidate(story.authorName);
          addCandidate(story.author);
          addCandidate(story.byLine);
          addCandidate(story.byline);
          addCandidate(story.Editor);
          addCandidate(story.editorName);
        }

        const rawStory = story as Record<string, unknown>;
        const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
        Object.entries(rawStory).forEach(([key, value]) => {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTaxonomyKey) {
            addCandidate(value);
          }
        });

        return candidateValues.has(selectedValue);
      };

      const getStoryTimestamp = (story: any): number => {
        const rawDate =
          story.proposedFilingDate ||
          story.publishDate ||
          story.publishedAt ||
          story.createdAt ||
          story.updatedAt ||
          '';

        const timestamp = new Date(rawDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      await initializeThumbnailGridTaxonomyOptions();
      const taxonomyGroups = getThumbnailGridTaxonomyGroups();
      let pool = [...getStories()];

      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      if (data.props.automaticCategory) {
        const [taxonomyName, ...rest] = String(data.props.automaticCategory).split('::');
        const taxonomyValue = rest.join('::');
        if (taxonomyValue) {
          pool = pool.filter((story) =>
            storyMatchesTaxonomy(story, taxonomyName, taxonomyValue)
          );
        }
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;
        pool = pool.filter(s => {
          const pubTime = new Date((s as any).publishedAt || (s as any).publishDate || (s as any).proposedFilingDate || (s as any).createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      const sortedPool = pool.sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));
      const selectedStories = await prioritizeMostReadStories(sortedPool, 50, data.props.autoMostRead === 'on', data.props.autoRecency);
      const autoStoryIds = selectedStories
        .map((story) => story.id)
        .filter(Boolean);

      return {
        props: {
          ...data.props,
          autoStoryIds,
        },
      };
    },
    render: ({ id, mode, automaticCategory, autoStoryIds, children, puck }: { id?: string; mode?: 'manual' | 'automatic'; automaticCategory?: string; autoStoryIds?: string[]; children?: any; puck?: any }) => (
      <MultimediaGridBlock id={id} mode={mode} automaticCategory={automaticCategory} autoStoryIds={autoStoryIds} puck={puck}>
        {children}
      </MultimediaGridBlock>
    ),
  },
  AllStoriesGrid: {
    label: 'All Stories Grid',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      mode: {
        label: 'Mode',
        type: 'radio',
        options: [
          { label: 'Off', value: 'manual' },
          { label: 'Automatic', value: 'automatic' },
        ],
      },
      autoMostRead: autoMostReadField,
      autoRecency: autoRecencyField,
      automaticCategory: {
        label: 'Automatic',
        type: 'custom',
        render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
          <ThumbnailGridCategorySelect value={value ?? ''} onChange={onChange} />
        ),
      },
      children: {
        label: 'Grid Items',
        type: 'array',
        arrayFields: {
          type: 'component',
          allowedComponents: ['StoryCard', 'RecommendCard', 'MainCard'],
          defaultItem: { type: 'StoryCard', props: {} },
        },
      },
    },
    defaultProps: { id: 'all-stories-grid', mode: 'manual', automaticCategory: '', autoMostRead: 'off', children: [], autoStoryIds: [] } as AllStoriesGridProps,
    resolveFields: async (data: any, { fields }: any) => {
      const newFields = { ...fields };

      Object.keys(newFields).forEach((key) => {
        if (key.startsWith('autoTaxonomy_')) {
          delete newFields[key];
        }
      });

      if (data?.props?.mode === 'automatic') {
        delete newFields.automaticCategory;
        delete newFields.children;

        await initializeThumbnailGridTaxonomyOptions();
        const mostReadField = newFields.autoMostRead;
        delete newFields.autoMostRead;
        const taxonomyGroups = getThumbnailGridTaxonomyGroups();
        taxonomyGroups.forEach((group) => {
          const key = `autoTaxonomy_${group.taxonomyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'}`;
          newFields[key] = {
            label: `${group.taxonomyName} (Auto Mode)`,
            type: 'select',
            options: getTaxonomyFieldSelectOptions(group.taxonomyName, group.values),
          };
        });
        if (mostReadField) newFields.autoMostRead = mostReadField;
        if (newFields.autoRecency) newFields.autoRecency = newFields.autoRecency;
        newFields.autoSidebarSpacer = autoSidebarSpacerField;
      } else {
        delete newFields.automaticCategory;
        delete newFields.autoMostRead;
        delete newFields.autoRecency;
        delete newFields.autoSidebarSpacer;
      }

      return newFields;
    },
    resolveData: async (data: any) => {
      if (data?.props?.mode !== 'automatic') {
        return {
          props: {
            ...data.props,
            autoStoryIds: [],
          },
        };
      }

      const normalizeString = (value: unknown): string =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';

      const taxonomyFieldKey = (name: string): string => {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return `autoTaxonomy_${slug || 'unknown'}`;
      };

      const isAllSelection = (value: unknown): boolean => {
        const normalized = normalizeString(value);
        return !normalized || normalized === 'all' || normalized.startsWith('all ');
      };

      const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
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
          addCandidate(story.Section);
        } else if (taxonomyName === 'category') {
          addCandidate(story.taxonomyCategories);
          addCandidate(story.Category);
          addCandidate(story.taxonomyCategory);
          addCandidate(story.category);
        } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist' || taxonomyName === 'editor') {
          addCandidate(story.authorName);
          addCandidate(story.author);
          addCandidate(story.byLine);
          addCandidate(story.byline);
          addCandidate(story.Editor);
          addCandidate(story.editorName);
        }

        const rawStory = story as Record<string, unknown>;
        const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase();
        Object.entries(rawStory).forEach(([key, value]) => {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTaxonomyKey) {
            addCandidate(value);
          }
        });

        return candidateValues.has(selectedValue);
      };

      const getStoryTimestamp = (story: any): number => {
        const rawDate =
          story.proposedFilingDate ||
          story.publishDate ||
          story.publishedAt ||
          story.createdAt ||
          story.updatedAt ||
          '';

        const timestamp = new Date(rawDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      await initializeThumbnailGridTaxonomyOptions();
      const taxonomyGroups = getThumbnailGridTaxonomyGroups();
      let pool = [...getStories()];

      taxonomyGroups.forEach((group) => {
        const selectedValue = data.props[taxonomyFieldKey(group.taxonomyName)];
        if (isAllSelection(selectedValue)) return;

        pool = pool.filter((story) =>
          storyMatchesTaxonomy(story, group.taxonomyName, selectedValue)
        );
      });

      if (data.props.automaticCategory) {
        const [taxonomyName, ...rest] = String(data.props.automaticCategory).split('::');
        const taxonomyValue = rest.join('::');
        if (taxonomyValue) {
          pool = pool.filter((story) =>
            storyMatchesTaxonomy(story, taxonomyName, taxonomyValue)
          );
        }
      }

      // Filter by recency
      if (data.props.autoRecency && data.props.autoRecency !== 'all') {
        const now = Date.now();
        let msLimit = 0;
        if (data.props.autoRecency === '24h') msLimit = 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
        else if (data.props.autoRecency === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;
        pool = pool.filter(s => {
          const pubTime = new Date((s as any).publishedAt || (s as any).publishDate || (s as any).proposedFilingDate || (s as any).createdAt || 0).getTime();
          return now - pubTime <= msLimit;
        });
      }

      const sortedPool = pool.sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));
      const selectedStories = await prioritizeMostReadStories(sortedPool, 50, data.props.autoMostRead === 'on', data.props.autoRecency);
      const autoStoryIds = selectedStories
        .map((story) => story.id)
        .filter(Boolean);

      return {
        props: {
          ...data.props,
          autoStoryIds,
        },
      };
    },
    render: (props: AllStoriesGridProps & { puck?: any }) => (
      <AllStoriesGrid {...props} />
    ),
  },
  Heading: {
    label: 'Heading',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor for in-page links' },
      text: { label: 'Heading text', type: 'textarea', placeholder: 'Enter heading text', contentEditable: true, },
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
    defaultProps: { id: 'heading', text: 'Heading', align: 'left', level: '2', size: 'm' } as HeadingProps,
    render: (props: HeadingProps) => <HeadingBlock {...props} />,
  },
  Footer: {
    label: 'Footer',
    fields: {
      id: { label: 'Section ID', type: 'text', placeholder: 'Optional anchor' },
      copyrightText: { label: 'Copyright Text', type: 'text', placeholder: 'Enter copyright text' },
    },
    defaultProps: {
      id: 'footer',
      copyrightText: "© 2026 OpenPress. All rights reserved.",
    } as FooterProps,
    render: (props: FooterProps) => <FooterBlock {...props} />,
  },
  AboutUs: {
    label: 'About Us',
    fields: {
      kicker: { label: 'Kicker', type: 'text' },
      title: { label: 'Title', type: 'textarea' },
      content: { label: 'Body Content', type: 'textarea' },
    },
    defaultProps: {
      kicker: "About OpenPress",
      title: "Independent journalism that is free for everyone to read.",
      content: "OpenPress is a free, open publishing platform for independent journalism.\n\nEvery article is available to everyone, with no paywall and no sign-in. We believe good reporting should be easy to find, easy to read and easy to share.\n\nOur tools are built so that small teams and individual writers can publish with the same care and polish as larger outlets.",
    },
    render: (props: any) => <AboutUs {...props} />,
  },
  SupportUs: {
    label: 'Support Us',
    fields: {
      kicker: { label: 'Kicker', type: 'text' },
      title: { label: 'Title', type: 'textarea' },
      message: { label: 'Message', type: 'textarea' },
      amounts: { label: 'Amounts in rupees (comma separated, up to 6)', type: 'text' },
      buttonText: { label: 'Button text', type: 'text' },
      thankYou: { label: 'Thank-you message', type: 'textarea' },
      note: { label: 'Small print', type: 'textarea' },
    },
    defaultProps: { ...SUPPORT_US_DEFAULTS },
    render: (props: any) => <SupportUs {...props} />,
  },
  PrivacyPolicy: {
    label: 'Privacy Policy',
    fields: {
      title: { label: 'Title', type: 'text' },
      content: { label: 'Body Content (HTML)', type: 'textarea' },
    },
    defaultProps: {
      title: "Privacy Policy",
      content: "",
    },
    render: (props: any) => <PrivacyPolicy {...props} />,
  },
  MediaCouncil: {
    label: 'Editorial Standards',
    fields: {
      title: { label: 'Title', type: 'text' },
      content: { label: 'Body Content (HTML)', type: 'textarea' },
    },
    defaultProps: {
      title: "Editorial Standards",
      content: "",
    },
    render: (props: any) => <MediaCouncil {...props} />,
  },
  ContactUs: {
    label: 'Contact Us',
    fields: {
      receiverEmail: { 
        label: 'Receiver Email (For Power Automate)', 
        type: 'text', 
        placeholder: 'admin@yourdomain.com' 
      },
    },
    defaultProps: {
      receiverEmail: '',
    },
    render: (props: any) => <ContactUs {...props} />,
  },
};

export const registerDynamicBlocks = (placements: ApiPlacement[]) => {
  placements.forEach(placement => {
    const status = (placement.status || '').toLowerCase();
    if (status !== 'active') return;

    const blockKey = `Ad_${placement.name.replace(/\s+/g, '_')}`;

    if (commonBlocks[blockKey]) return; // already registered

    const isSpotlight = placement.type?.toLowerCase().includes('spotlight') ||
      placement.name.toLowerCase().replace(/[\s_-]+/g, '') === 'spotlightad';

    if (isSpotlight) {
      commonBlocks[blockKey] = {
        label: placement.name,
        fields: {
          id: { label: 'Section ID', type: 'text' },
          adId: {
            label: 'Select Spotlight Campaign',
            type: 'select',
            get options() { return getSpotlightAdOptions(); },
          },
          fallbackStoryId: {
            label: 'Fallback Story',
            type: 'custom',
            render: ({ value, onChange }: any) => (
              <FallbackStorySelect value={value ?? ''} onChange={onChange} label="Fallback Story" />
            ),
          },
        },
        resolveFields: (_data: any, { fields, parent }: any) => withoutFallbackStoryOutsideGrid(fields, parent),
        defaultProps: {
          id: 'spotlight-ad',
          adId: 'auto',
          placementName: placement.name,
          fallbackStoryId: '',
          fallbackAllowed: true,
        },
        render: (props: { id?: string; adId?: string; placementName?: string; fallbackStoryId?: string; fallbackAllowed?: boolean }) =>
          <SpotlightAdBlock id={props.id} adId={props.adId} />,
      };
      return;
    }

    commonBlocks[blockKey] = {
        label: placement.name,
        fields: {
          id: { label: 'Section ID', type: 'text' },
          adId: {
            label: 'Select Campaign Ad',
            type: 'select',
            get options() {
              return getAdOptions(placement.name);
            }
          },
          fallbackStoryId: {
            label: 'Fallback Story',
            type: 'custom',
            render: ({ value, onChange }: any) => (
              <FallbackStorySelect value={value ?? ''} onChange={onChange} label="Fallback Story" />
            ),
          },
        },
        resolveFields: (_data: any, { fields, parent }: any) => withoutFallbackStoryOutsideGrid(fields, parent),
        defaultProps: {
          id: `ad-${placement.placementId}`,
          adId: 'auto',
          placementName: placement.name,
          desktopDimensions: placement.desktopDimensions,
          mobileDimensions: placement.mobileDimensions,
          fallbackStoryId: '',
          fallbackAllowed: true,
        },
        render: (props: { id?: string; adId?: string; fallbackStoryId?: string; fallbackAllowed?: boolean; fallbackBlock?: any }) => {
          return <DynamicAdBlock
            id={props.id}
            adId={props.adId}
            placementName={placement.name}
            desktopDimensions={placement.desktopDimensions}
            mobileDimensions={placement.mobileDimensions}
            fallbackBlock={props.fallbackBlock}
          />;
        },
      };
  });
};

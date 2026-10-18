import { VideoCardAuthor } from './VideoCardAuthor';
import { VideoAuthorGrid } from './videoAuthorGrid';
import { AuthorCardHorizontal } from './authorCardHorizontal';
import { VideoCard, type VideoCardProps } from './videoCard';


const videoAuthorGridConfig = {
  label: 'Video Grid',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links',
    },
    className: {
      label: 'Additional CSS Classes',
      type: 'text',
      placeholder: 'Add custom CSS classes (space separated)',
    },
  },
  defaultProps: {
    id: 'video-author-grid',
    className: '',
  },
  render: (props: { id?: string; className?: string; puck?: any }) => (
    <VideoAuthorGrid {...props} />
  ),
};

const videoCardConfig = {
  label: 'Video Card',
  fields: {
    id: {
      label: 'Card ID',
      type: 'text',
      placeholder: 'Optional unique identifier',
    },

    title: {
      label: 'Video Title',
      type: 'text',
      placeholder: 'Enter video title',
    },
    description: {
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter video description',
    },
    views: {
      label: 'View Count',
      type: 'number',
      placeholder: '0',
    },
    likes: {
      label: 'Like Count',
      type: 'number',
      placeholder: '0',
    },
    shares: {
      label: 'Share Count',
      type: 'number',
      placeholder: '0',
    },
  },
  defaultProps: {
    imageUrl: '/story-images/Media.png',
    title: 'Lorem ipsum dolor sit amet adipiscing elit',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.',
    author: 'Author Name',
    views: 8991,
    likes: 8991,
    shares: 100,
  } as VideoCardProps,
  render: (props: VideoCardProps) => <VideoCard {...props} />,
};

const videoCardAuthorConfig = {
  label: 'Author Card',
  fields: {
    author: {
      label: 'Author Name',
      type: 'text',
    },
    description: {
      label: 'Description',
      type: 'textarea',
    },
    imageUrl: {
      label: 'Avatar Image URL',
      type: 'text',
    },
  },
  defaultProps: {
    author: 'Author Name',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.',
    imageUrl: '/author.png',
  },
  render: (props: any) => <VideoCardAuthor {...props} />,
};



const authorCardHorizontalConfig = {
  label: 'video Card second',
  fields: {
    imageUrl: {
      label: 'Image URL',
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
    views: {
      label: 'View Count',
      type: 'number',
    },
    shares: {
      label: 'Share Count',
      type: 'number',
    },
  },
  defaultProps: {
    imageUrl: '/story-images/Media.png',
    title: 'Lorem ipsum dolor sit amet adipiscing elit',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.',
    views: 8991,
    shares: 100,
  },
  render: (props: any) => <AuthorCardHorizontal {...props} />,
};

export default {
  VideoAuthorGrid: videoAuthorGridConfig,
  VideoCardAuthor: videoCardAuthorConfig,
  AuthorCardHorizontal: authorCardHorizontalConfig,VideoCard: videoCardConfig
};

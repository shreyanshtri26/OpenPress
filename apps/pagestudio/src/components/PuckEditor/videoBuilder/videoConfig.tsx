import { VideoCard, type VideoCardProps } from './videoCard';
import { VideoCardHorizontal, type VideoCardHorizontalProps } from './videoCardHorizontal';
import { VideoGrid } from './videoGrid';

const videoCardConfig = {
  label: 'Video Card',
  fields: {
    id: {
      label: 'Card ID',
      type: 'text',
      placeholder: 'Optional unique identifier',
    },
    imageUrl: {
      label: 'Thumbnail URL',
      type: 'text',
      placeholder: '/path/to/thumbnail.jpg',
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
    author: {
      label: 'Author Name',
      type: 'text',
      placeholder: 'Author name',
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
    imageUrl: '/openpress-share.png',
    title: 'Lorem ipsum dolor sit amet adipiscing elit',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.',
    author: 'Author Name',
    views: 8991,
    likes: 8991,
    shares: 100,
  } as VideoCardProps,
  render: (props: VideoCardProps) => <VideoCard {...props} />,
};

const videoGridConfig = {
  label: 'Video Grid',
  fields: {
    id: {
      label: 'Section ID',
      type: 'text',
      placeholder: 'Optional anchor for in-page links'
    },
    className: {
      label: 'CSS Classes',
      type: 'text',
      placeholder: 'Additional CSS classes (optional)'
    },
  },
  defaultProps: {
    id: 'video-grid',
    className: '',
  },
  render: (props: {
    id?: string;
    className?: string;
    puck?: any;
  }) => <VideoGrid {...props} />,
};

const videoCardHorizontalConfig = {
  label: 'Video Card second',
  fields: {
    id: {
      label: 'Card ID',
      type: 'text',
      placeholder: 'Optional unique identifier',
    },
    imageUrl: {
      label: 'Thumbnail URL',
      type: 'text',
      placeholder: '/path/to/thumbnail.jpg',
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
    author: {
      label: 'Author Name',
      type: 'text',
      placeholder: 'Author name',
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
    imageUrl: '/openpress-share.png',
    title: 'Lorem ipsum dolor sit amet adipiscing elit',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.',
    author: 'Author Name',
    views: 8991,
    likes: 8991,
    shares: 100,
  } as VideoCardHorizontalProps,
  render: (props: VideoCardHorizontalProps) => <VideoCardHorizontal {...props} />,
};

export default {
  VideoGrid: videoGridConfig,
  VideoCard: videoCardConfig,
  VideoCardHorizontal: videoCardHorizontalConfig,
};

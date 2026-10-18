import ShowcaseCardLayout from "../blocks/ShowcaseCard";

interface BlogShowcaseCardProps {
  id?: string;
  items?: Array<{
    storyId?: string;
    title?: string;
    category?: string;
  }>;
  className?: string;
}

const BlogShowcaseCard: React.FC<BlogShowcaseCardProps> = ({
  id,
  items = [],
  className = "",
}) => {
  return (
    <div id={id} className={className}>
      <ShowcaseCardLayout items={items} noBorder={true} />
    </div>
  );
};

export default BlogShowcaseCard;

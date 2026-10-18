import { RecommendCard } from "../blocks/RecommendCard";

interface BlogRecomCardProps {
  id?: string;
  storyId?: string;
  className?: string;
}

const BlogRecomCard: React.FC<BlogRecomCardProps> = ({
  id,
  storyId,
  className = "",
}) => {
  return (
    <div id={id} className={className}>
      <RecommendCard storyId={storyId} />
    </div>
  );
};

export default BlogRecomCard;

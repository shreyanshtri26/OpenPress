import { type ElementType } from 'react';

export type HeadingProps = {
  id?: string;
  text?: string;
  align?: 'left' | 'center' | 'right';
  level?: '1' | '2' | '3' | '4' | '5' | '6';
  size?: 'xxxl' | 'xxl' | 'xl' | 'l' | 'm' | 's' | 'xs';
};

export default function blogHeading({
  id,
  text = 'Heading',
  align = 'left',
  level = '2',
  size = 'xl',
}: HeadingProps) {
  const Tag = (`h${level}` as string) as ElementType;

  const sizeClasses = {
    xxxl: 'text-6xl font-extrabold',
    xxl: 'text-5xl font-bold',
    xl: 'text-4xl font-bold',
    l: 'text-3xl font-bold',
    m: 'text-2xl font-bold',
    s: 'text-xl font-semibold',
    xs: 'text-lg font-semibold',
  };

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <section id={id} className="bg-white w-full  pt-2">
      <div className=" w-full ">
        <Tag className={`${sizeClasses[size]} ${alignClass} italic font-libre`}>{text}</Tag>
      </div>
    </section>
  );
}

import { Link as RouterLink } from 'react-router-dom';

const isExternal = (href) => /^https?:\/\//i.test(href);

export default function Link({ href = '#', children, ...rest }) {
  if (isExternal(href) || href.startsWith('#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  );
}

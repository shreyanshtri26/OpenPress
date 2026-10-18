import { useEffect } from 'react';
import { renderLoginPageHtml } from '../../helpers/renderers/renderLoginPage';

export const LoginPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: renderLoginPageHtml(),
      }}
    />
  );
};

import { useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * The router's `query`: the URL's query string (?token=…&email=…) together with the path parameters (/:storyId).
 * It used to be only the path parameters, so links such as the password-reset email (/auth/forgot-password/?token=…)
 * never exposed their token to the page.
 */
export function buildQuery(search, params) {
  return { ...Object.fromEntries(new URLSearchParams(search)), ...params };
}

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    push: (to) => navigate(to),
    replace: (to) => navigate(to, { replace: true }),
    pathname: location.pathname,
    asPath: `${location.pathname}${location.search}`,
    query: buildQuery(location.search, params),
    // react-router has the URL on the first render; Next.js-style callers wait on this flag.
    isReady: true,
  };
}

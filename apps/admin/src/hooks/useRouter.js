import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    push: (to) => navigate(to),
    replace: (to) => navigate(to, { replace: true }),
    pathname: location.pathname,
    asPath: `${location.pathname}${location.search}`,
    query: params,
  };
}

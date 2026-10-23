
import { useContext, useState, useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { UserContext } from '../context/UserContext';
import apiFetch from '../utils/api';
import Link from '@/components/common/Link';
import styles from './Login.module.css';
import openpressLogo from '../assets/openpress-logo.png';
import env from '@/utils/env';
import { setAuthCookie } from '@/utils/cookieUtils';


function ReaderLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, user, loading } = useContext(UserContext);
  const router = useRouter();


  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  const API = env.apiUrl;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError('');
    setPasswordError('');


    try {
      const result = await apiFetch(
        `${env.backendApi}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );

      const res = await result.json();


      if (!res?.user) {
        setPasswordError('Invalid username or password');
        return;
      }


      localStorage.setItem('email', res.user.email);
      login(
        res.user.role,
        res.token,
        res.user.personalizeUserId,
        res.user.fullName,
        res.user.email,
      );

      // Set shared cookie for Page Studio
      setAuthCookie(res.token);

      if (rememberMe) {
        localStorage.setItem('authToken', res.token);
        localStorage.setItem('userRole', res.user.role);
        localStorage.setItem('userId', res.user.personalizeUserId);
      }

      // Check if user was redirected due to timeout
      const lastRoute = localStorage.getItem('lastRoute');

      if (lastRoute && lastRoute !== '/login') {
        localStorage.removeItem('lastRoute');
        router.push(lastRoute);
      } else {
        // Default routing based on role
        const role = res.user.role;

        if (role) {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      }


    } catch (err) {
      console.error('Login error:', err);
      setPasswordError(
        err.message ||
        'Login failed. Please check your credentials and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };


  if (loading || user) {
    return null;
  }


  return (
    <div className={styles.loginPageContainer}>


      <div className={styles.loginTitleContainer}>
        <img src={openpressLogo} alt="OpenPress" className={styles.loginLogo} />
      </div>

      <form onSubmit={handleSubmit} className={styles.loginFormContainer}>
        <div className={styles.loginFormInputsContainer}>
          <label className={styles.labelTxt}>Email*</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className={styles.loginFormInput}
          />
          {emailError && <p style={{ color: 'red', fontSize: '14px', marginTop: '2px', marginBottom: '8px' }}>{emailError}</p>}
        </div>
        <div className={styles.loginFormInputsContainer}>
          <label className={styles.labelTxt}>Password*</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={styles.loginFormInput}
          />
          {passwordError && <p style={{ color: 'red', fontSize: '14px', marginTop: '2px', marginBottom: '8px' }}>{passwordError}</p>}
        </div>
        <button type="submit" disabled={isLoading} className={styles.loginBtn}>
          {isLoading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className={styles.bttmContainer}>
        <Link href="/auth/forgot-password" className={styles.forgotPassTxt}>
          Forgot your password?
        </Link>
      </div>
      <div className={styles.copyrightContainer}>
        <p className={styles.copyrightTxt}>© 2025 OpenPress</p>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <ReaderLogin />
  );
}

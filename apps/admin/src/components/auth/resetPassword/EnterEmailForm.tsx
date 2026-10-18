
import { useState, FormEvent, ReactNode } from 'react';
import styles from '../../../pages/Login.module.css';
import openpressLogo from '../../../assets/openpress-logo.png';
import CustomButton from '../../../components/common/CustomButton';

interface EnterEmailFormProps {
  onSubmit: (email: string) => Promise<void>;
}

export function EnterEmailForm({ onSubmit }: EnterEmailFormProps): ReactNode {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onSubmit(email);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginTitleContainer}>
        <img src={openpressLogo} alt="OpenPress" className={styles.loginLogo} />
      </div>

      <form onSubmit={handleSubmit} className={styles.loginFormContainer}>
        <h2 className='mx-auto text-xl mb-4'>
          Forgot your password?
        </h2>

        <div className={styles.loginFormInputsContainer}>
          <label className={styles.labelTxt}>Email*</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.loginFormInput}
            placeholder="Enter your email"
          />
          <p className='text-gray-500 mb-6 text-sm'>
            Enter the email associated with your account and we'll send instructions to reset your password.
          </p>
          {error && (
            <p className='text-red-500 text-sm mt-0.5 mb-2'>
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          onClick={() => { }}
          className={styles.loginBtn}
        >
          {isLoading ? 'Sending...' : 'Send instructions'}
        </button>
      </form>

      <div className={styles.copyrightContainer}>
        <p className={styles.copyrightTxt}>© 2025 OpenPress</p>
      </div>
    </div>
  );
}

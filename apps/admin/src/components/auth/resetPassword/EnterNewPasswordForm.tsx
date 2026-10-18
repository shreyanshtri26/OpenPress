
import { useState, useEffect, FormEvent, ReactNode, Dispatch, SetStateAction } from 'react';
import { useRouter } from '@/hooks/useRouter';
import styles from '../../../pages/Login.module.css';
import openpressLogo from '../../../assets/openpress-logo.png';
import CustomButton from '../../../components/common/CustomButton'; // Adjust path as needed

interface EnterNewPasswordFormProps {
  email: string;
  resetToken: string;
  setResetToken: Dispatch<SetStateAction<string>>;
  onSubmit: (newPassword: string) => Promise<void>;
}

export function EnterNewPasswordForm({ 
  email, 
  resetToken,
  setResetToken,
  onSubmit 
}: EnterNewPasswordFormProps): ReactNode {
  const router = useRouter();
  const { token } = router.query as { token?: string };
  
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (router.isReady && !token) {
      setError('Invalid reset link. Please request a new one.');
    } else if (router.isReady && token) {
      setResetToken(token);
    }
  }, [router.isReady, token, setResetToken]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(newPassword);
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
        <h2 className='text-2xl mb-4'>
          Create new password
        </h2>

        <p className='text-gray-500 mb-6 text-sm'>
          Enter your new password below.
        </p>

        <div className={styles.loginFormInputsContainer}>
          <label className={styles.labelTxt}>New Password*</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className={styles.loginFormInput}
            placeholder="Enter new password"
          />
        </div>

        <div className={styles.loginFormInputsContainer}>
          <label className={styles.labelTxt}>Confirm Password*</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.loginFormInput}
            placeholder="Confirm new password"
          />
          {error && (
            <p className='text-red-500 text-sm mt-0.5 mb-2'>
              {error}
            </p>
          )}
        </div>

        <CustomButton
          type="submit"
          disabled={isLoading || !token}
          variant="black"
          className="w-full"
          onClick={() => {}}
        >
          {isLoading ? 'Updating...' : 'Update password'}
        </CustomButton>
      </form>

      <div className={styles.copyrightContainer}>
        <p className={styles.copyrightTxt}>© 2025 OpenPress</p>
      </div>
    </div>
  );
}

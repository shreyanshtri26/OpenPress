import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { EnterEmailForm } from './resetPassword/EnterEmailForm';
import { CheckEmailMessage } from './resetPassword/CheckEmailMessage';
import { EnterNewPasswordForm } from './resetPassword/EnterNewPasswordForm';
import { SuccessMessage } from './resetPassword/SuccessMessage';
import env from '@/utils/env';
import apiFetch from '../../utils/api';

interface ApiResponse {
  message?: string;
  error?: string;
}

export default function ResetPasswordFlow(): ReactNode {
  const router = useRouter();
  const { token, email: urlEmail } = router.query as { token?: string; email?: string };

  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');

  // ✅ Check if user clicked email link - jump to Step 3
  useEffect(() => {
    if (token) {
      setStep(3);
      setResetToken(token);
      if (urlEmail) {
        setEmail(decodeURIComponent(urlEmail));
      }
    }
  }, [token, urlEmail]);

  const handleEmailSubmit = async (emailValue: string): Promise<void> => {
    try {
      const response = await apiFetch(
        `${env.backendApi}/forgotPassword`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailValue }),
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link');
      }

      setEmail(emailValue);
      setStep(2);
    } catch (error) {
      throw error;
    }
  };

  const handlePasswordReset = async (newPassword: string): Promise<void> => {
    try {
      const response = await apiFetch(
        `${env.backendApi}/resetPassword`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            resetToken,
            newPassword,
          }),
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setStep(4);
    } catch (error) {
      throw error;
    }
  };

  if (step === 1) {
    return <EnterEmailForm onSubmit={handleEmailSubmit} />;
  }

  if (step === 2) {
    return <CheckEmailMessage email={email} />;
  }

  if (step === 3) {
    return (
      <EnterNewPasswordForm
        email={email}
        resetToken={resetToken}
        setResetToken={setResetToken}
        onSubmit={handlePasswordReset}
      />
    );
  }

  if (step === 4) {
    return <SuccessMessage />;
  }

  return null;
}

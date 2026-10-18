
import { useRouter } from '@/hooks/useRouter';
import openpressLogo from '../../../assets/openpress-logo.png';
import { Mail } from 'lucide-react';
import { ReactNode } from 'react';
import CustomButton from '../../../components/common/CustomButton';

interface CheckEmailMessageProps {
  email: string;
}

export function CheckEmailMessage({ email }: CheckEmailMessageProps): ReactNode {
  const router = useRouter();

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center p-28">
        <img src={openpressLogo} alt="OpenPress" className="w-64 max-w-[80%] h-auto mx-auto mb-16" />

        <div className="flex flex-col items-center max-w-md">
          {/* Mail icon in square box */}
          <div className="w-18 h-16 flex items-center justify-center">
            <img
              src="/images/mail.svg"
              alt="Edit"
              className="h-[3.5rem]"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold mb-2 text-black">Check your email</h2>

          {/* Horizontal divider - light gray */}
          <div className="w-full border-t border-gray-900 mb-2"></div>

          {/* Description text */}
          <p className="text-center text-gray-500 text-sm leading-[1.25rem]">
            We've sent a password reset link to your email address!<br />
            Check the spam folder if you can't find it in the inbox
          </p>

          {/* Custom button */}
          <CustomButton
            onClick={handleBackToLogin}
            variant="black"
            className="mt-8"
          >
            Back to Login
          </CustomButton>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-8 text-center text-sm text-gray-600">
        © 2025 OpenPress
      </footer>
    </div>
  );
}

import { useRouter } from '@/hooks/useRouter';
import { Mail } from 'lucide-react';
import { ReactNode } from 'react';
import styles from '../../../pages/Login.module.css';
import openpressLogo from '../../../assets/openpress-logo.png';
import CustomButton from '../../../components/common/CustomButton';

export function SuccessMessage(): ReactNode {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginTitleContainer}>
        <img src={openpressLogo} alt="OpenPress" className={styles.loginLogo} />
      </div>

      <div className={styles.loginFormContainer}>
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="w-16 h-16   flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-gray-800" strokeWidth={1.5} />

          </div>

          {/* Heading */}
          <h2 className='text-2xl font-semibold mb-4 text-center'>
            Password was reset!
          </h2>

          {/* Divider */}
          <div className="w-full border-t border-gray-300 mb-4"></div>

          {/* Description */}
          <p className='text-center text-gray-600 mb-8'>
            You can login with your new credentials now
          </p>

          {/* Button */}
          <CustomButton
            type="button"
            variant="black"
            className="w-full"
            onClick={handleGoToLogin}
          >
            Go to Login
          </CustomButton>
        </div>
      </div>

      <div className={styles.copyrightContainer}>
        <p className={styles.copyrightTxt}>© 2025 OpenPress</p>
      </div>
    </div>
  );
}

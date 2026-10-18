import PropTypes from 'prop-types';
import Button from '@/components/ui/dx/button';
import { AlertTriangle } from 'lucide-react';

const ErrorState = ({ message = 'An unexpected error occurred.', onRetry }) => (
  <div className="flex h-full w-full items-center justify-center text-sm text-gray-600 font-sans">
    <div className="flex flex-col items-center">
      <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading assets</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      <Button text="Retry" type="default" stylingMode="contained" onClick={onRetry} />
    </div>
  </div>
);

ErrorState.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func,
};

export default ErrorState;

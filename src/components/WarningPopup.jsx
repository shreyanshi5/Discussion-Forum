import { useEffect } from 'react';

function WarningPopup({ message, type = 'warning', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    if (type === 'error') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`p-4 rounded-lg shadow-lg ${
        type === 'warning' 
          ? 'bg-yellow-50 border-l-4 border-yellow-400' 
          : 'bg-red-50 border-l-4 border-red-400'
      } flex items-start space-x-4 max-w-md`}>
        <div className={`flex-shrink-0 ${
          type === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            type === 'warning' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${
            type === 'warning' ? 'text-yellow-400 hover:text-yellow-500' : 'text-red-400 hover:text-red-500'
          } focus:outline-none`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default WarningPopup; 
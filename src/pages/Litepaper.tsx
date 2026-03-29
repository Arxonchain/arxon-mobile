import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Litepaper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.open('https://arxon.io/litepaper', '_blank');
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">Opening Arxon Litepaper 2026...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to arxon.io</p>
      </div>
    </div>
  );
};

export default Litepaper;
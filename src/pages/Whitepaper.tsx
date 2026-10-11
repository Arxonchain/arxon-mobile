import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openWhitepaper } from '@/lib/whitepaper';

const Whitepaper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    openWhitepaper();
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">Opening Arxon Whitepaper...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to arxon.io/whitepaper</p>
      </div>
    </div>
  );
};

export default Whitepaper;

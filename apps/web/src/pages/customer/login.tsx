import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CustomerLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/customer/portal?auth=1', { replace: true });
  }, [navigate]);

  return null;
}


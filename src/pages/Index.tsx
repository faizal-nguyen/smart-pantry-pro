// PRP-238 PR2 — cette page est servie sous `AuthenticatedLayout`, donc
// l'auth est deja garantie. On redirige directement vers `/insights`
// sans recheck de session. Le visual loader s'affiche brievement
// pendant la redirection cote client.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/insights', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-12 h-12 bg-primary rounded-full"></div>
      </div>
    </div>
  );
};

export default Index;

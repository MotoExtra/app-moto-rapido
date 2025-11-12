import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para onboarding - depois pode verificar se usuário já está logado
    navigate("/onboarding");
  }, [navigate]);

  return null;
};

export default Index;

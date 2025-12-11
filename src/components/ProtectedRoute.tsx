import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserType: "motoboy" | "restaurant";
}

const ProtectedRoute = ({ children, allowedUserType }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserType = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in, redirect to appropriate login
        navigate(allowedUserType === "restaurant" ? "/login/restaurante" : "/login");
        return;
      }

      const userId = session.user.id;

      // Check if user is a restaurant
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      // Check if user is a motoboy
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      const isRestaurant = !!restaurant;
      const isMotoboy = !!profile && !restaurant;

      if (allowedUserType === "restaurant") {
        if (isRestaurant) {
          setIsAuthorized(true);
        } else if (isMotoboy) {
          // Motoboy trying to access restaurant area
          navigate("/home");
        } else {
          navigate("/login/restaurante");
        }
      } else {
        // allowedUserType === "motoboy"
        if (isMotoboy) {
          setIsAuthorized(true);
        } else if (isRestaurant) {
          // Restaurant trying to access motoboy area
          navigate("/restaurante/home");
        } else {
          navigate("/login");
        }
      }
    };

    checkUserType();
  }, [allowedUserType, navigate]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

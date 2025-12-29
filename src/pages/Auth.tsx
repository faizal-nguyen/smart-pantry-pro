import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true });
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        let message = error.message;

        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          message = "Veuillez vérifier votre email et cliquer sur le lien de confirmation.";
        } else if (error.message.includes('User already registered')) {
          message = "Un compte existe déjà avec cet email.";
        } else if (error.message.includes('Invalid email')) {
          message = "Format d'email invalide.";
        } else if (error.message.includes('Password should be at least')) {
          message = "Le mot de passe doit contenir au moins 6 caractères.";
        }

        setErrorMessage(message);
      } else {
        setEmail("");
        setPassword("");
        setSuccessMessage("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
      }
    } catch (error) {
      setErrorMessage("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        let message = error.message;

        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          message = "Email ou mot de passe incorrect.";
        } else if (error.message.includes('Email not confirmed')) {
          message = "Veuillez d'abord confirmer votre email.";
        } else if (error.message.includes('Too many requests')) {
          message = "Trop de tentatives de connexion. Réessayez plus tard.";
        }

        setErrorMessage(message);
      } else {
        // Navigate immediately after successful login
        navigate('/', { replace: true });
      }
    } catch (error) {
      setErrorMessage("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-lg border shadow-lg">
        <div className="p-6 text-center border-b">
          <h1 className="text-2xl font-bold text-primary">Smart Grocery</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Gérez votre inventaire et vos courses intelligemment
          </p>
        </div>
        
        <div className="p-6">
          {/* Toggle buttons */}
          <div className="flex rounded-lg border p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !isSignUp 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isSignUp 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg"
            >
              {successMessage}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 caractères
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              {loading 
                ? (isSignUp ? "Inscription..." : "Connexion...") 
                : (isSignUp ? "S'inscrire" : "Se connecter")
              }
            </button>
          </form>
          
          <div className="mt-4 text-center text-xs text-muted-foreground">
            En vous inscrivant, vous acceptez nos conditions d'utilisation
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
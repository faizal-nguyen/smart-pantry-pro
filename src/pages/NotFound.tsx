import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">Page introuvable</h2>
        <p className="text-muted-foreground">
          Cette page n'existe pas ou n'est plus accessible.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild>
            <Link to="/kitchen/recipes">Retour aux recettes</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/assistant">Ouvrir l'assistant</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppLayout>
      <main className="flex-1 flex items-center justify-center bg-background px-4 md:px-8 py-12">
        <div className="flex flex-col items-center text-center max-w-md">
          <p className="text-overline text-muted-foreground mb-3">Error 404</p>
          <h1 className="text-heading-md text-foreground mb-1">Page not found</h1>
          <p className="text-body-sm text-muted-foreground mb-6">
            Oops! Page not found. The link may be broken or the page may have been moved.
          </p>
          <Button asChild variant="primary" size="md">
            <Link to="/">
              <Home strokeWidth={1.5} aria-hidden="true" />
              Return to home
            </Link>
          </Button>
        </div>
      </main>
    </AppLayout>
  );
};

export default NotFound;

import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ImageOff } from "lucide-react";
import { mockImage } from "@/data/mock";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/home"));

  return (
    <AppLayout>
      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center bg-background px-4 md:px-8 py-12">
        <div className="flex flex-col items-center text-center max-w-md">
          {/* Fanned frames with the missing one in the middle */}
          <div className="relative mb-8 h-36 w-64" aria-hidden="true">
            <img
              src={mockImage("portrait-lilac")}
              alt=""
              className="absolute left-2 top-5 size-28 rounded-lg object-cover -rotate-[8deg]"
            />
            <img
              src={mockImage("product-mint")}
              alt=""
              className="absolute right-2 top-5 size-28 rounded-lg object-cover rotate-[8deg]"
            />
            <div className="dropzone absolute left-1/2 top-0 flex size-32 -translate-x-1/2 flex-col items-center justify-center gap-2 rounded-lg border-border-strong bg-card hover:border-border-strong">
              <ImageOff className="size-6 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-overline text-muted-foreground">Not found</span>
            </div>
          </div>

          <p className="text-overline text-muted-foreground mb-2">Error 404</p>
          <h1 className="text-heading-lg text-foreground mb-2">This page doesn’t exist</h1>
          <p className="text-body-sm text-muted-foreground mb-4">
            The link may be broken, or the page may have moved. Your packs and library are safe.
          </p>
          <code className="meta-chip text-code mb-8 max-w-full overflow-hidden text-ellipsis">{location.pathname}</code>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
              Go back
            </Button>
            <Button asChild variant="primary">
              <Link to="/home">
                <Home strokeWidth={1.5} aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default NotFound;
